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

describe("responsive navigation", () => {
  it("opens the mobile menu and navigates to a cause section", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/");
    await router.navigate({ to: "/" });

    renderWithActor(<App />, actorWith());

    const toggle = await screen.findByTestId("nav.menu_toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });
    expect(mobileNav).toBeInTheDocument();
    expect(screen.getByTestId("nav.mobile_causes_link")).toBeInTheDocument();

    await user.click(screen.getByTestId("nav.mobile_causes_link"));

    await waitFor(() => {
      expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();
    });
  });
});

describe("donation confirmation failure", () => {
  it("shows a recoverable error when confirmation cannot complete", async () => {
    window.sessionStorage.setItem(
      "cg.pendingDonation",
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

    const alert = await screen.findByTestId("cause.confirmation.error_state");
    expect(alert).toHaveTextContent(
      "We could not confirm your payment automatically",
    );
    expect(confirmDonation).toHaveBeenCalledWith(9n);
    // The cause total is unchanged: still the original raised amount.
    expect(screen.getByText("$25,000")).toBeInTheDocument();
  });
});
