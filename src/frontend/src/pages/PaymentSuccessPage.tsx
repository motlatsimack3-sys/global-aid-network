import type { DonationView } from "@/backend";
import { Button } from "@/components/ui/button";
import { useConfirmDonation } from "@/hooks/useQueries";
import { formatCents } from "@/lib/format";
import { clearPending, readPending } from "@/lib/payment";
import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Shown after Stripe redirects back from a completed checkout. Confirms the
 * pending donation so the cause total, progress bar and donor list update, and
 * shows the receipt reference.
 */
export default function PaymentSuccessPage() {
  const confirmDonation = useConfirmDonation();
  const [donation, setDonation] = useState<DonationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    const pending = readPending();
    if (!pending) return;
    attemptedRef.current = true;
    confirmDonation
      .mutateAsync(BigInt(pending.donationId))
      .then((confirmed) => {
        clearPending();
        setDonation(confirmed);
      })
      .catch(() => {
        clearPending();
        setError(
          "We could not confirm your payment automatically. If you were charged, your donation will appear shortly.",
        );
      });
  }, [confirmDonation]);

  const confirming = confirmDonation.isPending && !donation && !error;

  return (
    <section
      data-ocid="payment.success_state"
      className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-20 text-center md:py-28"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="size-8" aria-hidden="true" />
      </span>
      <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
        Thank you for your generosity
      </h1>

      {confirming && (
        <p
          data-ocid="payment.confirming_state"
          className="flex items-center gap-2 text-lg text-muted-foreground"
        >
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Recording your donation…
        </p>
      )}

      {donation && (
        <div className="w-full space-y-4 rounded-xl border border-success/40 bg-success/10 p-6 text-left">
          <p className="text-sm text-muted-foreground">
            Your donation of{" "}
            <span className="font-mono font-semibold text-foreground">
              {formatCents(donation.amountCents)}
            </span>{" "}
            has been recorded. Your gift goes directly to relief work on the
            ground — thank you for standing with these communities.
          </p>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Receipt reference
            </p>
            <p
              data-ocid="payment.receipt"
              className="mt-1 break-all font-mono text-sm font-semibold text-foreground"
            >
              {donation.receiptRef}
            </p>
          </div>
        </div>
      )}

      {!confirming && !donation && (
        <p className="max-w-lg text-lg text-muted-foreground">
          Your donation has been received. Your gift goes directly to relief
          work on the ground — thank you for standing with these communities.
        </p>
      )}

      {error && (
        <div
          role="alert"
          data-ocid="payment.error_state"
          className="flex w-full items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-left text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <Button
        asChild
        className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
      >
        <Link to="/" data-ocid="payment.home_button">
          Back to causes
        </Link>
      </Button>
    </section>
  );
}
