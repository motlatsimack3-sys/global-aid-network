import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import type { CauseView, backendInterface } from "@/backend";
import { CauseStatus } from "@/backend";
import { PENDING_KEY, parseCheckoutSession, readPending } from "@/lib/payment";
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

describe("parseCheckoutSession non-object payloads", () => {
  it("rejects a JSON null payload as a missing checkout link", () => {
    expect(() => parseCheckoutSession("null")).toThrow(
      "Payment session is missing a checkout link.",
    );
  });

  it("rejects a JSON primitive payload as a missing checkout link", () => {
    expect(() => parseCheckoutSession("42")).toThrow(
      "Payment session is missing a checkout link.",
    );
  });
});

describe("readPending malformed storage", () => {
  it("returns null when the stored value is JSON null", () => {
    window.sessionStorage.setItem(PENDING_KEY, "null");
    expect(readPending()).toBeNull();
  });

  it("returns null when the stored fields are not strings", () => {
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ donationId: 9, causeId: 1 }),
    );
    expect(readPending()).toBeNull();
  });
});

describe("cause page with a non-numeric cause id", () => {
  it("shows the not-available state without querying the backend", async () => {
    const getCause = vi.fn<backendInterface["getCause"]>(async () =>
      makeCause(),
    );
    const actor = actorWith({ getCause });

    window.history.pushState({}, "", "/causes/not-a-number");
    await router.navigate({
      to: "/causes/$causeId",
      params: { causeId: "not-a-number" },
    });
    renderWithActor(<App />, actor);

    expect(await screen.findByTestId("cause.error_state")).toBeInTheDocument();
    expect(getCause).not.toHaveBeenCalled();
  });
});
