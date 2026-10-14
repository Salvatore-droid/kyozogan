/**
 * LiveInterventionDashboard.tsx  — Segment 2 complete
 *
 * Dual WebSocket architecture:
 *   monitorWs   — server→operator read path: receives streaming telemetry
 *                 events (attacker keystrokes, AI token output, system notices)
 *                 and renders them into the colour-coded terminal.
 *   controlWs   — operator→server write path: sends inject / pause / resume /
 *                 terminate commands to OperatorMonitorConsumer.  Keeping it
 *                 a separate socket lets the read stream stay undisrupted while
 *                 the operator types — no head-of-line blocking on the same
 *                 connection, and the control socket can reconnect independently
 *                 if something drops.
 *
 * Terminal rendering:
 *   Attacker commands  → red    (direction="inbound",  ▶ glyph)
 *   AI token chunks    → green  (direction="outbound", ◀ glyph)
 *   Operator/system    → amber  (direction="system",   • glyph)
 *
 *   Per-token streaming: when event_type="groq_output_chunk" arrives the
 *   chunk is *appended* to the last green line in the telemetry buffer
 *   rather than pushed as a new line, reproducing a real typing effect.
 *
 * Keyboard shortcuts:
 *   Enter  — submit injection text
 *   Escape — clear injection input
 *   Ctrl+K — clear terminal buffer
 */

