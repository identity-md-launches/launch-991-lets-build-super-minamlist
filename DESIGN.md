# ask-oncahin design system

## Overview

A compact terminal-inspired dapp for people asking public yes/no questions and reading oracle results. Preserve the requested `ask-oncahin` spelling. The implemented character is dark olive charcoal, pale neutral text, one lime action, monospaced type, ASCII punctuation, thin rules, and a flat surface hierarchy. No stock images, gradients, decorative animation, or remote assets are used.

The ask page pairs a form with a short explanation, then a public question list. Archive, question detail, about, and admin routes reuse the header, network strip, container, spacing, and footer. The hero and ASCII illustration belong specifically to the ask page. Source of truth: [src/style.css](src/style.css), [src/components.tsx](src/components.tsx), [src/App.tsx](src/App.tsx), and [src/Admin.tsx](src/Admin.tsx).

## Colors

The stylesheet uses hex primitives and semantic aliases. Use the role alias in components.

| Role token | Primitive / exact value | Use |
| --- | --- | --- |
| `--bg` | `--neutral-950`: `#111410` | Page and input background; text on primary button |
| `--surface` | `--neutral-900`: `#181c16` | Ask form, notices, dialog, wallet menu |
| `--hover` | `--neutral-850`: `#21261e` | Neutral controls on hover |
| `--line` | `--neutral-750`: `#343b2e` | Structural separators and badges |
| `--control-border` | `--neutral-600`: `#687360` | Field and secondary-control boundaries |
| `--muted` | `--neutral-400`: `#a0a895` | Descriptions, metadata, secondary labels |
| `--text` | `--neutral-100`: `#e6e9df` | Headings and primary text |
| `--accent`, `--focus` | `--lime-300`: `#d1ec9c` | Primary action, brand punctuation, active indicators, focus ring |
| `--accent-hover` | `--lime-200`: `#e1f6b9` | Primary action hover |
| `--error` | `--red-300`: `#f2a49b` | Errors and invalid field boundaries |
| `--pending` | `--amber-300`: `#e5ca8d` | Pending result text |

All statuses also carry a word and symbol. Yes and No remain neutral; a negative oracle answer is not a transaction failure. Selection uses accent/background. There is one dark theme (`color-scheme: dark`), with a forced-colors focus override. Dialog backdrop is `#050704c9`.

Measured from browser-computed foreground/background pairs: body/page **15.10:1**, muted/page **7.54:1**, hint/form surface **7.01:1**, primary button text/fill **14.31:1**. These are the four tested pairs, not a claim that every state was measured. See the validation record.

## Typography

`--font`: **IBM Plex Mono**, `'SFMono-Regular'`, `Consolas`, `monospace`. Normal 400 and medium 500 are bundled as two Latin WOFF2 files through `@fontsource/ibm-plex-mono`; `font-display: swap`. Both loaded weights were checked in Chromium. Non-Latin characters use the fallback stack. No italic face is shipped.

The root is 16px with unitless line height 1.65 and tabular numbers. The interface intentionally uses compact 12–14px text; supporting explanations remain short. Type tokens: `--text-xs` 12px, `--text-sm` 13px, `--text-base` 14px, `--text-lg` 16px, `--heading` 24px. The ask hero `--display` is `clamp(2rem, 4.3vw, 3.375rem)`; line height 1.22 and tracking −0.065em. H2 uses 1.35 and −0.04em. Page-specific headings reduce the maximum, and smaller terminal titles use 14px.

Eyebrows are uppercase via CSS, 12px with 0.07em tracking. Counters, small badges, and terminal metadata use compact 10–11px where space is limited; they do not carry the only instance of critical instructions. Forms generally use 16px inputs; the desktop textarea is 14px and rises to 16px at the mobile breakpoint to avoid iOS input zoom. Headings balance, descriptions use pretty wrapping, addresses/question text break safely, and labels/badges keep short phrases together. Long-form copy is capped around 65–75ch.

## Layout

`--space-1/2/3/4/6/8/12/16` map to **4/8/12/16/24/32/48/64px** at the base root size. Groups use larger gaps than their internal items. `.container` and `.header-inner` are centered at a maximum of 1120px, with 48px side margins on wide screens. The header is in normal flow and can wrap, including at enlarged text sizes.

