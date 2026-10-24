import type { CauseView, DonationView } from "@/backend";
import { causeTone } from "@/components/CauseCard";
import { FundingLedger } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useCause,
  useConfirmDonation,
  useRecentDonations,
  useStartDonation,
} from "@/hooks/useQueries";
import { formatCents, formatDate, parseDollarsToCents } from "@/lib/format";
import {
  clearPending,
  parseCheckoutSession,
  paymentReturnUrls,
  readPending,
  writePending,
} from "@/lib/payment";
import { cn } from "@/lib/utils";
import { Link, getRouteApi } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Heart,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const routeApi = getRouteApi("/causes/$causeId");

const PRESET_AMOUNTS = [2500n, 5000n, 10000n, 25000n];

function CauseSkeleton() {
  return (
    <div
      data-ocid="cause.loading_state"
      className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16"
    >
      <Skeleton className="h-6 w-40" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Skeleton className="aspect-[3/2] w-full rounded-xl" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}

function DonorList({ donations }: { donations: DonationView[] }) {
  if (donations.length === 0) {
    return (
      <div
        data-ocid="cause.donors.empty_state"
        className="rounded-xl border border-dashed border-border bg-card/60 px-6 py-10 text-center"
      >
        <Heart className="mx-auto size-6 text-primary" aria-hidden="true" />
        <p className="mt-3 font-display text-lg font-semibold text-foreground">
          Be the first to give
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your name will appear here as the first supporter of this cause.
        </p>
      </div>
    );
  }
  return (
    <ul data-ocid="cause.donors.list" className="divide-y divide-border">
      {donations.map((donation, index) => (
        <li
          key={donation.id.toString()}
          data-ocid={`cause.donor.item.${index + 1}`}
          className="flex items-start gap-4 py-4"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-secondary-foreground">
            {donation.donorDisplayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="truncate font-semibold text-foreground">
                {donation.donorDisplayName}
              </p>
              <p className="font-mono text-sm font-semibold text-primary">
                {formatCents(donation.amountCents)}
              </p>
            </div>
            {donation.message && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {donation.message}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(donation.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DonationForm({ cause }: { cause: CauseView }) {
  const startDonation = useStartDonation();
  const [amount, setAmount] = useState("50");
  const [donorName, setDonorName] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountCents = parseDollarsToCents(amount);
  const amountValid = amountCents !== null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (amountCents === null) {
      setError("Enter a donation amount greater than zero.");
      return;
    }
    try {
      const { successUrl, cancelUrl } = paymentReturnUrls();
      const started = await startDonation.mutateAsync({
        causeId: cause.id,
        amountCents,
        donorName:
          anonymous || donorName.trim() === "" ? undefined : donorName.trim(),
        message: message.trim() === "" ? undefined : message.trim(),
        successUrl,
        cancelUrl,
      });
      const session = parseCheckoutSession(started.sessionJson);
      writePending({
        donationId: started.donationId.toString(),
        causeId: cause.id.toString(),
      });
      window.location.href = session.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not start your payment. Please try again.",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-ocid="cause.donation.panel"
      className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-subtle"
    >
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Make a donation
        </h2>
        <p className="text-sm text-muted-foreground">
          Secure online payment by card, PayPal or Apple Pay — accepted
          worldwide.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Choose an amount
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESET_AMOUNTS.map((preset) => {
            const value = (Number(preset) / 100).toString();
            const selected = amount === value;
            return (
              <button
                key={value}
                type="button"
                data-ocid={`cause.amount.${value}`}
                aria-pressed={selected}
                onClick={() => setAmount(value)}
                className={cn(
                  "rounded-full border px-3 py-2 font-mono text-sm font-semibold transition-smooth",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/60 hover:bg-muted",
                )}
              >
                {formatCents(preset)}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <Label htmlFor="donation-amount">Amount (USD)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
              $
            </span>
            <Input
              id="donation-amount"
              data-ocid="cause.amount.input"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="50"
              className="pl-7 font-mono"
              aria-invalid={!amountValid}
            />
          </div>
          {!amountValid && amount.trim() !== "" && (
            <p
              data-ocid="cause.amount.error_state"
              className="text-sm text-destructive"
            >
              Enter a valid amount greater than zero.
            </p>
          )}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="donor-name">Your name (optional)</Label>
        <Input
          id="donor-name"
          data-ocid="cause.donor_name.input"
          value={donorName}
          onChange={(event) => setDonorName(event.target.value)}
          placeholder="Shown on the donor list"
          disabled={anonymous}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="donor-message">Message (optional)</Label>
        <Textarea
          id="donor-message"
          data-ocid="cause.message.textarea"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Share a word of encouragement"
          rows={3}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
        <input
          type="checkbox"
          data-ocid="cause.anonymous.checkbox"
          checked={anonymous}
          onChange={(event) => setAnonymous(event.target.checked)}
          className="size-4 accent-[oklch(0.55_0.155_38)]"
        />
        <span className="text-sm text-foreground">
          Give anonymously — show me as “Anonymous”
        </span>
      </label>

      {error && (
        <div
          role="alert"
          data-ocid="cause.donation.error_state"
          className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="space-y-2">
            <p>{error}</p>
            <button
              type="button"
              data-ocid="cause.donation.retry_button"
              onClick={() => setError(null)}
              className="font-semibold underline underline-offset-2"
            >
              Dismiss and try again
            </button>
          </div>
        </div>
      )}

      <Button
        type="submit"
        data-ocid="cause.donate.submit_button"
        disabled={startDonation.isPending || !amountValid}
        className="w-full rounded-full bg-primary py-6 text-base font-semibold text-primary-foreground hover:bg-primary/90 hover:shadow-elevated"
      >
        {startDonation.isPending ? (
          <>
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            Starting secure checkout…
          </>
        ) : (
          <>
            <Heart className="size-4" aria-hidden="true" />
            Donate {amountValid ? formatCents(amountCents) : ""}
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        Payments are processed securely by Stripe.
      </p>
    </form>
  );
}

function ConfirmationCard({
  donation,
  onDismiss,
}: {
  donation: DonationView;
  onDismiss: () => void;
}) {
  return (
    <div
      data-ocid="cause.confirmation.success_state"
      className="space-y-4 rounded-xl border border-success/40 bg-success/10 p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-success/20 text-success">
          <CheckCircle2 className="size-5" aria-hidden="true" />
        </span>
        <h2 className="font-display text-xl font-bold text-foreground">
          Thank you for your gift
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Your donation of{" "}
        <span className="font-mono font-semibold text-foreground">
          {formatCents(donation.amountCents)}
        </span>{" "}
        has been recorded. Keep this receipt reference for your records.
      </p>
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Receipt reference
        </p>
        <p
          data-ocid="cause.confirmation.receipt"
          className="mt-1 break-all font-mono text-sm font-semibold text-foreground"
        >
          {donation.receiptRef}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        data-ocid="cause.confirmation.dismiss_button"
        onClick={onDismiss}
        className="rounded-full"
      >
        Done
      </Button>
    </div>
  );
}

/** Public cause detail: story, funding ledger, donation form and donor list. */
export default function CausePage() {
  const { causeId } = routeApi.useParams();
  const parsedId = /^\d+$/.test(causeId) ? BigInt(causeId) : undefined;

  const causeQuery = useCause(parsedId);
  const donationsQuery = useRecentDonations(parsedId, 8n);
  const confirmDonation = useConfirmDonation();

  const [confirmation, setConfirmation] = useState<DonationView | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const cause = causeQuery.data ?? null;

  useEffect(() => {
    if (attemptedRef.current || parsedId === undefined) return;
    const pending = readPending();
    if (!pending || pending.causeId !== parsedId.toString()) return;
    attemptedRef.current = true;
    confirmDonation
      .mutateAsync(BigInt(pending.donationId))
      .then((donation) => {
        clearPending();
        setConfirmation(donation);
      })
      .catch(() => {
        clearPending();
        setConfirmError(
          "We could not confirm your payment automatically. If you were charged, your donation will appear shortly.",
        );
      });
  }, [parsedId, confirmDonation]);

  if (causeQuery.isLoading) return <CauseSkeleton />;

  if (!cause) {
    return (
      <section
        data-ocid="cause.error_state"
        className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 py-24 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertCircle className="size-7" aria-hidden="true" />
        </span>
        <h1 className="font-display text-3xl font-bold text-foreground">
          This cause is not available
        </h1>
        <p className="text-muted-foreground">
          The cause you are looking for may have been closed or the link may be
          incorrect.
        </p>
        <Button
          asChild
          className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
        >
          <Link to="/" hash="causes" data-ocid="cause.back_button">
            Browse all causes
          </Link>
        </Button>
      </section>
    );
  }

  const tone = causeTone(cause);
  const donations = donationsQuery.data ?? [];

  return (
    <article data-ocid="cause.page" className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <Link
          to="/"
          hash="causes"
          data-ocid="cause.back_link"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All causes
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div className="space-y-8">
            <div className="overflow-hidden rounded-xl border border-border bg-muted shadow-subtle">
              <img
                src={cause.imageRef || "/assets/images/placeholder.svg"}
                alt={cause.title}
                className="aspect-[3/2] w-full object-cover"
              />
            </div>

            <div className="space-y-4">
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                {cause.title}
              </h1>
              <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
                {cause.description}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-subtle">
              <FundingLedger
                goalCents={cause.goalCents}
                raisedCents={cause.raisedCents}
                tone={tone}
              />
            </div>

            <section aria-labelledby="donors-heading" className="space-y-4">
              <h2
                id="donors-heading"
                className="font-display text-2xl font-bold tracking-tight text-foreground"
              >
                Recent supporters
              </h2>
              {donationsQuery.isLoading ? (
                <div
                  data-ocid="cause.donors.loading_state"
                  className="space-y-3"
                >
                  {Array.from(
                    { length: 3 },
                    (_, i) => `donor-skeleton-${i}`,
                  ).map((id) => (
                    <Skeleton key={id} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <DonorList donations={donations} />
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            {confirmation ? (
              <ConfirmationCard
                donation={confirmation}
                onDismiss={() => setConfirmation(null)}
              />
            ) : (
              <DonationForm cause={cause} />
            )}

            {confirmError && (
              <div
                role="alert"
                data-ocid="cause.confirmation.error_state"
                className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p>{confirmError}</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </article>
  );
}
