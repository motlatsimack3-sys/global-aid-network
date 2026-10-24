import type { CauseView } from "@/backend";
import { FundingLedger } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

/** Terracotta for the Nepal cause, water-teal for Africa; falls back by index. */
export function causeTone(cause: CauseView, index = 0): "primary" | "accent" {
  const haystack = `${cause.title} ${cause.description}`.toLowerCase();
  if (haystack.includes("africa") || haystack.includes("water"))
    return "accent";
  if (haystack.includes("nepal") || haystack.includes("earthquake"))
    return "primary";
  return index % 2 === 0 ? "primary" : "accent";
}

/** Editorial cause card: image, title, description, live funding ledger and CTA. */
export function CauseCard({
  cause,
  index = 0,
  className,
}: {
  cause: CauseView;
  index?: number;
  className?: string;
}) {
  const tone = causeTone(cause, index);
  return (
    <article
      data-ocid={`cause.card.${index + 1}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-subtle transition-smooth hover:-translate-y-1 hover:shadow-elevated",
        className,
      )}
    >
      <div className="aspect-[3/2] w-full overflow-hidden bg-muted">
        <img
          src={cause.imageRef || "/assets/images/placeholder.svg"}
          alt={cause.title}
          loading="lazy"
          className="h-full w-full object-cover transition-smooth group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="space-y-2">
          <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {cause.title}
          </h3>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {cause.description}
          </p>
        </div>
        <FundingLedger
          goalCents={cause.goalCents}
          raisedCents={cause.raisedCents}
          tone={tone}
        />
        <Button
          asChild
          className="mt-auto w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-elevated"
        >
          <Link
            to="/causes/$causeId"
            params={{ causeId: cause.id.toString() }}
            data-ocid={`cause.support_button.${index + 1}`}
          >
            Support This Cause
          </Link>
        </Button>
      </div>
    </article>
  );
}
