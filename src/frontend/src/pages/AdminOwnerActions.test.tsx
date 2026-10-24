import App from "@/App";
import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, backendInterface } from "@/backend";
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

type AdminActor = Pick<
  backendInterface,
  | "isCallerAdmin"
  | "listAllCauses"
  | "listDonationLedger"
  | "editCause"
  | "setCauseGoal"
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
    editCause: vi.fn<backendInterface["editCause"]>(async () => true),
    setCauseGoal: vi.fn<backendInterface["setCauseGoal"]>(async () => true),
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

describe("AdminPage owner actions", () => {
  it("lets the owner edit a cause's details", async () => {
    signIn();
    const user = userEvent.setup();
    const editCause = vi.fn<backendInterface["editCause"]>(async () => true);
    const actor = actorWith({ editCause });

    await renderAdmin(actor);

    await user.click(await screen.findByTestId("admin.cause_edit_button.1"));
    const titleInput = await screen.findByTestId("admin.cause_title_input");
    await user.clear(titleInput);
    await user.type(titleInput, "Nepal Rebuild Fund");
    await user.click(screen.getByTestId("admin.cause_form.submit_button"));

    await waitFor(() => {
      expect(editCause).toHaveBeenCalledWith(1n, {
        title: "Nepal Rebuild Fund",
        description: "Rebuilding homes for families who lost everything.",
        imageRef: "/assets/images/nepal.jpg",
        goalCents: 100_000_00n,
      });
    });
  });

  it("lets the owner set a cause's funding goal", async () => {
    signIn();
    const user = userEvent.setup();
    const setCauseGoal = vi.fn<backendInterface["setCauseGoal"]>(
      async () => true,
    );
    const actor = actorWith({ setCauseGoal });

    await renderAdmin(actor);

    await user.click(await screen.findByTestId("admin.cause_goal_button.1"));
    const goalInput = await screen.findByTestId("admin.goal_input");
    await user.clear(goalInput);
    await user.type(goalInput, "250000");
    await user.click(screen.getByTestId("admin.goal_form.submit_button"));

    await waitFor(() => {
      expect(setCauseGoal).toHaveBeenCalledWith(1n, 250_000_00n);
    });
  });

  it("lets the owner close a published cause", async () => {
    signIn();
    const user = userEvent.setup();
    const closeCause = vi.fn<backendInterface["closeCause"]>(async () => true);
    const actor = actorWith({ closeCause });

    await renderAdmin(actor);

    await user.click(await screen.findByTestId("admin.cause_close_button.1"));

    await waitFor(() => {
      expect(closeCause).toHaveBeenCalledWith(1n);
    });
  });

  it("rejects an invalid funding goal without calling the backend", async () => {
    signIn();
    const user = userEvent.setup();
    const setCauseGoal = vi.fn<backendInterface["setCauseGoal"]>(
      async () => true,
    );
    const actor = actorWith({ setCauseGoal });

    await renderAdmin(actor);

    await user.click(await screen.findByTestId("admin.cause_goal_button.1"));
    const goalInput = await screen.findByTestId("admin.goal_input");
    await user.clear(goalInput);
    await user.type(goalInput, "0");
    await user.click(screen.getByTestId("admin.goal_form.submit_button"));

    expect(
      await screen.findByTestId("admin.goal_form.error_state"),
    ).toBeInTheDocument();
    expect(setCauseGoal).not.toHaveBeenCalled();
  });
});
