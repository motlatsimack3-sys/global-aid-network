# Project Guidance

## User Preferences

- Worldwide audience: payment methods must be globally usable and online
- Focus on Nepal (homes and relatives lost) and Africa (water, food, medicine)
- Warm editorial humanitarian visual style with Fraunces and General Sans typography
- Worldwide audience with globally usable online payment methods
- Focus on Nepal earthquake relief and Africa water, food and medicine causes

## Accepted Requirements

- A public website where people worldwide can donate to help the poor
- Causes for Nepal (people who lost homes and relatives) and Africa (water, food, medicine)
- Online donation using globally used payment methods

## Verified Commands

- **typecheck**: `pnpm --dir src/frontend typecheck`
- **fix**: `pnpm --dir src/frontend fix`
- **build**: `pnpm --dir src/frontend build`

## Learnings

- Backend commands run from src/backend/: mops check --fix and mops build; run pnpm bindgen from the project root to regenerate src/frontend/src/backend.d.ts after any backend interface change.
- startDonation and confirmDonation in src/backend/mixins/donations-api.mo branch on the stored Stripe configuration: with no key saved they record the donation and return a local session JSON whose url is the caller successUrl, so a signed-out visitor still reaches the payment step; with a key saved they keep the real Stripe checkout and session-status verification.
- The two named causes are seeded in the init-once migration src/backend/migrations/00000000_000000.mo with real asset paths under src/frontend/public/assets/generated/, and the donation OQL entity uses a controller-only selector while the cause entity is public.
- Pages that gate a query on enabled: !!actor see isLoading false while the actor initializes; use isPending to cover that window and avoid a brief wrong or blank state.
- The pending donation id is stashed in sessionStorage (PENDING_KEY in src/frontend/src/lib/payment.ts) before the Stripe redirect, and the return page reads it to call confirmDonation rather than relying on the ?donationId query param.
