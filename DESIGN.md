---
name: Casa Tierra Luz
description: Handmade artisan candles — deep night, warm flame, slow craft.
colors:
  primary: "oklch(0.88 0.030 76)"
  accent: "oklch(0.46 0.16 42)"
  bg: "oklch(0.99 0.000 0)"
  surface: "oklch(0.94 0.018 76)"
  ink: "oklch(0.20 0.025 52)"
  muted: "oklch(0.46 0.018 52)"
  on-primary: "oklch(0.94 0.010 72)"
  footer: "oklch(0.18 0.030 52)"
typography:
  display:
    fontFamily: "'Libre Baskerville', Georgia, serif"
    fontSize: "clamp(3.25rem, 8vw, 5.75rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Libre Baskerville', Georgia, serif"
    fontSize: "clamp(2.25rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Libre Baskerville', Georgia, serif"
    fontSize: "clamp(1.75rem, 3vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Barlow', system-ui, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Barlow', system-ui, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  sm: "2px"
  md: "4px"
spacing:
  xs: "0.25rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
  3xl: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: "1rem 2rem"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "oklch(0.54 0.16 42)"
    textColor: "{colors.on-accent}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 2rem"
    typography: "{typography.label}"
  button-ghost-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
  card-product:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0"
---

# Design System: Casa Tierra Luz

## 1. Overview

**Creative North Star: "El Interior Encendido"**

The design lives in a specific warmth — *el interior encendido*, the lit interior. The moment when candles have been placed and lit, the world outside cools to dusk, and the room fills with something you made with your hands. Casa Tierra Luz is exactly this: warmth that is earned, not automatic. Crafted, not generated.

The palette is the room itself. `--c-primary` is warm sand — walls, linen, the surfaces where things rest. `--c-accent` is deep sienna — the clay of the holder, the earth the wax comes from, the burning material. Background is neutral white: the clean surface a candle sits on before it's lit. The relationship is grounded, not atmospheric: earth, craft, stillness.

Typography carries the same logic. Libre Baskerville 700 at display size feels like a label pressed into clay — weighted, handmade, present. Barlow is the note tucked inside the package: clear, direct, no ornamentation. Motion is choreographed and unhurried: GSAP `power3.out` ease, scroll-triggered stagger, sections arriving with intention rather than energy.

Design reference: mawastudio.es — refined craft studio aesthetic, elevated without distance. Clean, warm, airy — the product is the hero, the interface is the frame. Anti-references: mass-market retail (IKEA, Amazon), generic Etsy/Shopify template, boho Instagram vocabulary (terracotta dominant + macramé), AI cream default, cold studio minimalism.

**Key Characteristics:**
- Warm sand (`--c-primary`) as brand section surfaces — hero, story sections; light, not dark
- Single deep sienna accent (`--c-accent`) used on ≤2 interactive elements per screen — CTAs and prices
- Neutral white (`--c-bg`) for product areas — the canvas that lets product photography breathe
- Libre Baskerville 700 serif for all display and headline text
- Barlow for body, labels, and interactive copy
- Near-flat elevation: surfaces rest without shadow; only hover states lift
- GSAP choreography via `gsap.context(fn, containerRef)` with `.revert()` cleanup; `prefers-reduced-motion` respected in JS and CSS

## 2. Colors: The Warm Earth Palette

Warm sand for brand surfaces, deep sienna for craft and action, neutral white for product clarity.

### Primary
- **Warm Sand** (`oklch(0.88 0.030 76)` / `--c-primary`): The dominant brand surface. Hero sections, story blocks — the linen wall behind the candle. Light, not dark; airy, not atmospheric. Brand sections live here.

### Secondary
- **Deep Sienna** (`oklch(0.46 0.16 42)` / `--c-accent`): The clay, the earth, the burning material. CTAs, prices, active highlights. Used ≤2 times per screen, never decoratively. Verified ≥4.9:1 vs white ✓.

### Neutral
- **Neutral White** (`oklch(0.99 0.000 0)` / `--c-bg`): Product catalog, detail pages, forms. Chroma zero — the clean canvas for product photography.
- **Warm Sand Tint** (`oklch(0.94 0.018 76)` / `--c-surface`): Cards, panels. A softened echo of the primary hue; separates surfaces without adding color weight.
- **Warm Near-Black** (`oklch(0.20 0.025 52)` / `--c-ink`): Body text and fine detail on light surfaces. Warm near-black with a subtle brown undertone; never pure `#000`.
- **Warm Mid-Brown** (`oklch(0.46 0.018 52)` / `--c-muted`): Secondary text, captions, availability labels. Verified: ≥5:1 on neutral white ✓.
- **Warm Near-White** (`oklch(0.94 0.010 72)` / `--c-on-primary`): Text on dark surfaces (footer only). Warm near-white; carries meaning only when set against `--c-footer`.
- **Deep Warm Brown** (`oklch(0.18 0.030 52)` / `--c-footer`): Footer strip — deep warm brown, grounds the page, distinct from brand sections.

