/**
 * Logo.tsx — the single source of truth for GeniusMirage's logo mark.
 *
 * `LogoMark` is the raw nested-hexagon icon (no background).
 * `Logo` wraps it in an oval badge — this is what should be used
 * everywhere in the app (sidebar, auth pages, headers, etc.) so every
 * appearance of the logo looks the same.
 */

export const LogoMark = () => (
  <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <polygon points="14,1 27,8 27,20 14,27 1,20 1,8" fill="currentColor" className="text-primary" opacity="0.25" />
    <polygon points="14,5 23,10 23,18 14,23 5,18 5,10" fill="currentColor" className="text-primary" opacity="0.55" />
    <polygon points="14,9 19,12 19,16 14,19 9,16 9,12" fill="currentColor" className="text-primary" />
  </svg>
);

interface LogoProps {
  /** Overall badge size, e.g. "w-10 h-10". Defaults to a medium size. */
  className?: string;
}

export function Logo({ className = "w-10 h-10" }: LogoProps) {
  return (
    <div
      className={`${className} rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center flex-shrink-0`}
    >
      <div className="w-[62%] h-[62%]">
        <LogoMark />
      </div>
    </div>
  );
}