The ask form/context grid is 1.75fr/1fr with a 56px gap. The form uses 24px padding; its field is vertically resizable. Question rows use ID/content/status/arrow columns, full-row links, and full question text rather than line clamping. Admin fields are three columns for numeric settings and full-width for addresses. Inputs scroll long values natively; confirmation dialogs show full addresses with wrapping.

| Breakpoint | Implemented behavior |
| --- | --- |
| ≤68rem (1088px at default root) | 32px margins; navigation gets a second header row; ask gap drops to 32px; ASCII font reduces |
| ≤48rem (768px) | 20px margins; hero and ask grid become one column; ASCII art hides; explanatory panel follows the form; question rows become two rows; form inputs use 16px; about/admin grids stack; dialogs and notices wrap |
| ≤23rem (368px) | 16px margins; decorative header mark and terminal index hide; tighter nav and step gaps |

Reflow was checked at 320/390/768/1024/1440px. Source order is also reading order. The final header passed a 200% root-text enlargement check at 1440px. This was not browser-native zoom. Page routing uses hashes and moves focus to the main region; no sticky element blocks the content.

## Elevation & Depth

The interface is deliberately flat. One-pixel borders mark structure and control boundaries, dashed lines separate supporting details, and surfaces are one neutral step above the page. There are no card shadows. The network dot uses a 4px surface-colored halo. The native dialog top layer and dark backdrop isolate confirmation tasks; the account menu uses `z-index: 4`, and the keyboard skip link uses `z-index: 20`.

## Shapes

Controls use 2px corner radii. Panels, lists, and dialogs use square structural outlines. Circular shapes are limited to the network dot and 19px decorative progress markers. Preserve the ASCII brackets, punctuation, and line-based composition; avoid introducing rounded dashboard cards.

## Components

| Component / class | Source | Use and states |
| --- | --- | --- |
| `.primary`, `.secondary`, `.text-button` | `src/style.css` | One filled main action, bordered peer actions, and underlined inline actions; primary minimum height 48px, secondary 44px, text action 40px; disabled and hover states |
| `Modal` | `src/components.tsx` | Native `dialog` with title, close control, native focus containment, Escape and focus return. Close/cancel disabled while requesting a transaction |
| `External`, `AddressLink` | `src/components.tsx` | External link with new-tab announcement; shortened address links include the full address in their title and explorer destination |
| `QuestionRows` | `src/components.tsx` | Public linked rows, pending/yes/no/unanswered text badges, loading and empty states; responsive grid |
| `Steps` | `src/components.tsx` | Ordered connection/payment/question/result explanation with numbered text markers |
| Ask form | `src/App.tsx` | Persistent label, UTF-8 byte count, inline described error, example insertion, fee/balance details, dynamic connect/approve/ask action, three progress steps |
| Notices | `src/App.tsx` | Stable polite transaction status; urgent errors use alerts and recovery actions; explorer link persists for sent transactions |
| Archive tools | `src/App.tsx` | Native search, status select, refresh, numbered page navigation, and exact-ID form; filtering scope is explicitly described |
| Owner forms | `src/Admin.tsx` | Owner-only display, native numeric constraints, address/bytes32 validation, invalid-field focus and descriptions, full-value review before signing |

Visible keyboard focus uses a 2px accent outline offset 4px. The textarea wrapper has a 2px focus-within outline offset 3px. Native buttons, links, labels, selects, details/summary, and dialog carry interaction semantics. Decorative ASCII and arrows are hidden from assistive technology. Hover styles are gated by `(hover: hover)`. The only transitions are 120ms color/background transitions, enabled under `prefers-reduced-motion: no-preference`; there are no staged or looping animations.

## Do’s and Don’ts

- Start new views inside `.container` with a `.page-heading`, one H1, and the shared header/footer. Add a hash route in `App.tsx`; use native links.
- Reuse semantic tokens, monospace type, flat rules, and short factual descriptions. Use the primary fill for the next consequential action.
- Show live fees and exact addresses at transaction review. Distinguish approval from spending and pending/unanswered from a No answer.
- Keep user questions as React text, fully available and safely wrapped. Never interpret them as HTML or Markdown.
- Preserve field labels, focus indicators, explicit status words, error recovery, and 16px mobile inputs.
- Do not add fake activity, hide RPC failure behind empty data, introduce external fonts, or replace owner checks with a hardcoded address.

This document describes the final source and inspected Chromium rendering. Native device, screen-reader, alternate-browser, localization/RTL, and complete focus-pair coverage remain unverified as detailed in `artifacts/validation.md`.
