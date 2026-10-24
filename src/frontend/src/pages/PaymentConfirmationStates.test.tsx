import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, DonationView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import { parseCheckoutSession } from "@/lib/payment";
import { router } from "@/router";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("parseCheckoutSession edge cases", () => {
  it("rejects a session whose url is not a string", () => {
    expect(() =>
      parseCheckoutSession(JSON.stringify({ id: "cs_1", url: 42 })),
    ).toThrow("Payment session is missing a checkout link.");
  });

  it("rejects a session whose url is an empty string", () => {
    expect(() =>
      parseCheckoutSession(JSON.stringify({ id: "cs_1", url: "" })),
    ).toThrow("Payment session is missing a checkout link.");
  });

  it("defaults a missing id to an empty string while keeping the url", () => {
    expect(
      parseCheckoutSession(JSON.stringify({ url: "https://pay.example/1" })),
    ).toEqual({ id: "", url: "https://pay.example/1" });
  });
});

describe("payment success page confirming state", () => {
  it("shows the recording state while the confirmation is in flight", async () => {
    window.sessionStorage.setItem(
      "cg.pendingDonation",
      JSON.stringify({ donationId: "21", causeId: "1" }),
    );
    // A confirmation that never settles keeps the page in its pending state.
    const confirmDonation = vi.fn<backendInterface["confirmDonation"]>(
      () => new Promise<DonationView>(() => {}),
    );
    const actor = actorWith({ confirmDonation });

    window.history.pushState({}, "", "/payment-success");
    await router.navigate({ to: "/payment-success" });
    renderWithActor(<App />, actor);

    expect(
      await screen.findByTestId("payment.confirming_state"),
    ).toBeInTheDocument();
    expect(confirmDonation).toHaveBeenCalledWith(21n);
    // No receipt is shown until the confirmation resolves.
    expect(screen.queryByTestId("payment.receipt")).toBeNull();
  });
});

describe("cause page confirmation dismissal", () => {
  it("returns to the donation form when the donor dismisses the receipt", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(
      "cg.pendingDonation",
      JSON.stringify({ donationId: "9", causeId: "1" }),
    );
    const confirmDonation = vi.fn<backendInterface["confirmDonation"]>(
      async () =>
        makeDonation({
          id: 9n,
          receiptRef: "cs_receipt_9",
          amountCents: 12_000n,
        }),
    );
    const actor = actorWith({ confirmDonation });

    window.history.pushState({}, "", "/causes/1");
    await router.navigate({ to: "/causes/$causeId", params: { causeId: "1" } });
    renderWithActor(<App />, actor);

    expect(
      await screen.findByTestId("cause.confirmation.receipt"),
    ).toHaveTextContent("cs_receipt_9");

    await user.click(screen.getByTestId("cause.confirmation.dismiss_button"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("cause.confirmation.success_state"),
      ).toBeNull();
    });
    // The donation form is available again for another gift.
    expect(screen.getByTestId("cause.donation.panel")).toBeInTheDocument();
  });
});
