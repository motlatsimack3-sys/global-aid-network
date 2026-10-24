import { createActor } from "@/backend";
import type {
  CauseId,
  CauseInput,
  CauseView,
  Donation,
  DonationInput,
  DonationStart,
  DonationView,
  ShoppingItem,
  StripeConfiguration,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Public: published causes with goal, raised and progress. */
export function useCauses() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<CauseView[]>({
    queryKey: ["causes"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCauses();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Public: a single cause by id. */
export function useCause(id: CauseId | undefined) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<CauseView | null>({
    queryKey: ["cause", id?.toString()],
    queryFn: async () => {
      if (!actor || id === undefined) return null;
      return actor.getCause(id);
    },
    enabled: !!actor && !isFetching && id !== undefined,
  });
}

/** Public: recent completed donations for a cause. */
export function useRecentDonations(causeId: CauseId | undefined, limit = 8n) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<DonationView[]>({
    queryKey: ["recentDonations", causeId?.toString(), limit.toString()],
    queryFn: async () => {
      if (!actor || causeId === undefined) return [];
      return actor.listRecentDonations(causeId, limit);
    },
    enabled: !!actor && !isFetching && causeId !== undefined,
  });
}

/** Owner-only: every cause including drafts and closed ones. */
export function useAllCauses() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<CauseView[]>({
    queryKey: ["allCauses"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllCauses();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Owner-only: the full donation ledger for a cause. */
export function useDonationLedger(causeId: CauseId | undefined) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Donation[]>({
    queryKey: ["donationLedger", causeId?.toString()],
    queryFn: async () => {
      if (!actor || causeId === undefined) return [];
      return actor.listDonationLedger(causeId);
    },
    enabled: !!actor && !isFetching && causeId !== undefined,
  });
}

/** Owner check for the signed-in caller. */
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Whether Stripe has been configured on the backend. */
export function useIsStripeConfigured() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["isStripeConfigured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isStripeConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Owner-only: create a draft cause. */
export function useCreateCause() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CauseInput): Promise<CauseId> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createCause(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allCauses"] });
      void queryClient.invalidateQueries({ queryKey: ["causes"] });
    },
  });
}

/** Owner-only: edit a cause's title, description, image and goal. */
export function useEditCause() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: CauseId; input: CauseInput }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.editCause(id, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allCauses"] });
      void queryClient.invalidateQueries({ queryKey: ["causes"] });
      void queryClient.invalidateQueries({ queryKey: ["cause"] });
    },
  });
}

/** Owner-only: set a cause's funding goal. */
export function useSetCauseGoal() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      goalCents,
    }: { id: CauseId; goalCents: bigint }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setCauseGoal(id, goalCents);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allCauses"] });
      void queryClient.invalidateQueries({ queryKey: ["causes"] });
      void queryClient.invalidateQueries({ queryKey: ["cause"] });
    },
  });
}

/** Owner-only: publish a cause. */
export function usePublishCause() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: CauseId) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.publishCause(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allCauses"] });
      void queryClient.invalidateQueries({ queryKey: ["causes"] });
      void queryClient.invalidateQueries({ queryKey: ["cause"] });
    },
  });
}

/** Owner-only: close a cause. */
export function useCloseCause() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: CauseId) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.closeCause(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allCauses"] });
      void queryClient.invalidateQueries({ queryKey: ["causes"] });
      void queryClient.invalidateQueries({ queryKey: ["cause"] });
    },
  });
}

/** Public: start a donation and return the Stripe checkout session JSON. */
export function useStartDonation() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (input: DonationInput): Promise<DonationStart> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.startDonation(input);
    },
  });
}

/** Public: confirm a completed payment so the donation is recorded. */
export function useConfirmDonation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (donationId: bigint): Promise<DonationView> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.confirmDonation(donationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["causes"] });
      void queryClient.invalidateQueries({ queryKey: ["cause"] });
      void queryClient.invalidateQueries({ queryKey: ["recentDonations"] });
    },
  });
}

/** Owner-only: configure the Stripe secret key and allowed countries. */
export function useSetStripeConfiguration() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: StripeConfiguration) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setStripeConfiguration(config);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["isStripeConfigured"] });
    },
  });
}

/** Low-level checkout session creation used by the payment handoff. */
export function useCreateCheckoutSession() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async ({
      items,
      successUrl,
      cancelUrl,
    }: {
      items: ShoppingItem[];
      successUrl: string;
      cancelUrl: string;
    }): Promise<string> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createCheckoutSession(items, successUrl, cancelUrl);
    },
  });
}
