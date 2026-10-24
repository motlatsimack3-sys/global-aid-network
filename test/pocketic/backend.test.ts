import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";
import { registerCaller } from "./test-utils";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  }));
});

afterAll(async () => {
  await pic?.tearDown();
});

it("answers public reads instead of trapping", async () => {
  // The migration seeds the two active causes, so the public list is not empty.
  const causes = await actor.listCauses();
  expect(causes).toHaveLength(2);
  expect(causes.map((cause) => cause.title)).toEqual([
    "Nepal earthquake relief",
    "Africa water, food and medicine",
  ]);
  expect(causes.every((cause) => cause.status.published !== undefined)).toBe(
    true,
  );

  const nepal = await actor.getCause(0n);
  expect(nepal).toHaveLength(1);
  expect(nepal[0]).toMatchObject({ id: 0n, raisedCents: 0n, progressBps: 0n });

  // The migration seeds each cause with a funding goal the landing page shows.
  const africa = await actor.getCause(1n);
  expect(africa).toHaveLength(1);
  expect(africa[0]).toMatchObject({
    id: 1n,
    goalCents: 75_000_00n,
    raisedCents: 0n,
    progressBps: 0n,
  });
  expect(causes.map((cause) => cause.goalCents)).toEqual([
    50_000_00n,
    75_000_00n,
  ]);

  await expect(actor.getCause(999n)).resolves.toEqual([]);
  await expect(actor.listRecentDonations(0n, 8n)).resolves.toEqual([]);
  await expect(actor.isStripeConfigured()).resolves.toBe(false);
});

it("round-trips a cause through create, publish and read", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );

  const id = await owner.createCause({
    title: "Nepal Earthquake Relief",
    description: "Rebuilding homes for families who lost everything.",
    imageRef: "/assets/images/nepal.jpg",
    goalCents: 100_000_00n,
  });

  // A draft is not public: only the two seeded causes are listed.
  const beforePublish = await owner.listCauses();
  expect(beforePublish).toHaveLength(2);
  expect(beforePublish.some((cause) => cause.id === id)).toBe(false);
  const draft = await owner.getCause(id);
  expect(draft).toHaveLength(1);
  expect(draft[0]).toMatchObject({
    id,
    title: "Nepal Earthquake Relief",
    goalCents: 100_000_00n,
    raisedCents: 0n,
    progressBps: 0n,
    status: { draft: null },
  });

  await expect(owner.publishCause(id)).resolves.toBe(true);

  const published = await owner.listCauses();
  expect(published).toHaveLength(3);
  const created = published.find((cause) => cause.id === id);
  expect(created).toMatchObject({ id, status: { published: null } });
});

it("lets the owner edit a cause and set its funding goal", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );
  const id = await owner.createCause({
    title: "Africa Water & Food",
    description: "Clean water, food and medicine.",
    imageRef: "/assets/images/africa.jpg",
    goalCents: 50_000_00n,
  });

  await expect(
    owner.editCause(id, {
      title: "Africa Water, Food & Medicine",
      description: "Clean water, food and medicine for communities in need.",
      imageRef: "/assets/images/africa.jpg",
      goalCents: 50_000_00n,
    }),
  ).resolves.toBe(true);
  await expect(owner.setCauseGoal(id, 200_000_00n)).resolves.toBe(true);

  const view = await owner.getCause(id);
  expect(view[0]).toMatchObject({
    title: "Africa Water, Food & Medicine",
    goalCents: 200_000_00n,
  });
});

it("closes a cause so it leaves the public list", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );
  const id = await owner.createCause({
    title: "Close Me",
    description: "Temporary cause.",
    imageRef: "",
    goalCents: 1_000_00n,
  });
  await owner.publishCause(id);
  await expect(owner.closeCause(id)).resolves.toBe(true);

  const publicCauses = await owner.listCauses();
  expect(publicCauses.some((cause) => cause.id === id)).toBe(false);
  const all = await owner.listAllCauses();
  expect(all.find((cause) => cause.id === id)?.status).toEqual({ closed: null });
});

it("rejects a non-owner from creating, editing or closing a cause", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );
  const id = await owner.createCause({
    title: "Owner Only",
    description: "Guarded cause.",
    imageRef: "",
    goalCents: 1_000_00n,
  });

  const stranger = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("stranger"),
  );
  await expect(stranger.isCallerAdmin()).resolves.toBe(false);
  await expect(
    stranger.createCause({
      title: "Intruder",
      description: "",
      imageRef: "",
      goalCents: 1n,
    }),
  ).rejects.toThrow();
  await expect(
    stranger.editCause(id, {
      title: "Hijacked",
      description: "",
      imageRef: "",
      goalCents: 1n,
    }),
  ).rejects.toThrow();
  await expect(stranger.closeCause(id)).rejects.toThrow();
  await expect(stranger.listAllCauses()).rejects.toThrow();
  await expect(stranger.listDonationLedger(id)).rejects.toThrow();
});

it("rejects an anonymous caller from owner-only methods", async () => {
  const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(guest.isCallerAdmin()).resolves.toBe(false);
  await expect(
    guest.createCause({
      title: "Anonymous",
      description: "",
      imageRef: "",
      goalCents: 1n,
    }),
  ).rejects.toThrow();
  await expect(guest.listAllCauses()).rejects.toThrow();
  await expect(guest.listDonationLedger(0n)).rejects.toThrow();
});

