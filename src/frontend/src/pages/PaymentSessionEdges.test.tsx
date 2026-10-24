import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, DonationView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import { PENDING_KEY, parseCheckoutSession, readPending } from "@/lib/payment";
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

describe("parseCheckoutSession array payload", () => {
  it("rejects a JSON array as a missing checkout link", () => {
    // An array parses to an object without a url, so it must be rejected the
    // same way a bare object without a link is.
    expect(() => parseCheckoutSession("[]")).toThrow(
      "Payment session is missing a checkout link.",
    );
  });
});

describe("cause page confirmation failure keeps the total unchanged", () => {
  it("shows the error, keeps the form usable and leaves the raised total alone", async () => {
    // A pending donation for this cause whose confirmation fails must not move
    // the cause total: the error is shown, the form stays available to retry,
    // and the raised amount is still the pre-donation value.
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ donationId: "9", causeId: "1" }),
    );
    const confirmDonation = vi.fn<backendInterface["confirmDonation"]>(
      async () => {
        throw new Error("Payment not completed: card_declined");
      },
    );
    const actor = actorWith({ confirmDonation });

    window.history.pushState({}, "", "/causes/1");
    await router.navigate({ to: "/causes/$causeId", params: { causeId: "1" } });
    renderWithActor(<App />, actor);

    expect(
      await screen.findByTestId("cause.confirmation.error_state"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("cause.donation.panel")).toBeInTheDocument();
    expect(screen.getByText("$25,000")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Funding progress" }),
    ).toHaveAttribute("aria-valuenow", "25");
    await waitFor(() => {
      expect(readPending()).toBeNull();
    });
  });
});

describe("success page confirmation failure keeps the total unchanged", () => {
  it("shows the error and does not render a receipt", async () => {
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ donationId: "12", causeId: "1" }),
    );
    const confirmDonation = vi.fn<backendInterface["confirmDonation"]>(
      async () => {
        throw new Error("Payment not completed: card_declined");
      },
    );
    const actor = actorWith({ confirmDonation });

    window.history.pushState({}, "", "/payment-success");
    await router.navigate({ to: "/payment-success" });
    renderWithActor(<App />, actor);

    expect(
      await screen.findByTestId("payment.error_state"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("payment.receipt")).toBeNull();
    await waitFor(() => {
      expect(readPending()).toBeNull();
    });
  });
});
