import type { CauseView, DonationView } from "@/backend";
import { CauseCard } from "@/components/CauseCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCauses, useRecentDonations } from "@/hooks/useQueries";
import { formatCents, formatRelative } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Droplets,
  HeartHandshake,
  Home,
  Share2,
} from "lucide-react";

const HERO_IMAGE = "/assets/generated/hero-nepal-rebuild.dim_1200x900.jpg";

const missionPillars = [
  {
    icon: Home,
    title: "Rebuild homes",
    body: "Restoring safe shelter for families in Nepal who lost their homes and relatives to the earthquake.",
  },
  {
    icon: Droplets,
    title: "Deliver clean water",
    body: "Funding wells, pumps and storage so African communities can reach safe water close to home.",
  },
  {
    icon: HeartHandshake,
    title: "Provide food & medicine",
    body: "Getting essential food and medical supplies to families facing hunger and preventable illness.",
  },
];

/** Copy a cause's shareable link to the clipboard, with a graceful fallback. */
async function shareCause(cause: CauseView) {
  const url = `${window.location.origin}/causes/${cause.id.toString()}`;
  const shareData = {
    title: cause.title,
    text: `Support ${cause.title} through Common Ground.`,
    url,
  };
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      return;
    } catch {
      // Fall through to clipboard when the share sheet is dismissed or blocked.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Clipboard access can be denied; the link stays visible in the address bar.
  }
}

function Hero() {
  return (
    <section
      data-ocid="home.hero_section"
      className="border-b border-border bg-gradient-subtle"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Humanitarian relief, worldwide
          </p>
          <h1 className="text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            Building hope brick by brick, for communities in need.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Your generosity can transform lives. Explore critical relief
            projects in Nepal and across Africa, and join us in making a lasting
            impact through dedicated humanitarian aid.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground hover:bg-primary/90 hover:shadow-elevated"
            >
              <Link to="/" hash="causes" data-ocid="home.donate_button">
                Donate Now
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-border px-7 text-base font-semibold text-foreground hover:bg-muted"
            >
              <Link to="/" hash="causes" data-ocid="home.view_causes_button">
                View Causes
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-border shadow-elevated">
            <img
              src={HERO_IMAGE}
              alt="Volunteers rebuilding a mountain village home in Nepal beneath snow-capped peaks"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CauseCardSkeleton() {
  return (
    <div
      data-ocid="home.causes_loading_state"
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-subtle"
    >
      <Skeleton className="aspect-[3/2] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

function CausesSection() {
  const { data: causes, isLoading, isError, refetch } = useCauses();

  return (
    <section
      id="causes"
      data-ocid="home.causes_section"
      className="scroll-mt-20 bg-background"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="max-w-2xl space-y-3">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Current Critical Responses
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Every cause is a live relief effort. Choose where your gift goes and
            watch the progress grow.
          </p>
        </div>

        {isLoading && (
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => `cause-skeleton-${i}`).map(
              (id) => (
                <CauseCardSkeleton key={id} />
              ),
            )}
          </div>
        )}

        {isError && (
          <div
            data-ocid="home.causes_error_state"
            className="mt-10 flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-8 shadow-subtle"
          >
            <p className="text-foreground">
              We could not load the current causes right now.
            </p>
            <Button
              type="button"
              onClick={() => void refetch()}
              data-ocid="home.causes_retry_button"
              className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
            >
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && causes && causes.length === 0 && (
          <div
            data-ocid="home.causes_empty_state"
            className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center"
          >
            <h3 className="font-display text-xl font-semibold text-foreground">
              New relief efforts are on the way
            </h3>
            <p className="mt-2 text-muted-foreground">
              Our next causes are being prepared. Please check back soon to
              give.
            </p>
          </div>
        )}

        {!isLoading && !isError && causes && causes.length > 0 && (
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {causes.map((cause, index) => (
              <div key={cause.id.toString()} className="flex flex-col gap-3">
                <CauseCard cause={cause} index={index} />
                <button
                  type="button"
                  onClick={() => void shareCause(cause)}
                  data-ocid={`cause.share_button.${index + 1}`}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground"
                >
                  <Share2 className="size-4" aria-hidden="true" />
                  Share this cause
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SupporterRow({ donation }: { donation: DonationView }) {
  const initial =
    donation.donorDisplayName.trim().charAt(0).toUpperCase() || "G";
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-base font-semibold text-secondary-foreground"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {donation.donorDisplayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {donation.message?.trim() ? donation.message : "Gave with kindness"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-semibold text-foreground">
          {formatCents(donation.amountCents)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatRelative(donation.createdAt)}
        </p>
      </div>
    </li>
  );
}

function SupportersSection({ causeId }: { causeId: bigint | undefined }) {
  const { data: donations, isLoading } = useRecentDonations(causeId, 6n);

  if (causeId === undefined) return null;

  return (
    <section
      id="stories"
      data-ocid="home.supporters_section"
      className="scroll-mt-20 border-y border-border bg-secondary/40"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="max-w-2xl space-y-3">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Recent Supporters
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Real people, giving what they can. Every gift moves a community
            closer to recovery.
          </p>
        </div>

        {isLoading && (
          <div
            data-ocid="home.supporters_loading_state"
            className="mt-10 grid gap-3 md:grid-cols-2"
          >
            {Array.from({ length: 4 }, (_, i) => `supporter-skeleton-${i}`).map(
              (id) => (
                <Skeleton key={id} className="h-16 w-full rounded-lg" />
              ),
            )}
          </div>
        )}

        {!isLoading && donations && donations.length > 0 && (
          <ul className="mt-10 grid gap-3 md:grid-cols-2">
            {donations.map((donation) => (
              <SupporterRow key={donation.id.toString()} donation={donation} />
            ))}
          </ul>
        )}

        {!isLoading && donations && donations.length === 0 && (
          <p
            data-ocid="home.supporters_empty_state"
            className="mt-10 rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground"
          >
            Be the first to support this cause — your gift will appear here.
          </p>
        )}
      </div>
    </section>
  );
}

function MissionSection() {
  return (
    <section
      id="about"
      data-ocid="home.mission_section"
      className="scroll-mt-20 bg-background"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="max-w-2xl space-y-3">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Where your gift goes
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Common Ground works with local partners to deliver aid where it is
            needed most, with transparency at every step.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {missionPillars.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-xl border border-border bg-card p-6 shadow-subtle"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <pillar.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {pillar.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section
      id="contact"
      data-ocid="home.contact_section"
      className="scroll-mt-20 border-t border-border bg-gradient-subtle"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:px-6 md:py-20">
        <div className="max-w-xl space-y-3">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Give today, change a life tomorrow
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Your support reaches families rebuilding after disaster and
            communities working toward clean water, food and medicine.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90 hover:shadow-elevated"
        >
          <Link to="/" hash="causes" data-ocid="home.contact_donate_button">
            Donate Now
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data: causes } = useCauses();
  const featuredCauseId = causes?.[0]?.id;

  return (
    <div data-ocid="home.page">
      <Hero />
      <CausesSection />
      <SupportersSection causeId={featuredCauseId} />
      <MissionSection />
      <ContactSection />
    </div>
  );
}
