import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, Donation, backendInterface } from "@/backend";
import { CauseStatus, DonationStatus } from "@/backend";
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

function makeLedgerDonation(overrides: Partial<Donation> = {}): Donation {
  return {
    id: 1n,
    status: DonationStatus.completed,
    receiptRef: "cs_ledger_1",
    createdAt: 1_700_000_000_000_000_000n,
    donorName: "Ada",
    amountCents: 5_000n,
    causeId: 1n,
    ...overrides,
  };
}

type AdminActor = Pick<
  backendInterface,
  | "isCallerAdmin"
  | "listAllCauses"
  | "listDonationLedger"
  | "createCause"
  | "publishCause"
  | "closeCause"
>;

function actorWith(overrides: Partial<AdminActor>): AdminActor {
  return {
    isCallerAdmin: vi.fn<backendInterface["isCallerAdmin"]>(async () => true),
    listAllCauses: vi.fn<backendInterface["listAllCauses"]>(async () => [
      makeCause(),
    ]),
    listDonationLedger: vi.fn<backendInterface["listDonationLedger"]>(
      async () => [],
    ),
    createCause: vi.fn<backendInterface["createCause"]>(async () => 2n),
    publishCause: vi.fn<backendInterface["publishCause"]>(async () => true),
    closeCause: vi.fn<backendInterface["closeCause"]>(async () => true),
    ...overrides,
  };
}

/** A signed-in non-anonymous identity for the owner gate. */
function signIn() {
  setIdentityForTest({
    identity: {
      getPrincipal: () => ({ isAnonymous: () => false, toText: () => "owner" }),
    } as never,
  });
}

async function renderAdmin(actor: AdminActor) {
  window.history.pushState({}, "", "/admin");
  await router.navigate({ to: "/admin" });
  return renderWithActor(<App />, actor);
}

afterEach(() => {
  window.history.pushState({}, "", "/");
});

describe("AdminPage", () => {
  it("gates a signed-out visitor behind owner sign-in", async () => {
    const actor = actorWith({});

    await renderAdmin(actor);

    expect(await screen.findByTestId("admin.gate")).toBeInTheDocument();
    expect(screen.queryByTestId("admin.page")).not.toBeInTheDocument();
    expect(actor.listAllCauses).not.toHaveBeenCalled();
  });

  it("hides owner tools from a signed-in non-owner", async () => {
    signIn();
    const actor = actorWith({
      isCallerAdmin: vi.fn<backendInterface["isCallerAdmin"]>(
        async () => false,
      ),
    });

    await renderAdmin(actor);

    expect(await screen.findByTestId("admin.gate")).toBeInTheDocument();
    expect(screen.queryByTestId("admin.page")).not.toBeInTheDocument();
  });

  it("shows the owner the causes and the full donation ledger", async () => {
    signIn();
    const actor = actorWith({
      listDonationLedger: vi.fn<backendInterface["listDonationLedger"]>(
        async () => [
          makeLedgerDonation({ donorName: "Ada", amountCents: 5_000n }),
          makeLedgerDonation({
            id: 2n,
            donorName: undefined,
            amountCents: 10_000n,
            receiptRef: "cs_ledger_2",
          }),
        ],
      ),
    });

    await renderAdmin(actor);

    expect(await screen.findByTestId("admin.page")).toBeInTheDocument();
    const table = await screen.findByTestId("admin.ledger.table");
    expect(within(table).getByText("Ada")).toBeInTheDocument();
    expect(within(table).getByText("Anonymous")).toBeInTheDocument();
    expect(within(table).getByText("cs_ledger_1")).toBeInTheDocument();
  });

  it("lets the owner create a draft cause", async () => {
    signIn();
    const user = userEvent.setup();
    const createCause = vi.fn<backendInterface["createCause"]>(async () => 2n);
    const actor = actorWith({ createCause });

    await renderAdmin(actor);

    await user.click(await screen.findByTestId("admin.create_cause_button"));
    await user.type(
      await screen.findByTestId("admin.cause_title_input"),
      "Africa Water & Food",
    );
    await user.type(screen.getByTestId("admin.cause_goal_input"), "50000");
    await user.click(screen.getByTestId("admin.cause_form.submit_button"));

    await waitFor(() => {
      expect(createCause).toHaveBeenCalledWith({
        title: "Africa Water & Food",
        description: "",
        imageRef: "",
        goalCents: 5_000_000n,
      });
    });
  });

  it("lets the owner publish a draft cause", async () => {
    signIn();
    const user = userEvent.setup();
    const publishCause = vi.fn<backendInterface["publishCause"]>(
      async () => true,
    );
    const actor = actorWith({
      listAllCauses: vi.fn<backendInterface["listAllCauses"]>(async () => [
        makeCause({ status: CauseStatus.draft }),
      ]),
      publishCause,
    });

    await renderAdmin(actor);

    await user.click(await screen.findByTestId("admin.cause_publish_button.1"));

    await waitFor(() => {
      expect(publishCause).toHaveBeenCalledWith(1n);
    });
  });
});
