import type { ShoppingItem } from "@/backend";

/** Stripe checkout session shape returned by the backend as JSON. */
export type CheckoutSession = {
  id: string;
  url: string;
};

/** Parse the backend's session JSON and require a usable redirect URL. */
export function parseCheckoutSession(sessionJson: string): CheckoutSession {
  let parsed: unknown;
  try {
    parsed = JSON.parse(sessionJson);
  } catch {
    throw new Error("Payment session could not be read. Please try again.");
  }
  const session = parsed as Partial<CheckoutSession> | null;
  if (!session || typeof session.url !== "string" || session.url.length === 0) {
    throw new Error("Payment session is missing a checkout link.");
  }
  return { id: session.id ?? "", url: session.url };
}

/** Build the Stripe line item for a single cause donation. */
export function donationShoppingItem(
  causeTitle: string,
  amountCents: bigint,
): ShoppingItem {
  return {
    currency: "usd",
    productName: `Donation — ${causeTitle}`,
    productDescription: `Humanitarian relief donation to ${causeTitle}`,
    priceInCents: amountCents,
    quantity: 1n,
  };
}

/** Absolute success and cancel URLs for the Stripe redirect. */
export function paymentReturnUrls(): { successUrl: string; cancelUrl: string } {
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  return {
    successUrl: `${baseUrl}/payment-success`,
    cancelUrl: `${baseUrl}/payment-failure`,
  };
}

/** sessionStorage key holding the pending donation awaiting confirmation. */
export const PENDING_KEY = "cg.pendingDonation";

/** A donation started at checkout that still needs to be confirmed. */
export type PendingDonation = { donationId: string; causeId: string };

/** Read the pending donation left behind before the Stripe redirect. */
export function readPending(): PendingDonation | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingDonation>;
    if (
      typeof parsed.donationId !== "string" ||
      typeof parsed.causeId !== "string"
    )
      return null;
    return { donationId: parsed.donationId, causeId: parsed.causeId };
  } catch {
    return null;
  }
}

/** Persist the pending donation so the return page can confirm it. */
export function writePending(pending: PendingDonation): void {
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* storage unavailable — confirmation falls back to the success page */
  }
}

/** Clear the pending donation once it has been confirmed or abandoned. */
export function clearPending(): void {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
