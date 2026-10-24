import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, DonationView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import { router } from "@/router";
import { screen, within } from "@testing-library/react";
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
  "getCause" | "listRecentDonations" | "listCauses"
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
    ...overrides,
  };
}

afterEach(() => {
  window.history.pushState({}, "", "/");
  window.sessionStorage.clear();
});

describe("public donor list", () => {
  it("shows the donor's optional message alongside name, amount and date", async () => {
    const actor = actorWith({
      listRecentDonations: vi.fn<backendInterface["listRecentDonations"]>(
        async () => [
          makeDonation({
            donorDisplayName: "Ada",
            amountCents: 5_000n,
            message: "Stay strong, Nepal.",
          }),
        ],
      ),
    });
    window.history.pushState({}, "", "/causes/1");
    await router.navigate({ to: "/causes/$causeId", params: { causeId: "1" } });

    renderWithActor(<App />, actor);

    const donorList = await screen.findByTestId("cause.donors.list");
    expect(within(donorList).getByText("Ada")).toBeInTheDocument();
    expect(
      within(donorList).getByText("Stay strong, Nepal."),
    ).toBeInTheDocument();
    expect(within(donorList).getByText("$50")).toBeInTheDocument();
    expect(within(donorList).getByText("Nov 14, 2023")).toBeInTheDocument();
  });

  it("shows an empty state when a cause has no donations yet", async () => {
    const actor = actorWith();
    window.history.pushState({}, "", "/causes/1");
    await router.navigate({ to: "/causes/$causeId", params: { causeId: "1" } });

    renderWithActor(<App />, actor);

    expect(
      await screen.findByTestId("cause.donors.empty_state"),
    ).toBeInTheDocument();
  });
});

describe("default route", () => {
  it("loads the landing page without a blank screen and shows both causes", async () => {
    const nepal = makeCause();
    const africa = makeCause({
      id: 2n,
      title: "Africa Water, Food & Medicine",
      description: "Clean water, food and medicine for communities in need.",
      goalCents: 200_000_00n,
      raisedCents: 50_000_00n,
      progressBps: 2_500n,
    });
    const actor = actorWith({
      listCauses: vi.fn<backendInterface["listCauses"]>(async () => [
        nepal,
        africa,
      ]),
    });
    window.history.pushState({}, "", "/");
    await router.navigate({ to: "/" });

    renderWithActor(<App />, actor);

    expect(await screen.findByTestId("home.page")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Nepal Earthquake Relief" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Africa Water, Food & Medicine" }),
    ).toBeInTheDocument();
  });
});
