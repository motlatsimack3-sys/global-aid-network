import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import { router } from "@/router";
import { screen } from "@testing-library/react";
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
    listCauses: vi.fn<backendInterface["listCauses"]>(async () => []),
    ...overrides,
  };
}

afterEach(() => {
  window.history.pushState({}, "", "/");
  window.sessionStorage.clear();
});

describe("payment return routes", () => {
  it("shows an error and a retry action when a payment is cancelled", async () => {
    window.history.pushState({}, "", "/payment-failure");
    await router.navigate({ to: "/payment-failure" });

    renderWithActor(<App />, actorWith());

    expect(
      await screen.findByTestId("payment.error_state"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Your payment was not completed" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("payment.retry_button")).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows a confirmation state after a successful payment", async () => {
    window.history.pushState({}, "", "/payment-success");
    await router.navigate({ to: "/payment-success" });

    renderWithActor(<App />, actorWith());

    expect(
      await screen.findByTestId("payment.success_state"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Thank you for your generosity" }),
    ).toBeInTheDocument();
  });
});

describe("shareable cause link", () => {
  it("opens directly on the cause page for the shared id", async () => {
    const getCause = vi.fn<backendInterface["getCause"]>(async () =>
      makeCause({ id: 2n, title: "Africa Water, Food & Medicine" }),
    );
    window.history.pushState({}, "", "/causes/2");
    await router.navigate({ to: "/causes/$causeId", params: { causeId: "2" } });

    renderWithActor(<App />, actorWith({ getCause }));

    expect(
      await screen.findByRole("heading", {
        name: "Africa Water, Food & Medicine",
      }),
    ).toBeInTheDocument();
    expect(getCause).toHaveBeenCalledWith(2n);
  });
});