### Named Rules
**The Light Primary Rule.** Warm sand is the brand surface, not a dark hero. Hero, story sections, and catalog masthead carry `--c-primary` as background. Text on these surfaces uses `--c-ink`, not `--c-on-primary`. `--c-on-primary` is reserved for text on the dark footer only.

**The One Flame Rule.** Sienna appears on ≤2 interactive elements per screen. A CTA and a price. Never for borders, never for section decoration. Rarity is the point.

**The Chroma-Zero Background Rule.** The product canvas (`--c-bg`) has chroma 0. No warm tint, no cream. Warmth is carried by the sand–sienna relationship in brand sections, not by tinting the neutral. Any color toward `oklch(L 0.84-0.97, C < 0.06, hue 40-100)` on the product canvas is the AI cream default — prohibited.

## 3. Typography

**Display Font:** Libre Baskerville (Georgia, serif fallback) — Google Fonts, loaded as `ital,wght 0,400;0,700;1,400`.
**Body Font:** Barlow (system-ui, Arial fallback) — Google Fonts, loaded as `wght 400;500;600`.

**Character:** Libre Baskerville 700 at display size feels like a label pressed into clay — weighted, handmade, with the presence of letterpress printing. Barlow is the note inside the package: clear, direct, readable at any size without ornamentation. Two voices from the same person; distinct enough to create hierarchy, close enough not to fight.

### Hierarchy
- **Display** (700, `clamp(3.25rem, 8vw, 5.75rem)`, line-height 1.04, letter-spacing −0.025em): Hero headlines. `text-wrap: balance` always. Libre Baskerville only. Never uppercase at this scale.
- **Headline** (700, `clamp(2.25rem, 5vw, 3.5rem)`, line-height 1.1, letter-spacing −0.03em): Section headings, product detail names. Libre Baskerville.
- **Title** (500–700, `clamp(1.75rem, 3vw, 2.25rem)`, line-height 1.2, letter-spacing −0.02em): Subsection titles, large UI labels. Libre Baskerville.
- **Body** (400, `1rem` / `1.125rem`, line-height 1.5–1.75): Product descriptions, marketing copy. Barlow. 65–75ch max line length. `text-wrap: pretty` on long prose.
- **Label** (600, `0.75rem` / `0.875rem`, letter-spacing 0.06–0.08em, uppercase): CTAs, variant labels, navigation links, prices. Barlow only. Used sparingly — a deliberate choice, not a section scaffold.

### Named Rules
**The Weight Gravity Rule.** Libre Baskerville 700 at display size should feel heavy against body text. If the contrast between a serif headline and Barlow body feels subtle, push the size or weight further. The typographic hierarchy is the primary visual rhythm; a flat scale is a design error.

**The Serif Ownership Rule.** Libre Baskerville owns display, headline, and title. Barlow owns body and label. Do not mix: no Barlow headlines, no Baskerville body copy.

## 4. Elevation

Flat by default. Surfaces at rest carry no shadow — tonal contrast creates the sense of depth. Warm sand brand sections feel like the room's walls; neutral white product areas feel like the table in front of them.

Shadows appear only on state change. The single shadow token in use is a hover response on product cards — diffuse, warm-dark, never on the brand surfaces themselves.

### Shadow Vocabulary
- **Card Hover** (`0 8px 28px oklch(0.20 0.025 52 / 0.09)`): Product and catalog cards on `:hover`. Diffuse warm-dark glow. Paired with `translateY(-3px)` lift.

### Named Rules
**The Flat-by-Default Rule.** Surfaces have no resting shadow. A surface with a permanent drop shadow is a design error. Shadows are feedback (hover, active), never structure.

## 5. Components

### Buttons

The brand has two button archetypes: the primary CTA (amber, solid) and the ghost (outline, ink). Both are nearly flat with 2px radius — craft-specific geometry, not app-generic rounded corners.

- **Primary CTA:** Deep sienna background (`--c-accent`), near-white text (`--c-on-accent`). Barlow 600, uppercase, 0.08em tracking, 1rem × 2rem padding. Hover: `oklch(0.54 0.16 42)`, `translateY(-2px)`. Active: `translateY(0)`. Disabled: `opacity: 0.45`, `cursor: not-allowed`. Full-width on mobile product pages.
- **Ghost / Outline:** 1px `--c-ink` border, transparent background. Same type treatment. Hover: fills with `--c-ink`, text becomes `--c-on-primary`. Used for secondary actions (load more, back links styled as buttons).

### Product Cards (Catalog)

Image-forward: the photograph occupies the card, not a thumbnail thumbnail.

- **Background:** `--c-surface` (warm sand tint). 4px radius. No visible border at rest.
- **Image:** Portrait `3:4` ratio by default. Statement card (grid-position[0], spans 2 columns) uses landscape `4:3`.
- **Info block:** Product name in Libre Baskerville 500; short description in Barlow muted (2-line `-webkit-line-clamp`); footer row with price (Barlow 600) and color-swatch circles (14px, `hexCode` fill, subtle ring).
- **Hover:** `translateY(-3px)`, card hover shadow, image `scale(1.04)` at `0.6s var(--ease-out-quart)`.
- **Statement Card:** First position in catalog grid. `grid-column: span 2`. Larger name (`--text-2xl`). At 900px breakpoint: spans 3 columns (full-width). At 640px: spans 2 (full-width, `4:3` image).

