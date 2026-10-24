import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, DonationView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import { PENDING_KEY, readPending } from "@/lib/payment";
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

type RetryActor = Pick<
  backendInterface,
  | "getCause"
  | "listRecentDonations"
  | "listCauses"
  | "startDonation"
  | "confirmDonation"
>;

function actorWith(overrides: Partial<RetryActor> = {}): RetryActor {
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

async function renderCausePage(actor: RetryActor) {
  window.history.pushState({}, "", "/causes/1");
  await router.navigate({ to: "/causes/$causeId", params: { causeId: "1" } });
  return renderWithActor(<App />, actor);
}

afterEach(() => {
  window.history.pushState({}, "", "/");
  window.sessionStorage.clear();
});

describe("retry after a failed payment confirmation", () => {
  it("keeps the donation form usable so the visitor can give again", async () => {
    // A pending donation whose confirmation fails must not strand the visitor:
    // the error is shown and the donation form stays available to retry.
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

    await renderCausePage(actor);

    expect(
      await screen.findByTestId("cause.confirmation.error_state"),
    ).toBeInTheDocument();
    // The form is still rendered, so a retry is possible without a reload.
    expect(screen.getByTestId("cause.donation.panel")).toBeInTheDocument();
    expect(
      screen.getByTestId("cause.donate.submit_button"),
    ).toBeInTheDocument();
    // The stale marker is cleared so a reload does not re-trigger confirmation.
    await waitFor(() => {
      expect(readPending()).toBeNull();
    });
  });

  it("lets the visitor start a fresh donation after a failed confirmation", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ donationId: "9", causeId: "1" }),
    );
    const confirmDonation = vi.fn<backendInterface["confirmDonation"]>(
      async () => {
        throw new Error("Payment not completed: card_declined");
      },
    );
    const startDonation = vi.fn<backendInterface["startDonation"]>(
      async () => ({
        donationId: 10n,
        sessionJson: JSON.stringify({
          id: "cs_10",
          url: "https://pay.example/10",
        }),
      }),
    );
    const actor = actorWith({ confirmDonation, startDonation });

    await renderCausePage(actor);

    await screen.findByTestId("cause.confirmation.error_state");
    await user.click(screen.getByTestId("cause.donate.submit_button"));

    await waitFor(() => {
      expect(startDonation).toHaveBeenCalledWith(
        expect.objectContaining({ causeId: 1n, amountCents: 5_000n }),
      );
    });
  });
});
