import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import { donationShoppingItem, paymentReturnUrls } from "@/lib/payment";
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

type DonationActor = Pick<
  backendInterface,
  "getCause" | "listRecentDonations" | "listCauses" | "startDonation"
>;

function actorWith(overrides: Partial<DonationActor> = {}): DonationActor {
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
    ...overrides,
  };
}

async function renderCausePage(actor: DonationActor) {
  window.history.pushState({}, "", "/causes/1");
  await router.navigate({ to: "/causes/$causeId", params: { causeId: "1" } });
  return renderWithActor(<App />, actor);
}

afterEach(() => {
  window.history.pushState({}, "", "/");
  window.sessionStorage.clear();
});

describe("donation amount validation", () => {
  it("shows an inline error and blocks submit for a non-positive amount", async () => {
    const user = userEvent.setup();
    const startDonation = vi.fn<backendInterface["startDonation"]>(
      async () => ({
        donationId: 1n,
        sessionJson: JSON.stringify({
          id: "cs_1",
          url: "https://pay.example/1",
        }),
      }),
    );
    const actor = actorWith({ startDonation });

    await renderCausePage(actor);

    const amountInput = await screen.findByTestId("cause.amount.input");
    await user.clear(amountInput);
    await user.type(amountInput, "0");

    expect(
      await screen.findByTestId("cause.amount.error_state"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("cause.donate.submit_button")).toBeDisabled();
    expect(startDonation).not.toHaveBeenCalled();
  });

  it("selects a preset amount and submits it as cents", async () => {
    const user = userEvent.setup();
    const startDonation = vi.fn<backendInterface["startDonation"]>(
      async () => ({
        donationId: 2n,
        sessionJson: JSON.stringify({
          id: "cs_2",
          url: "https://pay.example/2",
        }),
      }),
    );
    const actor = actorWith({ startDonation });

    await renderCausePage(actor);

    await screen.findByTestId("cause.amount.input");
    await user.click(screen.getByTestId("cause.amount.250"));
    await user.click(screen.getByTestId("cause.donate.submit_button"));

    await waitFor(() => {
      expect(startDonation).toHaveBeenCalledWith(
        expect.objectContaining({ causeId: 1n, amountCents: 25_000n }),
      );
    });
  });
});

describe("payment helpers", () => {
  it("builds a single-quantity USD line item for the cause", () => {
    expect(donationShoppingItem("Nepal Earthquake Relief", 7_500n)).toEqual({
      currency: "usd",
      productName: "Donation — Nepal Earthquake Relief",
      productDescription:
        "Humanitarian relief donation to Nepal Earthquake Relief",
      priceInCents: 7_500n,
      quantity: 1n,
    });
  });

  it("returns absolute success and cancel URLs on the current origin", () => {
    const { successUrl, cancelUrl } = paymentReturnUrls();
    expect(successUrl).toBe(
      `${window.location.protocol}//${window.location.host}/payment-success`,
    );
    expect(cancelUrl).toBe(
      `${window.location.protocol}//${window.location.host}/payment-failure`,
    );
  });
});
