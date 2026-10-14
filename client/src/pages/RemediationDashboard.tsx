/**
 * RemediationDashboard.tsx  — Segment 2 complete
 *
 * Proactive Remediation & Hardening Panel — fully wired to backend.
 *
 * Wiring points:
 *   1. Consent switch → PUT /api/auth/deception-targets/<id>/
 *      (allow_automated_remediation_analysis, allow_schema_mirroring)
 *
 *   2. Log file upload + "Run Analysis" → POST /api/auth/deception-targets/<id>/run-remediation/
 *      The file is sent as multipart/form-data; the backend fires the
 *      remediation_engine asynchronously and returns 202.  The UI
 *      animates the pipeline stages independently.
 *
 *   3. Blueprint list → GET /api/auth/deception-targets/<id>/blueprints/
 *      Polls every 8 s while an analysis is running so the new blueprint
 *      appears automatically when ready.
 *
 *   4. Blueprint status updates → PUT /api/auth/blueprints/<id>/
 *      Accept / Reject / Applied buttons write back to the DB.
 *
 * Pipeline animation:
 *   Stages advance on a realistic timer while the backend async job runs:
 *     Log Parsing → Posture Analysis → AI Patch Generation → Blueprint Ready
 *   On completion / error, the stages settle into final states and the
 *   blueprint list refreshes.
 *
 * Syntax highlighting:
 *   No extra library needed — the patch code is monospace Python/Django,
 *   rendered in a scrollable <pre> with hand-rolled token colouring using
 *   inline spans produced by a lightweight highlighter that covers the
 *   patterns that actually appear in AI-generated Django snippets.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button }      from "@/components/ui/button";
import { Switch }      from "@/components/ui/switch";
import { api }         from "@/lib/api";
import { toast }       from "sonner";
import {
  ShieldCheck, AlertTriangle, Upload, FileCode2, Activity,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  Loader2, Brain, ListChecks, RefreshCw, FileWarning,
  Hammer, Eye, Badge,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeceptionTarget {
  id:                                   number;
  site:                                 string;
  site_domain:                          string;
  allow_automated_remediation_analysis: boolean;
  allow_schema_mirroring:               boolean;
  status:                               string;
  last_analysis:                        string | null;
  blueprint_count:                      number;
}

interface Blueprint {
  id:               string;
  target:           number;
  site_domain:      string;
  triggered_by:     string[];
  weakness_summary: string;
  patch_code:       string;
  model_used:       string;
  groq_tokens_used: number;
  status:           "pending_review" | "accepted" | "rejected" | "applied";
  operator_notes:   string;
  created_at:       string;
}

type StageState = "waiting" | "running" | "done" | "error";

interface PipelineStage {
  id:     string;
  label:  string;
  detail: string;
  state:  StageState;
}

// ─── Lightweight Python/Django syntax highlighter ─────────────────────────────
//
// Produces an array of { text, cls } spans that the renderer maps to
// <span> elements.  Only colours the patterns that commonly appear in
// AI-generated Django patch snippets — keywords, decorators, strings,
// comments, Django/Python builtins, and numbers.

interface TokenSpan { text: string; cls: string; }

const KEYWORDS  = /\b(def|class|return|import|from|if|else|elif|for|while|try|except|with|as|pass|raise|and|or|not|in|is|lambda|None|True|False|async|await|yield)\b/g;
const DECORATORS = /(@\w+)/g;
const STRINGS    = /("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\n]*"|'[^'\n]*')/g;
const COMMENTS   = /(#[^\n]*)/g;
const NUMBERS    = /\b(\d+)\b/g;
const BUILTINS   = /\b(str|int|float|bool|list|dict|tuple|set|len|range|print|type|isinstance|getattr|setattr|hasattr|super|property|staticmethod|classmethod)\b/g;
const DJANGO_SYMBOLS = /\b(models|serializers|views|settings|request|response|queryset|pk|id|CharField|IntegerField|BooleanField|DateTimeField|ForeignKey|CASCADE|objects|filter|get|create|save|update|delete|all|first|exclude|annotate|values|Response|status|api_view|permission_classes|IsAuthenticated|IsAdminUser|require_http_methods|JsonResponse|HttpResponse|render|redirect)\b/g;

function highlightPython(code: string): TokenSpan[] {
  const spans: TokenSpan[] = [];
  let remaining = code;

  // Very simple one-pass tokeniser — works by finding the earliest match
  // among all patterns and emitting plain text up to that point.
  const patterns: Array<{ re: RegExp; cls: string }> = [
    { re: COMMENTS,      cls: "text-muted-foreground/60 italic" },
    { re: STRINGS,       cls: "text-emerald-400" },
    { re: DECORATORS,    cls: "text-amber-400" },
    { re: KEYWORDS,      cls: "text-primary" },
    { re: DJANGO_SYMBOLS, cls: "text-sky-400" },
    { re: BUILTINS,      cls: "text-violet-400" },
    { re: NUMBERS,       cls: "text-orange-400" },
  ];

  while (remaining.length > 0) {
    let earliest = -1;
    let earliestMatch: RegExpExecArray | null = null;
    let earliestCls = "";

    for (const { re, cls } of patterns) {
      re.lastIndex = 0;
      const m = re.exec(remaining);
      if (m && (earliest === -1 || m.index < earliest)) {
        earliest      = m.index;
        earliestMatch = m;
        earliestCls   = cls;
      }
    }

    if (earliestMatch === null || earliest === -1) {
      spans.push({ text: remaining, cls: "text-foreground/80" });
      break;
    }

    if (earliest > 0) {
      spans.push({ text: remaining.slice(0, earliest), cls: "text-foreground/80" });
    }
    spans.push({ text: earliestMatch[0], cls: earliestCls });
    remaining = remaining.slice(earliest + earliestMatch[0].length);
  }

  return spans;
}

// ─── Pipeline stage config ────────────────────────────────────────────────────

const INITIAL_STAGES: PipelineStage[] = [
  {
    id:     "parse",
    label:  "Log Parsing & Normalisation",
    detail: "Collecting activity logs, parsing external log files, normalising entries",
    state:  "waiting",
  },
  {
    id:     "posture",
    label:  "Posture & Signature Analysis",
    detail: "Identifying attack techniques, cross-referencing CVE patterns",
    state:  "waiting",
  },
  {
    id:     "ai",
    label:  "AI Patch Generation  (llama3-70b-8192)",
    detail: "Generating Django/Python remediation code snippets for each gap",
    state:  "waiting",
  },
  {
    id:     "blueprint",
    label:  "Blueprint Ready",
    detail: "Saving StrategicDefenseBlueprint — pending your review",
    state:  "waiting",
  },
];

// Stage durations (ms) — realistic for a Groq 70B call on a 200-row log set
const STAGE_DURATIONS = [2200, 3500, 8000, 1200];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PipelineStageRow({ stage }: { stage: PipelineStage }) {
  const cfg = {
    waiting:  { icon: <Clock size={14} />,                            ring: "border-border",            text: "text-muted-foreground/60" },
    running:  { icon: <Loader2 size={14} className="animate-spin" />, ring: "border-primary",           text: "text-primary" },
    done:     { icon: <CheckCircle2 size={14} />,                     ring: "border-emerald-500",       text: "text-emerald-400" },
    error:    { icon: <XCircle size={14} />,                          ring: "border-destructive",       text: "text-destructive" },
  }[stage.state];

  return (
    <div className={`flex items-start gap-3 p-3 border-l-2 transition-colors ${
      stage.state === "running" ? "border-primary bg-primary/5" :
      stage.state === "done"    ? "border-emerald-500 bg-emerald-500/5" :
      stage.state === "error"   ? "border-destructive bg-destructive/5" :
                                  "border-border"
    }`}>
      <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.ring} ${cfg.text}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${cfg.text}`}>{stage.label}</p>
        {(stage.state === "running" || stage.state === "done") && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{stage.detail}</p>
        )}
      </div>
      {stage.state === "done" && (
        <span className="text-[9px] font-mono text-emerald-400 flex-shrink-0 mt-1">✓</span>
      )}
    </div>
  );
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending_review: { label: "Pending Review", cls: "border-amber-500/50 text-amber-400 bg-amber-500/8" },
  accepted:       { label: "Accepted",       cls: "border-emerald-500/50 text-emerald-400 bg-emerald-500/8" },
  rejected:       { label: "Rejected",       cls: "border-red-500/50 text-red-400 bg-red-500/8" },
  applied:        { label: "Applied",        cls: "border-primary/50 text-primary bg-primary/8" },
};

function BlueprintCard({ bp, onStatusChange }: {
  bp: Blueprint;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded,    setExpanded]    = useState(false);
  const [highlighted, setHighlighted] = useState<TokenSpan[] | null>(null);
  const [notes,       setNotes]       = useState(bp.operator_notes ?? "");
  const statusCfg = STATUS_CFG[bp.status] ?? STATUS_CFG.pending_review;

  // Lazy-highlight on expand
  useEffect(() => {
    if (expanded && highlighted === null) {
      setHighlighted(highlightPython(bp.patch_code));
    }
  }, [expanded, highlighted, bp.patch_code]);

  return (
    <div className="border border-border transition-colors">
      {/* ── Card header ── */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/20 select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <FileCode2 size={15} className="text-primary mt-0.5 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {/* ID + status + domain */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-mono font-bold text-foreground">{bp.id}</span>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">{bp.site_domain}</span>
          </div>

          {/* Summary */}
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {bp.weakness_summary}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground/60">
              {new Date(bp.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">{bp.model_used}</span>
            {/* Attack signatures that triggered this */}
            {bp.triggered_by?.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {bp.triggered_by.slice(0, 4).map(t => (
                  <span key={t}
                    className="text-[9px] font-mono px-1.5 py-0 bg-red-500/10 text-red-400 border border-red-500/20">
                    {t}
                  </span>
                ))}
                {bp.triggered_by.length > 4 && (
                  <span className="text-[9px] text-muted-foreground">+{bp.triggered_by.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {expanded
          ? <ChevronUp size={13} className="text-muted-foreground/50 flex-shrink-0 mt-1" />
          : <ChevronDown size={13} className="text-muted-foreground/50 flex-shrink-0 mt-1" />}
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="border-t border-border">

          {/* Posture analysis summary */}
          <div className="p-4 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Posture Analysis
            </p>
            <p className="text-[11px] leading-relaxed text-foreground/80">{bp.weakness_summary}</p>
          </div>

          {/* Syntax-highlighted patch code */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Defensive Patch Code
                <span className="ml-2 font-normal normal-case text-muted-foreground/50">
                  — review, do not auto-apply
                </span>
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(bp.patch_code).then(() => toast.success("Copied."))}
                className="text-[10px] font-mono text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                copy
              </button>
            </div>

            <div className="bg-black/50 border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-black/30">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
                <span className="text-[10px] font-mono text-muted-foreground/40 ml-1">patch.py</span>
              </div>
              <pre
                className="text-[11px] font-mono leading-[1.7] p-4 overflow-x-auto overflow-y-auto max-h-96 whitespace-pre"
                style={{ scrollbarWidth: "thin" }}
              >
                {highlighted
                  ? highlighted.map((span, i) => (
                      <span key={i} className={span.cls}>{span.text}</span>
                    ))
                  : <span className="text-foreground/80">{bp.patch_code}</span>}
              </pre>
            </div>
          </div>

          {/* Operator notes */}
          <div className="p-4 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Operator Notes
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== bp.operator_notes) {
                  api.authFetch(`/api/auth/blueprints/${bp.id}/`, {
                    method:  "PUT",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ operator_notes: notes }),
                  }).catch(() => toast.error("Failed to save notes."));
                }
              }}
              placeholder="Add review notes…"
              rows={3}
              className="w-full text-xs font-mono bg-muted/20 border border-border p-2 resize-none focus:outline-none focus:border-primary/50 text-foreground/80 placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Action buttons */}
          <div className="p-4 flex items-center gap-3 flex-wrap bg-muted/10">
            {bp.status === "pending_review" && (
              <>
                <Button
                  onClick={() => onStatusChange(bp.id, "accepted")}
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 size={11} /> Accept Blueprint
                </Button>
                <Button
                  onClick={() => onStatusChange(bp.id, "rejected")}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 border-destructive/60 text-destructive hover:bg-destructive/10"
                >
                  <XCircle size={11} /> Reject
                </Button>
              </>
            )}
            {bp.status === "accepted" && (
              <Button
                onClick={() => onStatusChange(bp.id, "applied")}
                size="sm"
                className="h-7 text-xs gap-1.5"
              >
                <Hammer size={11} /> Mark as Applied
              </Button>
            )}
            {(bp.status === "rejected" || bp.status === "applied") && (
              <Button
                onClick={() => onStatusChange(bp.id, "pending_review")}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-border text-muted-foreground"
              >
                <RefreshCw size={11} /> Reopen
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RemediationDashboard() {
  const [targets,         setTargets]         = useState<DeceptionTarget[]>([]);
  const [selectedTarget,  setSelectedTarget]  = useState<DeceptionTarget | null>(null);
  const [blueprints,      setBlueprints]      = useState<Blueprint[]>([]);
  const [stages,          setStages]          = useState<PipelineStage[]>(INITIAL_STAGES);
  const [running,         setRunning]         = useState(false);
  const [loadingTargets,  setLoadingTargets]  = useState(true);
  const [loadingBps,      setLoadingBps]      = useState(false);
  const [dragOver,        setDragOver]        = useState(false);
  const [uploadedFile,    setUploadedFile]    = useState<File | null>(null);
  const [bpFilter,        setBpFilter]        = useState<string>("all");

  const fileRef      = useRef<HTMLInputElement>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageTimers  = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Load targets ────────────────────────────────────────────────────

  useEffect(() => {
    loadTargets();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      stageTimers.current.forEach(clearTimeout);
    };
  }, []);

  async function loadTargets() {
    setLoadingTargets(true);
    try {
      const resp = await api.authFetch("/api/auth/deception-targets/");
      const data: DeceptionTarget[] = await resp.json();
      setTargets(data);
      if (data.length > 0) {
        const first = data[0];
        setSelectedTarget(first);
        await loadBlueprints(first.id);
      }
    } catch {
      toast.error("Failed to load deception targets.");
    } finally {
      setLoadingTargets(false);
    }
  }

  async function loadBlueprints(targetId: number) {
    setLoadingBps(true);
    try {
      const resp = await api.authFetch(`/api/auth/deception-targets/${targetId}/blueprints/`);
      const data: Blueprint[] = await resp.json();
      setBlueprints(data);
    } catch {
      toast.error("Failed to load blueprints.");
    } finally {
      setLoadingBps(false);
    }
  }

  async function selectTarget(t: DeceptionTarget) {
    setSelectedTarget(t);
    await loadBlueprints(t.id);
  }

  // ── Consent toggles ─────────────────────────────────────────────────

  async function toggleConsent(
    field: "allow_automated_remediation_analysis" | "allow_schema_mirroring",
    value: boolean,
  ) {
    if (!selectedTarget) return;
    try {
      const resp = await api.authFetch(`/api/auth/deception-targets/${selectedTarget.id}/`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ [field]: value }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const updated: DeceptionTarget = await resp.json();
      setSelectedTarget(updated);
      setTargets(prev => prev.map(t => t.id === updated.id ? updated : t));
      toast.success(value ? "Enabled." : "Disabled.");
    } catch {
      toast.error("Failed to update setting.");
    }
  }

  // ── Pipeline animation ──────────────────────────────────────────────

  function animatePipeline(onComplete: () => void) {
    // Reset
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
    setStages(INITIAL_STAGES.map((s, i) => ({
      ...s, state: i === 0 ? "running" : "waiting"
    })));

    let elapsed = 0;
    STAGE_DURATIONS.forEach((dur, idx) => {
      elapsed += dur;
      const t = setTimeout(() => {
        setStages(prev => prev.map((s, i) => {
          if (i === idx)     return { ...s, state: "done" };
          if (i === idx + 1 && idx + 1 < INITIAL_STAGES.length) return { ...s, state: "running" };
          return s;
        }));
        if (idx === INITIAL_STAGES.length - 1) onComplete();
      }, elapsed);
      stageTimers.current.push(t);
    });
  }

  function markStageFailed() {
    setStages(prev => prev.map(s =>
      s.state === "running" ? { ...s, state: "error" } : s
    ));
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
  }

  // ── Run remediation ─────────────────────────────────────────────────

  async function runAnalysis() {
    if (!selectedTarget) return;
    if (!selectedTarget.allow_automated_remediation_analysis) {
      toast.error("Enable the consent toggle first.");
      return;
    }
    if (running) return;

    setRunning(true);

    // Start pipeline animation — it runs independently of the HTTP call
    animatePipeline(() => {
      // "done" callback fires after last stage animation finishes.
      // At this point the backend job is likely still running (70B model takes
      // 10-20 s on Groq free tier), so we start polling for the blueprint
      // instead of assuming it's already there.
      startPollingForBlueprint();
    });

    try {
      const formData = new FormData();
      if (uploadedFile) formData.append("log_file", uploadedFile);

      const resp = await api.authFetch(
        `/api/auth/deception-targets/${selectedTarget.id}/run-remediation/`,
        {
          method: "POST",
          body:   uploadedFile ? formData : undefined,
        },
      );
      const result = await resp.json();

      if (!resp.ok) {
        markStageFailed();
        setRunning(false);
        toast.error(result.error ?? "Analysis failed.");
        return;
      }

      // Successful kick-off — polling handles the rest
      toast.success("Analysis started — blueprint will appear below when ready.");
    } catch (e: any) {
      markStageFailed();
      setRunning(false);
      toast.error(e.message ?? "Analysis failed.");
    }
  }

  function startPollingForBlueprint() {
    if (!selectedTarget) return;
    if (pollRef.current) clearInterval(pollRef.current);

    const targetId = selectedTarget.id;
    const startLen = blueprints.length;

    pollRef.current = setInterval(async () => {
      try {
        const resp = await api.authFetch(`/api/auth/deception-targets/${targetId}/blueprints/`);
        const data: Blueprint[] = await resp.json();
        setBlueprints(data);

        if (data.length > startLen) {
          // New blueprint arrived
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setRunning(false);
          setUploadedFile(null);
          toast.success("Blueprint ready. Review it below.");
        }
      } catch {
        // non-fatal poll failure
      }
    }, 8_000);

    // Stop polling after 3 minutes even if no blueprint appears
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setRunning(false);
      }
    }, 180_000);
  }

  // ── Blueprint status change ─────────────────────────────────────────

  async function handleStatusChange(blueprintId: string, newStatus: string) {
    try {
      const resp = await api.authFetch(`/api/auth/blueprints/${blueprintId}/`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (!resp.ok) throw new Error();
      setBlueprints(prev =>
        prev.map(b => b.id === blueprintId ? { ...b, status: newStatus as Blueprint["status"] } : b)
      );
      toast.success(`Blueprint marked as ${newStatus.replace("_", " ")}.`);
    } catch {
      toast.error("Failed to update blueprint.");
    }
  }

  // ── File drag-drop ──────────────────────────────────────────────────

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadedFile(file);
  }

  // ── Derived / filtered ──────────────────────────────────────────────

  const filteredBps = blueprints.filter(b =>
    bpFilter === "all" || b.status === bpFilter
  );

  const bpCounts = blueprints.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 pb-5 border-b border-border">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck size={17} className="text-primary" />
              Proactive Remediation Centre
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI-powered log analysis and defensive patch generation.
              Every blueprint requires manual review — nothing deploys automatically.
            </p>
          </div>
          <Button
            onClick={() => { loadTargets(); if (selectedTarget) loadBlueprints(selectedTarget.id); }}
            variant="outline" size="sm" className="h-7 text-xs gap-1.5"
          >
            <RefreshCw size={11} /> Refresh
          </Button>
        </div>

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {loadingTargets ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : targets.length === 0 ? (
          <div className="border border-dashed border-border p-16 text-center">
            <Brain size={36} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm font-semibold">No registered sites yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Register a site first, then enable deception target settings here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[260px_1fr] gap-6">

            {/* ╔══════════════════════════════╗
                ║  LEFT — Site list            ║
                ╚══════════════════════════════╝ */}
            <div className="flex flex-col gap-4">
              <div className="border border-border">
                <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                  <p className="text-[11px] font-bold uppercase tracking-widest">Registered Sites</p>
                </div>
                <div className="divide-y divide-border">
                  {targets.map(t => (
                    <button
                      key={t.id}
                      onClick={() => selectTarget(t)}
                      className={`w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors ${
                        selectedTarget?.id === t.id ? "bg-primary/8 border-l-2 border-primary" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold font-mono truncate">{t.site_domain}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] ${
                            t.allow_automated_remediation_analysis
                              ? "text-emerald-400" : "text-muted-foreground/50"
                          }`}>
                            {t.allow_automated_remediation_analysis ? "● AI on" : "○ AI off"}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40">
                            {t.blueprint_count} bp{t.blueprint_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ╔══════════════════════════════╗
                ║  RIGHT — Main panel          ║
                ╚══════════════════════════════╝ */}
            {selectedTarget && (
              <div className="flex flex-col gap-5">

                {/* ── Consent controls ─────────────────────────────── */}
                <div className="border border-border">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                    <ShieldCheck size={13} className="text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Consent & Authorization</span>
                  </div>
                  <div className="p-4 space-y-4">

                    {/* Primary consent — high-visibility */}
                    <div className="border border-amber-500/30 bg-amber-500/5 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={17} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold">Authorize AI Remediation Analysis</p>
                              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                Allow the background engine to process{" "}
                                <strong className="text-foreground">{selectedTarget.site_domain}</strong>'s
                                activity logs using Groq AI (llama3-70b-8192) and generate
                                defensive patch blueprints. Blueprints require manual review —
                                no code is applied automatically.
                              </p>
                            </div>
                            <Switch
                              checked={selectedTarget.allow_automated_remediation_analysis}
                              onCheckedChange={v =>
                                toggleConsent("allow_automated_remediation_analysis", v)
                              }
                              className="flex-shrink-0 mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Schema mirroring */}
                    <div className="flex items-start justify-between gap-4 px-1">
                      <div className="flex-1">
                        <p className="text-xs font-semibold">Schema Mirroring (Passive)</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Proxy passively maps JSON structural blueprints from legitimate traffic
                          for AI decoy generation. No raw values are stored — structure only
                          (field name → type).
                        </p>
                      </div>
                      <Switch
                        checked={selectedTarget.allow_schema_mirroring}
                        onCheckedChange={v => toggleConsent("allow_schema_mirroring", v)}
                        className="flex-shrink-0 mt-0.5"
                      />
                    </div>

                    {selectedTarget.last_analysis && (
                      <p className="text-[10px] text-muted-foreground/50 font-mono px-1">
                        Last analysis: {new Date(selectedTarget.last_analysis).toLocaleString("en-GB")}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Analysis pipeline ────────────────────────────── */}
                <div className="border border-border">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                    <Activity size={13} className="text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Analysis Pipeline</span>
                    {running && (
                      <span className="ml-auto text-[10px] font-mono text-amber-400 flex items-center gap-1">
                        <Loader2 size={9} className="animate-spin" /> Running
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-5">

                    {/* File drop zone */}
                    <div>
                      <p className="text-xs font-semibold mb-2">
                        External Log File
                        <span className="ml-2 text-muted-foreground font-normal">(optional — Cowrie JSON, nginx access log, etc.)</span>
                      </p>
                      <div
                        onDrop={onDrop}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onClick={() => fileRef.current?.click()}
                        className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                          dragOver
                            ? "border-primary/70 bg-primary/5"
                            : uploadedFile
                              ? "border-emerald-500/50 bg-emerald-500/5"
                              : "border-border hover:border-primary/30 hover:bg-muted/20"
                        }`}
                      >
                        {uploadedFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileWarning size={16} className="text-emerald-400" />
                            <span className="text-xs font-mono text-emerald-400">{uploadedFile.name}</span>
                            <button
                              className="text-muted-foreground/60 hover:text-foreground ml-2"
                              onClick={e => { e.stopPropagation(); setUploadedFile(null); }}
                            >×</button>
                          </div>
                        ) : (
                          <>
                            <Upload size={20} className="mx-auto mb-2 text-muted-foreground/40" />
                            <p className="text-xs text-muted-foreground">
                              Drop a log file here, or click to browse
                            </p>
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                              .log · .txt · .json (Cowrie format auto-detected)
                            </p>
                          </>
                        )}
                        <input
                          ref={fileRef}
                          type="file"
                          className="hidden"
                          accept=".log,.txt,.json"
                          onChange={e => setUploadedFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                    </div>

                    {/* Stage visualiser */}
                    <div className="space-y-2">
                      {stages.map(s => <PipelineStageRow key={s.id} stage={s} />)}
                    </div>

                    {/* Run button */}
                    <Button
                      onClick={runAnalysis}
                      disabled={running || !selectedTarget.allow_automated_remediation_analysis}
                      className="w-full h-9 text-xs font-bold uppercase tracking-widest gap-2"
                    >
                      {running
                        ? <><Loader2 size={13} className="animate-spin" /> Analysis Running…</>
                        : <><Brain size={13} /> Run AI Remediation Analysis</>}
                    </Button>

                    {!selectedTarget.allow_automated_remediation_analysis && (
                      <p className="text-[11px] text-amber-500 text-center">
                        Enable the consent toggle above to unlock analysis.
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Blueprint list ───────────────────────────────── */}
                <div className="border border-border">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2 flex-wrap">
                    <ListChecks size={13} className="text-primary flex-shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">
                      Defensive Blueprints
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground ml-1">
                      ({blueprints.length})
                    </span>

                    {/* Status filters */}
                    <div className="flex items-center gap-1 ml-auto flex-wrap">
                      {[
                        { key: "all",            label: `All (${blueprints.length})` },
                        { key: "pending_review", label: `Review (${bpCounts.pending_review ?? 0})` },
                        { key: "accepted",       label: `Accepted (${bpCounts.accepted ?? 0})` },
                        { key: "applied",        label: `Applied (${bpCounts.applied ?? 0})` },
                      ].map(f => (
                        <button
                          key={f.key}
                          onClick={() => setBpFilter(f.key)}
                          className={`text-[10px] font-mono px-2 py-0.5 border transition-colors ${
                            bpFilter === f.key
                              ? "border-primary/50 text-primary bg-primary/8"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingBps ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={20} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredBps.length === 0 ? (
                    <div className="py-14 text-center">
                      <FileCode2 size={28} className="mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {blueprints.length === 0
                          ? "No blueprints yet — run an analysis above."
                          : `No blueprints matching filter "${bpFilter}".`}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredBps.map(bp => (
                        <BlueprintCard
                          key={bp.id}
                          bp={bp}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
