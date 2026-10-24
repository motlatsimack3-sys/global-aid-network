import { bpsToPercent, formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProgressTone = "primary" | "accent";

const toneFill: Record<ProgressTone, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
};

const toneText: Record<ProgressTone, string> = {
  primary: "text-primary",
  accent: "text-accent",
};

/** Cause-coded funding progress bar with a percentage label at the fill edge. */
export function ProgressBar({
  progressBps,
  tone = "primary",
  className,
}: {
  progressBps: bigint;
  tone?: ProgressTone;
  className?: string;
}) {
  const percent = bpsToPercent(progressBps);
  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        tabIndex={0}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Funding progress"
      >
        <div
          className={cn(
            "h-full origin-left rounded-full animate-progress-fill",
            toneFill[tone],
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-mono font-semibold", toneText[tone])}>
          {percent}%
        </span>
        <span className="text-muted-foreground">funded</span>
      </div>
    </div>
  );
}

/** Goal / raised ledger row used on cause cards and detail pages. */
export function FundingLedger({
  goalCents,
  raisedCents,
  tone = "primary",
}: {
  goalCents: bigint;
  raisedCents: bigint;
  tone?: ProgressTone;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Funding Goal
        </span>
        <span className="font-mono text-base font-semibold text-foreground">
          {formatCents(goalCents)}
        </span>
      </div>
      <ProgressBar
        progressBps={goalCents > 0n ? (raisedCents * 10000n) / goalCents : 0n}
        tone={tone}
      />
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">Raised so far</span>
        <span className="font-mono text-base font-semibold text-foreground">
          {formatCents(raisedCents)}
        </span>
      </div>
    </div>
  );
}
