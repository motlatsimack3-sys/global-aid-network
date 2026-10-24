import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

/** Shown when a Stripe checkout is cancelled or fails. */
export default function PaymentFailurePage() {
  return (
    <section
      data-ocid="payment.error_state"
      className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-20 text-center md:py-28"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertCircle className="size-8" aria-hidden="true" />
      </span>
      <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
        Your payment was not completed
      </h1>
      <p className="max-w-lg text-lg text-muted-foreground">
        No charge was made. You can return to the cause and try again whenever
        you are ready.
      </p>
      <Button
        asChild
        className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
      >
        <Link to="/" data-ocid="payment.retry_button">
          Try again
        </Link>
      </Button>
    </section>
  );
}
