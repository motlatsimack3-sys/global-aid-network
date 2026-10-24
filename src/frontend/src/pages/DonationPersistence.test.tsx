import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, DonationView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import { router } from "@/router";
import { screen, waitFor, within } from "@testing-library/react";
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
    listCauses: vi.fn<backendInterface["listCauses"]>(async () => [
      makeCause(),
    ]),
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

describe("donation totals persist across reloads", () => {
  it("shows the increased total and donor on a fresh mount after a completed payment", async () => {
    // A completed donation has already been recorded on the backend. A fresh
    // page load (no pending marker) must read the persisted total and donor
    // list, so every visitor sees the updated progress.
    const getCause = vi.fn<backendInterface["getCause"]>(async () =>
      makeCause({ raisedCents: 37_000_00n, progressBps: 3_700n }),
    );
    const listRecentDonations = vi.fn<backendInterface["listRecentDonations"]>(
      async () => [
        makeDonation({
          id: 9n,
          receiptRef: "cs_receipt_9",
          amountCents: 12_000n,
          donorDisplayName: "Grace",
        }),
      ],
    );
    const actor = actorWith({ getCause, listRecentDonations });

    window.history.pushState({}, "", "/causes/1");
    await router.navigate({ to: "/causes/$causeId", params: { causeId: "1" } });
    renderWithActor(<App />, actor);

    expect(await screen.findByText("$37,000")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Funding progress" }),
    ).toHaveAttribute("aria-valuenow", "37");

    const donorList = await screen.findByTestId("cause.donors.list");
    expect(within(donorList).getByText("Grace")).toBeInTheDocument();
    expect(within(donorList).getByText("$120")).toBeInTheDocument();
    // No pending marker means no confirmation call is made on a plain reload.
    expect(actor.confirmDonation).not.toHaveBeenCalled();
  });

  it("shows the persisted total on the landing page for all visitors", async () => {
    const listCauses = vi.fn<backendInterface["listCauses"]>(async () => [
      makeCause({ raisedCents: 37_000_00n, progressBps: 3_700n }),
    ]);
    const actor = actorWith({ listCauses });

    window.history.pushState({}, "", "/");
    await router.navigate({ to: "/" });
    renderWithActor(<App />, actor);

    const card = await screen.findByTestId("cause.card.1");
    expect(within(card).getByText("$37,000")).toBeInTheDocument();
    expect(
      within(card).getByRole("progressbar", { name: "Funding progress" }),
    ).toHaveAttribute("aria-valuenow", "37");
  });
});