### Variant Selector (Product Detail Page)

Replaces the native `<select>`. Each variant is a full-width button row.

- **Anatomy:** Color swatch circle (18px, `hexCode` fill, `oklch(0.20 0.025 52 / 0.12)` ring) → label text (color · scent or either alone) → availability count → per-variant price flush right.
- **Default:** 1px border `oklch(0.84 0.010 75)`, 4px radius, transparent bg.
- **Selected:** 2px solid `--c-ink` border, `--c-surface` fill.
- **Unavailable:** `opacity: 0.4`, `cursor: not-allowed`. WCAG exempt: inactive UI component.

### Navigation (Site Header)

Fixed 60px header. The logo is the brand's primary typographic moment.

- **Logo:** "Casa Tierra Luz" in Libre Baskerville 700 — the only brand-font instance in the nav chrome.
- **Transparent state:** Homepage hero only (scroll position 0). No background, `--c-ink` text (primary is light sand; dark text needed for contrast). Transitions to solid on scroll > 60px.
- **Solid state:** All other pages and homepage-scrolled. `--c-bg` background, `--c-ink` text, hairline bottom shadow `0 1px 0 oklch(0.20 0.025 52 / 0.08)`.
- **Link style:** Barlow 500, `--text-sm`, no underline. `opacity: 0.65` on hover.
- **Transition:** `background-color`, `color`, `box-shadow` all at `340ms var(--ease-out-expo)`.

### Motion Patterns

Motion is choreographed via GSAP 3.x. All effects use `gsap.context(fn, containerRef)` with `.revert()` cleanup.

- **Entrance (page or data load):** `gsap.fromTo(targets, { y: 14–22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.035–0.1, duration: 0.55–0.8, ease: 'power3.out' })`.
- **Load-more additions:** Same `fromTo` on newly appended DOM nodes only (sliced by a `prevVisibleRef`).
- **Image hover scale:** `transition: transform 0.6s var(--ease-out-quart)` — CSS, not GSAP.
- **Reduced motion:** All GSAP effects skip when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. CSS transitions disabled via `@media (prefers-reduced-motion: reduce) { transition: none !important }`.

## 6. Do's and Don'ts

### Do:
- **Do** use warm sand (`oklch(0.88 0.030 76)`) as the brand surface on hero, story, and catalog masthead sections — light and airy, not dark and atmospheric
- **Do** use `--c-ink` for all text on warm sand / primary surfaces; `--c-on-primary` is for dark footer text only
- **Do** use Libre Baskerville for all display and headline text; its weight carries the brand's hand-presence
- **Do** let product photography breathe on `--c-bg` surfaces with generous padding
- **Do** keep deep sienna (`--c-accent`) to ≤2 interactive elements per screen — CTA and price
- **Do** use `gsap.context(fn, containerRef)` with `.revert()` cleanup for all GSAP entrance animations
- **Do** apply `text-wrap: balance` on h1–h3; `text-wrap: pretty` on long prose
- **Do** include `@media (prefers-reduced-motion: reduce)` and JS `matchMedia` check for every animation
- **Do** verify text contrast before shipping: `--c-muted` on `--c-bg` ≥5:1 ✓; `--c-ink` on `--c-bg` ≥14:1 ✓; `--c-ink` on `--c-primary` ≥7:1 ✓
- **Do** reference mawastudio.es as the primary visual tone anchor — refined craft studio aesthetic

### Don't:
- **Don't** use any warm-neutral near-white as the body background (`oklch` L 0.84–0.97, C < 0.06, hue 40–100) — the 2026 AI cream default; this project's `--c-bg` is chroma 0
- **Don't** put `--c-on-primary` (warm near-white) on warm sand surfaces — it fails contrast; `--c-on-primary` is for `--c-footer` dark surfaces only
- **Don't** build identical card grids (same dimensions, icon + name + price, no variation) — the mass-market retail pattern (IKEA, Amazon) the brand explicitly rejects
- **Don't** use cold studio minimalism: the all-white, clinical, unapproachable "niche perfume brand" distance
- **Don't** use boho Instagram visual vocabulary: terracotta as dominant color, macramé textures, dried-flower ornaments, pampas grass
- **Don't** apply `background-clip: text` with a gradient; single solid ink only
- **Don't** use `border-left` or `border-right` > 1px as a colored accent stripe; rewrite with full borders or background tints
- **Don't** add uppercase tracked kicker labels above every section heading; a single deliberate kicker is voice, scaffolded eyebrows on every section is AI grammar
- **Don't** animate CSS layout properties (`width`, `height`, `padding`, `top/left`); transforms and opacity only
- **Don't** ship an entrance animation without a `@media (prefers-reduced-motion: reduce)` alternative
- **Don't** use any font from the reflex-reject list: Fraunces, Newsreader, Lora, Cormorant, DM Sans, Outfit, Instrument Serif, Space Grotesk, Inter, etc.
- **Don't** use the previous reference bonitoestudio.com; mawastudio.es is the current direction
