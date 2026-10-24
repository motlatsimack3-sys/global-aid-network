# Design Brief

## Direction

Field Notes — an editorial humanitarian relief site that reads like a trusted documentary journal, not a charity template.

## Tone

Warm editorial — parchment canvas, serif headlines, and documentary photography carry dignity and trust instead of soft-blue nonprofit cliché.

## Differentiation

Cause cards double as progress ledgers: each carries a live funding bar in its own signature hue (terracotta for Nepal, water-teal for Africa), making generosity feel measurable and human.

## Color Palette

| Token      | OKLCH          | Role                                       |
| ---------- | -------------- | ------------------------------------------ |
| background | 0.968 0.012 78 | Warm parchment canvas                      |
| foreground | 0.24 0.028 48  | Deep warm brown-black text                 |
| card       | 0.988 0.008 82 | Raised cream surfaces                      |
| primary    | 0.55 0.155 38  | Terracotta — donate CTAs, Nepal cause      |
| accent     | 0.52 0.09 205  | Water-teal — Africa cause, secondary marks |
| muted      | 0.92 0.018 78  | Section fills, quiet surfaces              |

## Typography

- Display: Fraunces — hero and section headlines, emotional weight
- Body: General Sans — paragraphs, labels, UI
- Mono: Geist Mono — receipt references, amounts, ledger figures
- Scale: hero `text-5xl md:text-7xl font-bold tracking-tight`, h2 `text-3xl md:text-5xl font-bold tracking-tight`, label `text-sm font-semibold tracking-widest uppercase`, body `text-base md:text-lg`

## Elevation & Depth

Two-tier shadow system (`shadow-subtle`, `shadow-elevated`) plus a faint grain overlay; cards lift on hover, page stays flat and paper-like.

## Structural Zones

| Zone    | Background       | Border     | Notes                                            |
| ------- | ---------------- | ---------- | ------------------------------------------------ |
| Header  | bg-card          | border-b   | Sticky, serif wordmark left, terracotta pill CTA |
| Content | bg-background    | —          | Alternate `bg-muted/40` sections for rhythm      |
| Footer  | 0.24 0.028 48    | border-t   | Dark charcoal-brown band, cream links            |

## Spacing & Rhythm

Generous editorial spacing — `py-16 md:py-24` between sections, `gap-8` card grids, `space-y-4` within groups, tight `gap-2` for label/value pairs.

## Component Patterns

- Buttons: pill-shaped, terracotta fill with cream text, hover darkens via `bg-primary/90` + `shadow-elevated`
- Cards: `rounded-xl` cream surfaces, 1px border, `shadow-subtle`, image top-corners rounded, hover lifts
- Badges: pill, cause-colored tint (`bg-primary/10` or `bg-accent/10`) with matching text
- Progress: rounded-full track `bg-muted`, fill in cause hue, percentage label at fill edge

## Motion

- Entrance: `animate-fade-up` staggered on hero and cause cards, 0.5s
- Hover: `transition-smooth` on cards and buttons, subtle lift
- Decorative: progress bars fill via `animate-progress-fill` on view

## Constraints

- No purple gradients, no generic blue CTAs, no full-page gradient backgrounds
- Only 3–5 core colors: parchment, terracotta, water-teal, warm charcoal
- Semantic tokens only — no raw hex or arbitrary color classes in components
- Payment methods must read as globally trustworthy (card, PayPal, Apple Pay)

## Signature Detail

Cause-coded progress bars — terracotta and water-teal fills animate on load, turning each cause into a living ledger of worldwide generosity.
