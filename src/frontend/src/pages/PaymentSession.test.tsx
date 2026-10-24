import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, DonationView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
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

type PaymentActor = Pick<
  backendInterface,
  | "getCause"
  | "listRecentDonations"
  | "listCauses"
  | "startDonation"
  | "confirmDonation"
>;

function actorWith(overrides: Partial<PaymentActor> = {}): PaymentActor {
  return {
    getCause: vi.fn<backendInterface["getCause"]>(async () => makeCause()),
    listRecentDonations: vi.fn<backendInterface["listRecentDonations"]>(
      async () => [],
    ),
    listCauses: vi.fn<backendInterface["listCauses"]>(async () => []),
    startDonation: vi.fn<backendInterface["startDonation"]>(async () => ({
      donationId: 1n,
      sessionJson: JSON.stringify({ id: "cs_1", url: "https://pay.example/1" }),
    })),
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

describe("checkout session handoff", () => {
  it("shows a retryable error when the backend returns an unreadable session", async () => {
    const user = userEvent.setup();
    // A successful startDonation whose session JSON cannot be parsed must not
    // navigate away; the visitor sees an error and can retry.
    const startDonation = vi.fn<backendInterface["startDonation"]>(
      async () => ({
        donationId: 3n,
        sessionJson: "not-json",
      }),
    );
    const actor = actorWith({ startDonation });

    window.history.pushState({}, "", "/causes/1");
    await router.navigate({ to: "/causes/$causeId", params: { causeId: "1" } });
    renderWithActor(<App />, actor);

    await screen.findByTestId("cause.amount.input");
    await user.click(screen.getByTestId("cause.donate.submit_button"));

    const alert = await screen.findByTestId("cause.donation.error_state");
    expect(alert).toHaveTextContent(
      "Payment session could not be read. Please try again.",
    );
    expect(
      screen.getByTestId("cause.donation.retry_button"),
    ).toBeInTheDocument();
    // No pending donation was stored, so nothing is left half-confirmed.
    expect(window.sessionStorage.getItem("cg.pendingDonation")).toBeNull();
  });

  it("shows a retryable error when the session has no checkout link", async () => {
    const user = userEvent.setup();
    const startDonation = vi.fn<backendInterface["startDonation"]>(
      async () => ({
        donationId: 4n,
        sessionJson: JSON.stringify({ id: "cs_4" }),
      }),
    );
    const actor = actorWith({ startDonation });

    window.history.pushState({}, "", "/causes/1");
    await router.navigate({ to: "/causes/$causeId", params: { causeId: "1" } });
    renderWithActor(<App />, actor);

    await screen.findByTestId("cause.amount.input");
    await user.click(screen.getByTestId("cause.donate.submit_button"));

    const alert = await screen.findByTestId("cause.donation.error_state");
    expect(alert).toHaveTextContent(
      "Payment session is missing a checkout link.",
    );
  });
});

describe("payment success page confirmation", () => {
  it("confirms the pending donation and shows its receipt reference", async () => {
    window.sessionStorage.setItem(
      "cg.pendingDonation",
      JSON.stringify({ donationId: "11", causeId: "1" }),
    );
    const confirmDonation = vi.fn<backendInterface["confirmDonation"]>(
      async () =>
        makeDonation({
          id: 11n,
          receiptRef: "cs_success_11",
          amountCents: 20_000n,
        }),
    );
    const actor = actorWith({ confirmDonation });

    window.history.pushState({}, "", "/payment-success");
    await router.navigate({ to: "/payment-success" });
    renderWithActor(<App />, actor);

    const receipt = await screen.findByTestId("payment.receipt");
    expect(receipt).toHaveTextContent("cs_success_11");
    expect(confirmDonation).toHaveBeenCalledWith(11n);
    // The pending marker is cleared once confirmed.
    await waitFor(() => {
      expect(window.sessionStorage.getItem("cg.pendingDonation")).toBeNull();
    });
  });

  it("shows a recoverable error when the success page cannot confirm", async () => {
    window.sessionStorage.setItem(
      "cg.pendingDonation",
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

    const alert = await screen.findByTestId("payment.error_state");
    expect(alert).toHaveTextContent(
      "We could not confirm your payment automatically",
    );
    expect(confirmDonation).toHaveBeenCalledWith(12n);
  });
});
