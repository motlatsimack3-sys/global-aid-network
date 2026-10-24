import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, DonationView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import {
  PENDING_KEY,
  clearPending,
  parseCheckoutSession,
  readPending,
  writePending,
} from "@/lib/payment";
import { router } from "@/router";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

function makeCause(overrides: Partial<CauseView> = {}): CauseView {
  return {
    id: 1n,
    status: CauseStatus.published,
    title: "Nepal Earthquake Relief",
    createdAt: 1_700_000_000_000_000_000n,
    description: "Rebuilding homes for families who lost everything.",
    goalCents: 100_000_00n,
    imageRef: "/assets/images/nepal.jpg",
    raisedCents: 25_000_00n,
    progressBps: 2_500n,
    ...overrides,
  };
}

function makeDonation(overrides: Partial<DonationView> = {}): DonationView {
  return {
    id: 1n,
    receiptRef: "cs_test_1",
    createdAt: 1_700_000_000_000_000_000n,
    amountCents: 5_000n,
    causeId: 1n,
    donorDisplayName: "Ada",
    ...overrides,
  };
}

type PublicActor = Pick<
  backendInterface,
  "getCause" | "listRecentDonations" | "listCauses" | "confirmDonation"
>;

function actorWith(overrides: Partial<PublicActor> = {}): PublicActor {
  return {
    getCause: vi.fn<backendInterface["getCause"]>(async () => makeCause()),
    listRecentDonations: vi.fn<backendInterface["listRecentDonations"]>(
      async () => [],
    ),
    listCauses: vi.fn<backendInterface["listCauses"]>(async () => []),
    confirmDonation: vi.fn<backendInterface["confirmDonation"]>(async () =>
      makeDonation(),
    ),
    ...overrides,
  };
}

afterEach(() => {
  window.history.pushState({}, "", "/");
  window.sessionStorage.clear();
});

describe("pending donation storage", () => {
  it("round-trips a pending donation through sessionStorage", () => {
    writePending({ donationId: "42", causeId: "7" });
    expect(readPending()).toEqual({ donationId: "42", causeId: "7" });
    clearPending();
    expect(readPending()).toBeNull();
  });

  it("ignores malformed or incomplete stored pending data", () => {
    window.sessionStorage.setItem(PENDING_KEY, "not-json");
    expect(readPending()).toBeNull();

    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ donationId: "42" }),
    );
    expect(readPending()).toBeNull();
  });
});

describe("parseCheckoutSession", () => {
  it("returns the id and url from a valid session", () => {
    expect(
      parseCheckoutSession(JSON.stringify({ id: "cs_1", url: "https://x/1" })),
    ).toEqual({ id: "cs_1", url: "https://x/1" });
  });

  it("rejects unreadable JSON and a session without a link", () => {
    expect(() => parseCheckoutSession("not-json")).toThrow(
      "Payment session could not be read. Please try again.",
    );
    expect(() => parseCheckoutSession(JSON.stringify({ id: "cs_1" }))).toThrow(
      "Payment session is missing a checkout link.",
    );
  });
});

describe("payment success page without a pending donation", () => {
  it("shows the generic thank-you without a receipt and does not confirm", async () => {
    const confirmDonation = vi.fn<backendInterface["confirmDonation"]>(
      async () => makeDonation(),
    );
    const actor = actorWith({ confirmDonation });

    window.history.pushState({}, "", "/payment-success");
    await router.navigate({ to: "/payment-success" });
    renderWithActor(<App />, actor);

    expect(
      await screen.findByTestId("payment.success_state"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("payment.receipt")).toBeNull();
    expect(confirmDonation).not.toHaveBeenCalled();
  });
});

describe("cause page pending donation for another cause", () => {
  it("does not confirm a pending donation that belongs to a different cause", async () => {
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ donationId: "9", causeId: "2" }),
    );
    const confirmDonation = vi.fn<backendInterface["confirmDonation"]>(
      async () => makeDonation(),
    );
    const actor = actorWith({ confirmDonation });

    window.history.pushState({}, "", "/causes/1");
    await router.navigate({ to: "/causes/$causeId", params: { causeId: "1" } });
    renderWithActor(<App />, actor);

    await screen.findByTestId("cause.donation.panel");
    await waitFor(() => {
      expect(confirmDonation).not.toHaveBeenCalled();
    });
    // The unrelated pending marker is left untouched for its own cause page.
    expect(readPending()).toEqual({ donationId: "9", causeId: "2" });
  });
});