it("rejects a donation to a cause that is not published", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );
  const id = await owner.createCause({
    title: "Draft Cause",
    description: "Not accepting donations yet.",
    imageRef: "",
    goalCents: 1_000_00n,
  });

  await expect(
    owner.startDonation({
      causeId: id,
      amountCents: 5_000n,
      donorName: [],
      message: [],
    }),
  ).rejects.toThrow();
});

it("rejects a zero-amount donation to a published cause", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );
  const id = await owner.createCause({
    title: "Zero Amount Cause",
    description: "Published and accepting donations.",
    imageRef: "",
    goalCents: 1_000_00n,
  });
  await owner.publishCause(id);

  await expect(
    owner.startDonation({
      causeId: id,
      amountCents: 0n,
      donorName: [],
      message: [],
    }),
  ).rejects.toThrow();
});

it("starts a donation to a published cause without a configured gateway", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );
  const id = await owner.createCause({
    title: "Donatable Cause",
    description: "Published and accepting donations.",
    imageRef: "",
    goalCents: 1_000_00n,
  });
  await owner.publishCause(id);

  // With no Stripe key configured the accepted behavior is to record the
  // pending donation and hand the visitor to the app's own payment step, so a
  // signed-out visitor can always reach payment in a fresh draft.
  const started = await owner.startDonation({
    causeId: id,
    amountCents: 5_000n,
    donorName: [],
    message: [],
    successUrl: "https://example.test/payment-success",
    cancelUrl: "https://example.test/payment-failure",
  });
  expect(started.sessionJson).toContain("https://example.test/payment-success");
  expect(started.sessionJson).toContain(`local-${started.donationId}`);
});

it("records a completed donation and raises the cause total and progress", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );
  const id = await owner.createCause({
    title: "Round Trip Cause",
    description: "Published and accepting donations.",
    imageRef: "",
    goalCents: 100_000_00n,
  });
  await owner.publishCause(id);

  const started = await owner.startDonation({
    causeId: id,
    amountCents: 12_000n,
    donorName: ["Grace"],
    message: ["Stay strong."],
    successUrl: "https://example.test/payment-success",
    cancelUrl: "https://example.test/payment-failure",
  });

  // A pending donation is not yet public and has not moved the total.
  await expect(owner.listRecentDonations(id, 8n)).resolves.toEqual([]);
  const before = await owner.getCause(id);
  expect(before[0]).toMatchObject({ raisedCents: 0n, progressBps: 0n });

  const confirmed = await owner.confirmDonation(started.donationId);
  expect(confirmed).toMatchObject({
    id: started.donationId,
    causeId: id,
    amountCents: 12_000n,
    donorDisplayName: "Grace",
    message: ["Stay strong."],
  });

  // The completed donation raises the cause total and progress bar.
  // progressBps is basis points: 12,000 of a 10,000,000-cent goal is 12.
  const after = await owner.getCause(id);
  expect(after[0]).toMatchObject({ raisedCents: 12_000n, progressBps: 12n });

  // The new donation appears in the cause's public donor list.
  const recent = await owner.listRecentDonations(id, 8n);
  expect(recent).toHaveLength(1);
  expect(recent[0]).toMatchObject({
    id: started.donationId,
    donorDisplayName: "Grace",
    amountCents: 12_000n,
  });

  // Confirming the same donation again is idempotent: the total does not move.
  await owner.confirmDonation(started.donationId);
  const afterRepeat = await owner.getCause(id);
  expect(afterRepeat[0]).toMatchObject({ raisedCents: 12_000n });
});

it("shows an anonymous donor as Anonymous in the public donor list", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );
  const id = await owner.createCause({
    title: "Anonymous Cause",
    description: "Published and accepting donations.",
    imageRef: "",
    goalCents: 1_000_00n,
  });
  await owner.publishCause(id);

  const started = await owner.startDonation({
    causeId: id,
    amountCents: 2_500n,
    donorName: [],
    message: [],
    successUrl: "https://example.test/payment-success",
    cancelUrl: "https://example.test/payment-failure",
  });
  await owner.confirmDonation(started.donationId);

  const recent = await owner.listRecentDonations(id, 8n);
  expect(recent).toHaveLength(1);
  expect(recent[0].donorDisplayName).toBe("Anonymous");
});

it("rejects confirming a donation that does not exist", async () => {
  // confirmDonation is the method that records a completed payment and raises
  // the cause total. A stub that traps on every call would pass the empty-state
  // reads above, so call it directly: an unknown id must fail at the donation
  // lookup, not at a missing implementation.
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );
  await expect(owner.confirmDonation(999n)).rejects.toThrow(/Donation not found/);
});

it("reports no recent donations for a published cause with none", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    createIdentity("owner"),
  );
  const id = await owner.createCause({
    title: "Fresh Cause",
    description: "No donations yet.",
    imageRef: "",
    goalCents: 1_000_00n,
  });
  await owner.publishCause(id);

  await expect(owner.listRecentDonations(id, 8n)).resolves.toEqual([]);
  await expect(owner.listDonationLedger(id)).resolves.toEqual([]);
});