import { useEffect, useRef, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button }     from "@/components/ui/button";
import { Input }      from "@/components/ui/input";
import { api }        from "@/lib/api";
import { toast }      from "sonner";
import {
  Terminal, Zap, AlertTriangle, Send, X, Wifi, WifiOff,
  Eye, Activity, Shield, ChevronRight, Pause, Play,
  Trash2, Copy, Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TelemetryLine {
  id:        string;
  ts:        number;
  direction: "inbound" | "outbound" | "system";
  colour:    "red" | "green" | "yellow" | "dim";
  text:      string;
  partial:   boolean;   // true while streaming token chunks for this line
}

interface ActiveShellSession {
  id:                  string;
  session_id:          string;
  domain:              string;
  ip_address:          string;
  threat_level:        string;
  detected_techniques: string[];
  swap_approved:       boolean;
}

interface SessionStats {
  commands:    number;
  aiResponses: number;
  injections:  number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOUR_CLASS: Record<string, string> = {
  red:    "text-red-400",
  green:  "text-emerald-400",
  yellow: "text-amber-400",
  dim:    "text-muted-foreground/60",
};

const DIRECTION_GLYPH: Record<string, string> = {
  inbound:  "▶",
  outbound: "◀",
  system:   "•",
};

const DIRECTION_COLOUR: Record<string, string> = {
  inbound:  "text-red-500",
  outbound: "text-emerald-500",
  system:   "text-amber-500/70",
};

type WsStatus = "disconnected" | "connecting" | "connected" | "error";

function fmtTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("en-GB", {
    hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const buildWsUrl = (path: string) =>
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}${path}`;

const getJwt = () => localStorage.getItem("access_token") ?? "";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LiveInterventionDashboard() {
  // Session state
  const [sessions,         setSessions]         = useState<ActiveShellSession[]>([]);
  const [selectedSession,  setSelectedSession]  = useState<ActiveShellSession | null>(null);
  const [stats,            setStats]            = useState<SessionStats>({ commands: 0, aiResponses: 0, injections: 0 });

  // WebSocket state — two separate connections
  const [monitorStatus, setMonitorStatus] = useState<WsStatus>("disconnected");
  const [controlStatus, setControlStatus] = useState<WsStatus>("disconnected");
  const monitorWsRef = useRef<WebSocket | null>(null);
  const controlWsRef = useRef<WebSocket | null>(null);

  // Terminal state
  const [lines,      setLines]      = useState<TelemetryLine[]>([]);
  const [isPaused,   setIsPaused]   = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Operator input
  const [injection, setInjection] = useState("");

  // Refs
  const termRef   = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const pausedRef = useRef(false);   // stable ref for ws handlers

  // Sync pausedRef with isPaused so ws callbacks see current value
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);

  // Auto-scroll terminal
  useEffect(() => {
    if (!autoScroll) return;
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, autoScroll]);

  // Load eligible sessions on mount and every 15s
  useEffect(() => {
    loadSessions();
    const t = setInterval(loadSessions, 15_000);
    return () => clearInterval(t);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setInjection("");
        inputRef.current?.blur();
      }
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        clearTerminal();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Clean up both sockets on unmount
  useEffect(() => {
    return () => {
      monitorWsRef.current?.close();
      controlWsRef.current?.close();
    };
  }, []);

  // ── Data loading ────────────────────────────────────────────────────

  async function loadSessions() {
    try {
      const data = await api.getActiveSessions({ limit: 100 });
      const eligible = ((data as any).sessions ?? data).filter(
        (s: ActiveShellSession) => s.backend_type === "deceptive" && s.swap_approved
      ) as ActiveShellSession[];
      setSessions(eligible);
    } catch {
      // non-fatal polling failure
    }
  }

  // ── Terminal helpers ────────────────────────────────────────────────

  function pushLine(
    direction: TelemetryLine["direction"],
    colour: TelemetryLine["colour"],
    text: string,
    partial = false,
    ts?: number,
  ) {
    const line: TelemetryLine = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ts:        ts ?? Date.now() / 1000,
      direction,
      colour,
      text,
      partial,
    };
    setLines(prev => [...prev.slice(-800), line]);
    if (direction === "inbound")  setStats(s => ({ ...s, commands: s.commands + 1 }));
    if (direction === "outbound" && !partial) setStats(s => ({ ...s, aiResponses: s.aiResponses + 1 }));
  }

  /** Append a token chunk to the most recent partial (green) line. */
  function appendChunk(chunk: string) {
    setLines(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.partial && last.direction === "outbound") {
        return [
          ...prev.slice(0, -1),
          { ...last, text: last.text + chunk },
        ];
      }
      // No partial line yet — start one
      return [
        ...prev.slice(-800),
        {
          id:        `chunk-${Date.now()}`,
          ts:        Date.now() / 1000,
          direction: "outbound",
          colour:    "green",
          text:      chunk,
          partial:   true,
        },
      ];
    });
  }

  /** Mark the last partial line as complete. */
  function finaliseChunk() {
    setLines(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.partial) return [...prev.slice(0, -1), { ...last, partial: false }];
      return prev;
    });
    setStats(s => ({ ...s, aiResponses: s.aiResponses + 1 }));
  }

  function clearTerminal() {
    setLines([]);
    setStats({ commands: 0, aiResponses: 0, injections: 0 });
  }

  function copyTerminal() {
    const text = lines.map(l => `[${fmtTime(l.ts)}] ${DIRECTION_GLYPH[l.direction]} ${l.text}`).join("\n");
    navigator.clipboard.writeText(text).then(() => toast.success("Terminal copied to clipboard."));
  }

  function downloadTerminal() {
    const text = lines.map(l => `[${fmtTime(l.ts)}] ${l.direction.toUpperCase()}: ${l.text}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `intercept-${selectedSession?.session_id ?? "session"}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── WebSocket — monitor channel (read) ─────────────────────────────

  const connectMonitor = useCallback((session: ActiveShellSession) => {
    monitorWsRef.current?.close();
    setMonitorStatus("connecting");

    const jwt = getJwt();
    const ws  = new WebSocket(buildWsUrl(`/ws/deception/monitor/${session.id}/?token=${jwt}`));
    monitorWsRef.current = ws;

    ws.onopen = () => {
      setMonitorStatus("connected");
      pushLine("system", "yellow", `Monitor connected → ${session.domain} (${session.ip_address})`);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);
        handleMonitorMessage(msg);
      } catch {
        pushLine("system", "dim", evt.data as string);
      }
    };

    ws.onerror = () => {
      setMonitorStatus("error");
      pushLine("system", "yellow", "Monitor WebSocket error. Is daphne running?");
    };

    ws.onclose = (e) => {
      setMonitorStatus("disconnected");
      pushLine("system", "dim", `Monitor disconnected (code ${e.code}).`);
    };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  function handleMonitorMessage(msg: Record<string, any>) {
    const { type, event_type, direction, colour, data, ts, message, paused } = msg;

    if (type === "telemetry") {
      if (event_type === "attacker_input") {
        // Full command — push as a complete red line
        pushLine("inbound", "red", data, false, ts);
      } else if (event_type === "groq_output_chunk") {
        // Per-token streaming — append to the current partial green line
        appendChunk(data);
      } else {
        // Any other outbound telemetry (e.g. full response replay)
        finaliseChunk();
        pushLine(direction ?? "outbound", colour ?? "green", data, false, ts);
      }
    } else if (type === "monitor_connected") {
      pushLine("system", "yellow", message ?? "Connected.");
    } else if (type === "monitor_status") {
      setIsPaused(!!paused);
      pushLine("system", "yellow", message ?? (paused ? "Paused." : "Resumed."));
    } else if (type === "injection_sent") {
      pushLine("system", "yellow", `[INJECT] ${msg.instruction}`);
      setStats(s => ({ ...s, injections: s.injections + 1 }));
    } else if (type === "termination_sent") {
      pushLine("system", "yellow", "[TERMINATE] Teardown command sent.");
    } else if (type === "error") {
      pushLine("system", "yellow", `[ERROR] ${msg.message}`);
    }
  }

  // ── WebSocket — control channel (write) ────────────────────────────

  const connectControl = useCallback((session: ActiveShellSession) => {
    controlWsRef.current?.close();
    setControlStatus("connecting");

    const jwt = getJwt();
    // Control channel uses the same monitor URL — operators stay on the same
    // session group; we just keep separate ws instances for clean separation.
    const ws  = new WebSocket(buildWsUrl(`/ws/deception/monitor/${session.id}/?token=${jwt}`));
    controlWsRef.current = ws;

    ws.onopen  = () => setControlStatus("connected");
    ws.onerror = () => setControlStatus("error");
    ws.onclose = () => setControlStatus("disconnected");
    // Control socket only sends; we don't need to handle incoming on it.
  }, []);

  function sendControl(payload: object) {
    const ws = controlWsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast.error("Control channel not connected.");
      return;
    }
    ws.send(JSON.stringify(payload));
  }

  // ── Connect to a session ────────────────────────────────────────────

  const openSession = useCallback((session: ActiveShellSession) => {
    // Tear down any previous connections
    monitorWsRef.current?.close();
    controlWsRef.current?.close();

    setSelectedSession(session);
    clearTerminal();
    setIsPaused(false);

    pushLine("system", "yellow", `Opening session ${session.session_id}…`);
    connectMonitor(session);
    connectControl(session);
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [connectMonitor, connectControl]);

  // ── Operator actions ────────────────────────────────────────────────

  function handleInject() {
    const text = injection.trim();
    if (!text) return;
    sendControl({ action: "inject", instruction: text });
    setInjection("");
    inputRef.current?.focus();
  }

  function handleTogglePause() {
    sendControl({ action: isPaused ? "resume" : "pause" });
  }

  function handleTerminate() {
    if (!confirm(
      "This will immediately close the attacker's WebSocket connection.\n\nContinue?"
    )) return;
    sendControl({ action: "terminate" });
  }

  // ── Derived state ───────────────────────────────────────────────────

  const isConnected  = monitorStatus === "connected" && controlStatus === "connected";
  const isConnecting = monitorStatus === "connecting" || controlStatus === "connecting";

  function wsLabel() {
    if (isConnected)  return { text: "LIVE",        cls: "border-emerald-500/60 text-emerald-400" };
    if (isConnecting) return { text: "CONNECTING",  cls: "border-amber-500/60 text-amber-400" };
    if (monitorStatus === "error") return { text: "ERROR",  cls: "border-red-500/60 text-red-400" };
    return { text: "OFFLINE", cls: "border-border text-muted-foreground" };
  }
  const wsLabel_ = wsLabel();

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">

        {/* ── Page Header ────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-5 pb-5 border-b border-border">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Terminal size={17} className="text-primary" />
              Live Intercept Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dual-channel honeypot wiretap — attacker <span className="text-red-400">▶ red</span>{" "}
              · AI responses <span className="text-emerald-400">◀ green</span>
              · operator <span className="text-amber-400">• amber</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats row */}
            {selectedSession && (
              <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
                <span><span className="text-red-400">{stats.commands}</span> cmds</span>
                <span><span className="text-emerald-400">{stats.aiResponses}</span> responses</span>
                <span><span className="text-amber-400">{stats.injections}</span> injections</span>
              </div>
            )}
            {/* Connection status badge */}
            <div className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 border ${wsLabel_.cls}`}>
              {isConnected
                ? <Wifi size={10} />
                : isConnecting
                  ? <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  : <WifiOff size={10} />}
              {wsLabel_.text}
            </div>
          </div>
        </div>

        {/* ── Split layout ────────────────────────────────────────────── */}
        <div className="grid grid-cols-[1fr_320px] gap-5" style={{ height: "calc(100vh - 11rem)" }}>

          {/* ╔══════════════════════════════╗
              ║  LEFT — Terminal             ║
              ╚══════════════════════════════╝ */}
          <div className="flex flex-col border border-border bg-black/70 overflow-hidden">

            {/* Traffic-light toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-black/50 flex-shrink-0">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/70 flex-1 truncate">
                {selectedSession
                  ? `intercept ▸ ${selectedSession.domain} ▸ ${selectedSession.ip_address}`
                  : "no session"}
              </span>
              <span className="text-[10px] font-mono text-emerald-500/60 flex-shrink-0">
                llama3-8b-8192
              </span>
              {/* Toolbar actions */}
              <button onClick={() => setAutoScroll(a => !a)}
                className={`text-[10px] font-mono px-1.5 py-0.5 border transition-colors ${
                  autoScroll ? "border-primary/40 text-primary" : "border-border text-muted-foreground"
                }`} title="Toggle auto-scroll">
                AUTO
              </button>
              <button onClick={copyTerminal}
                className="text-muted-foreground/60 hover:text-foreground transition-colors" title="Copy (Ctrl+C)">
                <Copy size={12} />
              </button>
              <button onClick={downloadTerminal}
                className="text-muted-foreground/60 hover:text-foreground transition-colors" title="Download">
                <Download size={12} />
              </button>
              <button onClick={clearTerminal}
                className="text-muted-foreground/60 hover:text-foreground transition-colors" title="Clear (Ctrl+K)">
                <Trash2 size={12} />
              </button>
            </div>

            {/* ── Terminal output ──────────────────────────────────── */}
            <div
              ref={termRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                if (!atBottom) setAutoScroll(false);
                else setAutoScroll(true);
              }}
              className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-[1.65] space-y-0"
              style={{ scrollbarWidth: "thin" }}
            >
              {lines.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 select-none">
                  <Terminal size={32} className="mb-3" />
                  <p className="text-xs">Select a session on the right to open the intercept stream.</p>
                  <p className="text-[10px] mt-1">Esc to clear input · Ctrl+K to clear terminal</p>
                </div>
              )}

              {lines.map((line) => (
                <div key={line.id} className="flex gap-2">
                  {/* Timestamp */}
                  <span className="text-muted-foreground/30 flex-shrink-0 select-none tabular-nums">
                    {fmtTime(line.ts)}
                  </span>
                  {/* Direction glyph */}
                  <span className={`flex-shrink-0 w-3 select-none ${DIRECTION_COLOUR[line.direction]}`}>
                    {DIRECTION_GLYPH[line.direction]}
                  </span>
                  {/* Content */}
                  <span className={`whitespace-pre-wrap break-all flex-1 ${COLOUR_CLASS[line.colour]}`}>
                    {line.text}
                    {line.partial && (
                      <span className="inline-block w-1.5 h-3 bg-emerald-400/70 ml-0.5 animate-pulse" />
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Operator injection bar ───────────────────────────── */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/40 bg-black/50 flex-shrink-0">
              <span className="text-[10px] font-mono text-amber-400/80 flex-shrink-0 select-none">
                {isPaused ? "MANUAL›" : "INJECT›"}
              </span>
              <Input
                ref={inputRef}
                value={injection}
                onChange={e => setInjection(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleInject();
                  if (e.key === "Escape") { setInjection(""); (e.target as HTMLInputElement).blur(); }
                }}
                placeholder={
                  isConnected
                    ? "Steer the AI persona (invisible to attacker)…"
                    : "Connect to a session to inject…"
                }
                className="flex-1 h-7 text-[11px] font-mono bg-transparent border-border/40 focus:border-amber-500/50"
                disabled={!isConnected}
              />
              <Button
                onClick={handleInject}
                size="sm"
                className="h-7 w-7 p-0 flex-shrink-0"
                disabled={!isConnected || !injection.trim()}
                title="Send injection (Enter)"
              >
                <Send size={11} />
              </Button>
            </div>
          </div>

          {/* ╔══════════════════════════════╗
              ║  RIGHT — Controls            ║
              ╚══════════════════════════════╝ */}
          <div className="flex flex-col gap-4 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

            {/* Eligible Sessions */}
            <div className="border border-border flex-shrink-0">
              <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Sessions</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{sessions.length}</span>
              </div>

              <div className="divide-y divide-border max-h-52 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                {sessions.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground p-4 text-center leading-relaxed">
                    No eligible sessions.<br />
                    Approve a swap in <strong>Active Sessions</strong> first.
                  </p>
                ) : (
                  sessions.map(sess => {
                    const isSel = selectedSession?.id === sess.id;
                    return (
                      <button
                        key={sess.id}
                        onClick={() => openSession(sess)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${
                          isSel ? "bg-primary/8 border-l-2 border-primary" : ""
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold font-mono truncate">{sess.domain}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{sess.ip_address}</p>
                        </div>
                        <ChevronRight size={11} className="text-muted-foreground/40 flex-shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Active session info */}
            {selectedSession && (
              <div className="border border-border flex-shrink-0">
                <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                  <Eye size={12} className="text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Monitored Session</span>
                </div>
                <div className="p-4 space-y-3">
                  <Row label="Domain"  value={selectedSession.domain} mono />
                  <Row label="IP"      value={selectedSession.ip_address} mono />
                  <Row label="Threat"  value={selectedSession.threat_level} mono
                    valueClass={
                      selectedSession.threat_level === "critical" ? "text-red-400" :
                      selectedSession.threat_level === "high"     ? "text-orange-400" : "text-amber-400"
                    } />
                  <Row label="Model"   value="llama3-8b-8192" mono valueClass="text-emerald-400" />

                  {selectedSession.detected_techniques?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">
                        Detected
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedSession.detected_techniques.map(t => (
                          <span key={t}
                            className="text-[9px] font-mono px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Operator Controls */}
            <div className="border border-border flex-shrink-0">
              <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                <Shield size={12} className="text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-widest">Operator Controls</span>
              </div>
              <div className="p-4 space-y-2.5">

                {/* Pause / Resume */}
                <Button
                  onClick={handleTogglePause}
                  variant="outline"
                  className={`w-full h-8 text-xs font-semibold gap-2 ${
                    isPaused
                      ? "border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10"
                      : "border-amber-500/60 text-amber-400 hover:bg-amber-500/10"
                  }`}
                  disabled={!isConnected}
                >
                  {isPaused ? <Play size={12} /> : <Pause size={12} />}
                  {isPaused ? "Resume Automated Routing" : "Pause Automated Routing"}
                </Button>

                {isPaused && (
                  <p className="text-[10px] text-amber-400/70 text-center leading-relaxed">
                    AI routing paused. Use the injection bar<br />to steer the session manually.
                  </p>
                )}

                {/* Terminate */}
                <Button
                  onClick={handleTerminate}
                  variant="outline"
                  className="w-full h-8 text-xs font-semibold gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                  disabled={!isConnected}
                >
                  <X size={12} />
                  Terminate Attacker Session
                </Button>

                {/* Channel status detail */}
                <div className="pt-1 space-y-1">
                  <ChannelRow label="Monitor (read)" status={monitorStatus} />
                  <ChannelRow label="Control (write)" status={controlStatus} />
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="border border-border p-4 space-y-2 flex-shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Legend</p>
              <LegendRow glyph="▶" glyphClass="text-red-400"     label="Attacker input (inbound)" />
              <LegendRow glyph="◀" glyphClass="text-emerald-400" label="Groq token stream (outbound)" />
              <LegendRow glyph="•" glyphClass="text-amber-400"   label="System / operator event" />
              <p className="text-[10px] text-muted-foreground/50 pt-1">Ctrl+K — clear · Esc — cancel input</p>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Row({ label, value, mono = false, valueClass = "" }: {
  label: string; value: string; mono?: boolean; valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-xs ${mono ? "font-mono" : ""} ${valueClass || "text-foreground"} truncate`}>{value}</p>
    </div>
  );
}

function ChannelRow({ label, status }: { label: string; status: WsStatus }) {
  const colour = status === "connected" ? "text-emerald-400" :
                 status === "connecting" ? "text-amber-400" :
                 status === "error"      ? "text-red-400" : "text-muted-foreground/50";
  return (
    <div className="flex items-center justify-between text-[10px] font-mono">
      <span className="text-muted-foreground/60">{label}</span>
      <span className={colour}>{status}</span>
    </div>
  );
}

function LegendRow({ glyph, glyphClass, label }: { glyph: string; glyphClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className={`font-mono w-3 ${glyphClass}`}>{glyph}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
