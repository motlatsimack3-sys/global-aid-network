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

function actorWith(
  overrides: Partial<
    Pick<backendInterface, "listCauses" | "listRecentDonations">
  >,
) {
  return {
    listCauses: vi.fn<backendInterface["listCauses"]>(async () => []),
    listRecentDonations: vi.fn<backendInterface["listRecentDonations"]>(
      async () => [],
    ),
    ...overrides,
  } satisfies Pick<backendInterface, "listCauses" | "listRecentDonations">;
}

async function renderHome(
  actor: Pick<backendInterface, "listCauses" | "listRecentDonations">,
) {
  window.history.pushState({}, "", "/");
  await router.navigate({ to: "/" });
  return renderWithActor(<App />, actor);
}

afterEach(() => {
  window.history.pushState({}, "", "/");
});

describe("HomePage", () => {
  it("renders both active causes with their funding progress", async () => {
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

    await renderHome(actor);

    expect(
      await screen.findByRole("heading", { name: "Nepal Earthquake Relief" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Africa Water, Food & Medicine" }),
    ).toBeInTheDocument();

    const nepalCard = screen.getByTestId("cause.card.1");
    expect(within(nepalCard).getByText("$100,000")).toBeInTheDocument();
    expect(within(nepalCard).getByText("$25,000")).toBeInTheDocument();
    expect(
      within(nepalCard).getByRole("progressbar", { name: "Funding progress" }),
    ).toHaveAttribute("aria-valuenow", "25");

    const africaCard = screen.getByTestId("cause.card.2");
    expect(within(africaCard).getByText("$200,000")).toBeInTheDocument();
    expect(within(africaCard).getByText("$50,000")).toBeInTheDocument();
  });

  it("shows a Donate call to action and a shareable link per cause", async () => {
    const actor = actorWith({
      listCauses: vi.fn<backendInterface["listCauses"]>(async () => [
        makeCause(),
      ]),
    });

    await renderHome(actor);

    expect(
      await screen.findByRole("heading", { name: "Nepal Earthquake Relief" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("home.donate_button")).toBeInTheDocument();
    expect(screen.getByTestId("cause.share_button.1")).toBeInTheDocument();

    const supportLink = screen.getByTestId("cause.support_button.1");
    expect(supportLink).toHaveAttribute("href", "/causes/1");
  });

  it("shows recent supporters with donor name, amount and date", async () => {
    const actor = actorWith({
      listCauses: vi.fn<backendInterface["listCauses"]>(async () => [
        makeCause(),
      ]),
      listRecentDonations: vi.fn<backendInterface["listRecentDonations"]>(
        async () => [
          makeDonation({ donorDisplayName: "Ada", amountCents: 5_000n }),
          makeDonation({
            id: 2n,
            donorDisplayName: "Anonymous",
            amountCents: 10_000n,
          }),
        ],
      ),
    });

    await renderHome(actor);

    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
    expect(screen.getByText("$50")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("shows an empty state when no causes are published", async () => {
    const actor = actorWith({});

    await renderHome(actor);

    expect(
      await screen.findByTestId("home.causes_empty_state"),
    ).toBeInTheDocument();
  });
});
