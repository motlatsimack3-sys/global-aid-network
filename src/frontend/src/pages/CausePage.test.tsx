import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, DonationView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import { router } from "@/router";
import { screen, waitFor, within } from "@testing-library/react";
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

type CauseActor = Pick<
  backendInterface,
  | "getCause"
  | "listRecentDonations"
  | "startDonation"
  | "confirmDonation"
  | "listCauses"
>;

function actorWith(overrides: Partial<CauseActor>): CauseActor {
  return {
    getCause: vi.fn<backendInterface["getCause"]>(async () => makeCause()),
    listRecentDonations: vi.fn<backendInterface["listRecentDonations"]>(
      async () => [],
    ),
    startDonation: vi.fn<backendInterface["startDonation"]>(async () => ({
      donationId: 1n,
      sessionJson: JSON.stringify({ id: "cs_1", url: "https://pay.example/1" }),
    })),
    confirmDonation: vi.fn<backendInterface["confirmDonation"]>(async () =>
      makeDonation(),
    ),
    listCauses: vi.fn<backendInterface["listCauses"]>(async () => []),
    ...overrides,
  };
}

async function renderCausePage(actor: CauseActor, causeId = "1") {
  window.history.pushState({}, "", `/causes/${causeId}`);
  await router.navigate({ to: "/causes/$causeId", params: { causeId } });
  return renderWithActor(<App />, actor);
}

afterEach(() => {
  window.history.pushState({}, "", "/");
  window.sessionStorage.clear();
});

describe("CausePage", () => {
  it("shows the cause, funding progress and recent donors", async () => {
    const actor = actorWith({
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

    await renderCausePage(actor);

    expect(
      await screen.findByRole("heading", { name: "Nepal Earthquake Relief" }),
    ).toBeInTheDocument();
    expect(screen.getByText("$100,000")).toBeInTheDocument();
    expect(screen.getByText("$25,000")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Funding progress" }),
    ).toHaveAttribute("aria-valuenow", "25");

    const donorList = await screen.findByTestId("cause.donors.list");
    expect(within(donorList).getByText("Ada")).toBeInTheDocument();
    expect(within(donorList).getByText("Anonymous")).toBeInTheDocument();
  });

  it("lets a visitor enter an amount and reach the payment step", async () => {
    const user = userEvent.setup();
    const startDonation = vi.fn<backendInterface["startDonation"]>(
      async () => ({
        donationId: 7n,
        sessionJson: JSON.stringify({
          id: "cs_7",
          url: "https://pay.example/7",
        }),
      }),
    );
    const actor = actorWith({ startDonation });

    await renderCausePage(actor);

    const amountInput = await screen.findByTestId("cause.amount.input");
    await user.clear(amountInput);
    await user.type(amountInput, "75");
    await user.type(screen.getByTestId("cause.donor_name.input"), "Grace");
    await user.click(screen.getByTestId("cause.donate.submit_button"));

    await waitFor(() => {
      expect(startDonation).toHaveBeenCalledWith({
        causeId: 1n,
        amountCents: 7_500n,
        donorName: "Grace",
        message: undefined,
        successUrl: expect.stringContaining("/payment-success"),
        cancelUrl: expect.stringContaining("/payment-failure"),
      });
    });
  });

  it("omits the donor name when the visitor gives anonymously", async () => {
    const user = userEvent.setup();
    const startDonation = vi.fn<backendInterface["startDonation"]>(
      async () => ({
        donationId: 8n,
        sessionJson: JSON.stringify({
          id: "cs_8",
          url: "https://pay.example/8",
        }),
      }),
    );
    const actor = actorWith({ startDonation });

    await renderCausePage(actor);

    await screen.findByTestId("cause.amount.input");
    await user.type(screen.getByTestId("cause.donor_name.input"), "Grace");
    await user.click(screen.getByTestId("cause.anonymous.checkbox"));
    await user.click(screen.getByTestId("cause.donate.submit_button"));

    await waitFor(() => {
      expect(startDonation).toHaveBeenCalledWith(
        expect.objectContaining({
          causeId: 1n,
          amountCents: 5_000n,
          donorName: undefined,
        }),
      );
    });
  });

  it("shows an error and keeps the total unchanged when payment fails to start", async () => {
    const user = userEvent.setup();
    const startDonation = vi.fn<backendInterface["startDonation"]>(async () => {
      throw new Error("Stripe is not configured");
    });
    const actor = actorWith({ startDonation });

    await renderCausePage(actor);

    await screen.findByTestId("cause.amount.input");
    await user.click(screen.getByTestId("cause.donate.submit_button"));

    const alert = await screen.findByTestId("cause.donation.error_state");
    expect(alert).toHaveTextContent("Stripe is not configured");
    expect(
      screen.getByTestId("cause.donation.retry_button"),
    ).toBeInTheDocument();
    // The cause total is unchanged: still the original raised amount.
    expect(screen.getByText("$25,000")).toBeInTheDocument();
  });

  it("confirms a pending donation and shows the receipt reference", async () => {
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

    await renderCausePage(actor);

    const receipt = await screen.findByTestId("cause.confirmation.receipt");
    expect(receipt).toHaveTextContent("cs_receipt_9");
    expect(confirmDonation).toHaveBeenCalledWith(9n);
  });

  it("increases the raised amount, progress bar and donor list after a completed payment", async () => {
    window.sessionStorage.setItem(
      "cg.pendingDonation",
      JSON.stringify({ donationId: "9", causeId: "1" }),
    );
    // The cause starts at $25,000 of a $100,000 goal (25%). A completed
    // $12,000 donation must move it to $37,000 (37%) and add the donor.
    const getCause = vi.fn<backendInterface["getCause"]>(async () =>
      makeCause(),
    );
    const listRecentDonations = vi.fn<backendInterface["listRecentDonations"]>(
      async () => [],
    );
    const confirmDonation = vi.fn<backendInterface["confirmDonation"]>(
      async () => {
        getCause.mockImplementation(async () =>
          makeCause({ raisedCents: 37_000_00n, progressBps: 3_700n }),
        );
        listRecentDonations.mockImplementation(async () => [
          makeDonation({
            id: 9n,
            receiptRef: "cs_receipt_9",
            amountCents: 12_000n,
            donorDisplayName: "Grace",
          }),
        ]);
        return makeDonation({
          id: 9n,
          receiptRef: "cs_receipt_9",
          amountCents: 12_000n,
          donorDisplayName: "Grace",
        });
      },
    );
    const actor = actorWith({
      getCause,
      listRecentDonations,
      confirmDonation,
    });

    await renderCausePage(actor);

    expect(
      await screen.findByTestId("cause.confirmation.receipt"),
    ).toHaveTextContent("cs_receipt_9");

    // The cause total and progress bar reflect the completed donation.
    expect(await screen.findByText("$37,000")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Funding progress" }),
    ).toHaveAttribute("aria-valuenow", "37");

    // The new donation appears in the cause's public donor list.
    const donorList = await screen.findByTestId("cause.donors.list");
    expect(within(donorList).getByText("Grace")).toBeInTheDocument();
    expect(within(donorList).getByText("$120")).toBeInTheDocument();
  });

  it("shows a not-available state for an unknown cause", async () => {
    const actor = actorWith({
      getCause: vi.fn<backendInterface["getCause"]>(async () => null),
    });

    await renderCausePage(actor, "999");

    expect(await screen.findByTestId("cause.error_state")).toBeInTheDocument();
  });
});
