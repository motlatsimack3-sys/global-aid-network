import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, DonationView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import { PENDING_KEY, readPending } from "@/lib/payment";
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

type ConfirmActor = Pick<
  backendInterface,
  "getCause" | "listRecentDonations" | "listCauses" | "confirmDonation"
>;

function actorWith(overrides: Partial<ConfirmActor> = {}): ConfirmActor {
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

describe("pending marker cleanup after a successful confirmation", () => {
  it("clears the pending marker on the cause page so a reload does not re-confirm", async () => {
    // A completed payment leaves a pending marker. Once the cause page confirms
    // it, the marker must be cleared: otherwise a reload would confirm the same
    // donation again and double-count it against the cause total.
    window.sessionStorage.setItem(
      PENDING_KEY,
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
    expect(confirmDonation).toHaveBeenCalledWith(9n);
    await waitFor(() => {
      expect(readPending()).toBeNull();
    });
  });

  it("confirms a pending donation on the success route and clears the marker", async () => {
    // The success route is global, so it confirms whatever pending donation the
    // checkout left behind, regardless of which cause it belongs to.
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ donationId: "31", causeId: "2" }),
    );
    const confirmDonation = vi.fn<backendInterface["confirmDonation"]>(
      async () =>
        makeDonation({
          id: 31n,
          causeId: 2n,
          receiptRef: "cs_success_31",
          amountCents: 8_000n,
        }),
    );
    const actor = actorWith({ confirmDonation });

    window.history.pushState({}, "", "/payment-success");
    await router.navigate({ to: "/payment-success" });
    renderWithActor(<App />, actor);

    expect(await screen.findByTestId("payment.receipt")).toHaveTextContent(
      "cs_success_31",
    );
    expect(confirmDonation).toHaveBeenCalledWith(31n);
    await waitFor(() => {
      expect(readPending()).toBeNull();
    });
  });
});
