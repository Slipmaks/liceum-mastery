---
name: Liceum Mastery
description: NMT-format tests for Ukrainian lyceums, drawn in the language of the exam answer sheet.
colors:
  paper: "oklch(0.99 0.003 250)"
  paper-white: "oklch(1 0 0)"
  sheet-cell: "oklch(0.975 0.006 255)"
  muted-paper: "oklch(0.96 0.006 255)"
  graphite: "oklch(0.22 0.015 260)"
  graphite-soft: "oklch(0.5 0.02 260)"
  hairline: "oklch(0.9 0.008 255)"
  cell-rule: "oklch(0.86 0.01 255)"
  ballpoint-ink: "oklch(0.45 0.17 263)"
  ink-wash: "oklch(0.95 0.025 263)"
  ink-deep: "oklch(0.36 0.14 263)"
  focus-ink: "oklch(0.55 0.15 263)"
  lock-red: "oklch(0.53 0.2 27)"
  lock-red-ink: "oklch(0.17 0.03 27)"
  lock-red-soft: "oklch(0.965 0.025 27)"
  caution-amber: "oklch(0.75 0.15 72)"
  caution-amber-text: "oklch(0.47 0.11 60)"
  caution-amber-soft: "oklch(0.965 0.045 85)"
  submitted-green: "oklch(0.5 0.12 150)"
  submitted-green-soft: "oklch(0.965 0.03 150)"
typography:
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
  prompt:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.625
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    fontFeature: "\"tnum\""
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.375
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  cell-numeral:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "\"tnum\""
rounded:
  cell: "2px"
  mark: "4px"
  sm: "0.3rem"
  md: "0.4rem"
  lg: "0.5rem"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ballpoint-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  button-primary-student:
    backgroundColor: "{colors.ballpoint-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    typography: "{typography.body}"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.md}"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.muted-paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.md}"
    height: "48px"
  filter-pressed:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "32px"
  sheet-cell:
    backgroundColor: "{colors.sheet-cell}"
    textColor: "{colors.graphite}"
    textOpacity: 0.75
    rounded: "{rounded.cell}"
    typography: "{typography.cell-numeral}"
    size: "10px 14px"
  sheet-cell-header:
    height: "28px"
  sheet-cell-answered:
    backgroundColor: "{colors.ballpoint-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.cell}"
  sheet-panel-cell:
    backgroundColor: "{colors.sheet-cell}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.md}"
    height: "48px"
  choice-row:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
    height: "56px"
  choice-row-selected:
    backgroundColor: "{colors.ink-wash}"
    textColor: "{colors.graphite}"
  answer-mark:
    backgroundColor: "{colors.sheet-cell}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.mark}"
    size: "32px"
  match-cell:
    backgroundColor: "{colors.sheet-cell}"
    textColor: "{colors.ballpoint-ink}"
    rounded: "0"
    size: "48px"
  match-cell-marked:
    backgroundColor: "{colors.ink-wash}"
    textColor: "{colors.ballpoint-ink}"
  timer:
    backgroundColor: "{colors.muted-paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.md}"
    typography: "{typography.title}"
    padding: "6px 10px"
  timer-warning:
    backgroundColor: "{colors.caution-amber-soft}"
    textColor: "{colors.caution-amber-text}"
  timer-critical:
    backgroundColor: "{colors.lock-red-soft}"
    textColor: "{colors.lock-red}"
  status-locked:
    backgroundColor: "{colors.lock-red}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
  flag-icon:
    textColor: "{colors.caution-amber-text}"
    size: "16px"
  status-submitted:
    backgroundColor: "{colors.submitted-green-soft}"
    textColor: "{colors.submitted-green}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
---

# Design System: Liceum Mastery

## Overview

**Creative North Star: "The Exam Paper"**

Every surface speaks the language of the NMT answer sheet (бланк відповідей): printed numbered cells on cool paper, filled in ballpoint ink. This is a sheet you fill in calmly, not a quiz game. Colour is scarce and always means something: ink is the student's mark, and red, amber and green are states, never decoration.

The world has two densities. The student surface is phone-first and roomy: large targets, an 18px prompt, one question at a time, nothing moving. The teacher surface is desktop-first and dense: a hairline-ruled table that reads a whole class at a glance, with rows needing action sorted to the top.

UI text is Ukrainian throughout. Numbers (timer, counts, cell numbers, times) always use tabular numerals.

**Key Characteristics:**
- Cool paper-white ground, graphite text, never cream.
- One ballpoint-ink blue accent, for "your mark" and the primary action only.
- Status colours with single, fixed meanings.
- The answer-sheet cell as the recurring signature.
- Flat, hairline-ruled surfaces; no shadows doing structural work.
- No animation on the test screen.
- Light and dark follow the system (`prefers-color-scheme`), with no in-app toggle.

## Colors

A near-neutral cool-blue paper and graphite palette carrying one ink accent and three status hues. Canonical values are OKLCH in `src/app/globals.css`; dark-mode equivalents live in the same file under `@media (prefers-color-scheme: dark)` and in the sidecar.

### Primary
- **Ballpoint Ink** (`ballpoint-ink`): answered sheet cells, inked answer marks, the matching-grid cross, the selected-option border, the caret, and the one primary action per view («Далі», «Дозволити продовжити»).
- **Ink Wash** (`ink-wash`): the tinted ground behind a selected option row or a marked matching cell.
- **Focus Ink** (`focus-ink`): focus rings, at 50% opacity, 3px.

### Neutral
- **Paper** (`paper`): the page ground.
- **Paper White** (`paper-white`): cards, option rows, the class table.
- **Sheet Cell** (`sheet-cell`): the faint printed fill of every empty answer cell.
- **Muted Paper** (`muted-paper`): the resting timer, the secondary button, the table header band.
- **Graphite** (`graphite`) and **Graphite Soft** (`graphite-soft`): text and secondary text. The numbers in empty header-strip cells are graphite at 75% opacity (`text-foreground/75`), so they read as printed form, not disabled.
- **Hairline** (`hairline`) and **Cell Rule** (`cell-rule`): dividers and table rules; the slightly darker rule outlines empty cells and inputs.

### Status
- **Lock Red** (`lock-red`, `lock-red-soft`): a locked attempt that needs the teacher (solid badge, tinted row, locked screen), and the timer's final minute. Nothing else.
- **Caution Amber** (`caution-amber-text`, `caution-amber-soft`): the «Можливе списування» flag icon and the timer's last five minutes. Nothing else.
- **Submitted Green** (`submitted-green`, `submitted-green-soft`): a submitted attempt («Здав»). Nothing else.

### Named Rules
**The Ink Means You Rule.** Ballpoint blue marks what the student has written or the action that moves them forward. It never decorates, never labels a category, never fills a status.

**The Status Means One Thing Rule.** Red is locked or under one minute; amber is suspected cheating or under five minutes; green is submitted. A new state gets graphite, not a fourth hue, and no status colour is reused for emphasis.

**The Graphite Selection Rule.** A non-answer selected state (a pressed filter) fills with graphite, so ink stays reserved for marks.

## Typography

**Body Font:** Inter (latin + cyrillic subsets, loaded via `next/font/google` in `src/app/layout.tsx`), used for every role.

**Character:** One neutral sans, set the way a printed exam form is: plain, legible, numbers aligned in columns.

### Hierarchy
- **Headline** (600, 24px, 1.333): screen titles: the monitor's test and class, the locked and finished screens.
- **Prompt** (500, 18px, 1.625): the question prompt on the student screen. Never smaller.
- **Title** (600, 16px, tabular): «Питання 5 з 12» and the timer.
- **Body** (400, 16px, 1.375): option text, matching lists, student buttons.
- **Body Small** (400, 14px): teacher table, meta lines, hints, sidebar.
- **Label** (500, 12px): status badges.
- **Cell Numeral** (600, 12px, tabular, line-height 1): numbers inside header-strip cells.

### Named Rules
**The Tabular Rule.** Every number a user compares or watches change (timer, «4/12», row numbers, times, filter counts) uses `tabular-nums`.

## Layout

Student: a single column capped at 576px (`max-w-xl`), full viewport height (`h-dvh`), 16px side gutter. Fixed header (question number, timer, sheet strip), scrolling question body (20px top), fixed footer with a three-column bar: «Назад» | «Бланк n/12» | «Далі», respecting the bottom safe-area inset. The answer-sheet panel opens inside the footer, above the bar.

Teacher: a 240px sidebar rail from `lg` up; below `lg` the same sections and «Вийти» sit in a one-line top bar; main area 16px gutter, 32px from `lg`. Header, a row of filter buttons with counts, then the class table in a bordered, 8px-radius card that scrolls horizontally when narrow.

**The Two Densities Rule.** Student touch targets are at least 48px tall (option rows 56px, nav buttons 48px, reorder buttons 44px square minimum) with an 18px prompt. Teacher controls use the default dense sizes (32-36px) and 14px table text. Don't carry one density onto the other surface.

## Elevation & Depth

Flat. Depth comes from paper tones (paper, paper white, sheet cell) and hairline borders, not shadows. The only shadow is shadcn's `shadow-xs` on outline buttons. Locked rows are lifted by tint (`lock-red-soft`), not elevation.

## Shapes

Square-ish and printed. Small radii scale with role: answer-strip cells 2px, letter marks 4px, buttons and sheet-panel cells about 6px (`md`), option rows and the table card 8px (`lg`). Matching-grid cells are square with no radius and share collapsed 1px rules, like a printed grid. Badges are 5px (`sm`), not pills.

## Components

### Answer-sheet cell (signature)
The one form behind three uses. An empty cell is `sheet-cell` fill with a `cell-rule` outline; an answered cell is filled solid ink with paper text; the current question gets a 2px ink outline offset outside the cell.
- **Header strip** (student): 12 numbered cells, flexible width, 28px tall, 4px gaps, under the question number; empty-cell numbers in graphite at 75% (`text-foreground/75`).
- **Sheet panel** (student): a 6-column grid of 48px numbered buttons, opened by «Бланк»; shows «Без відповіді: n» and «Завершити тест».
- **Matching grid** (student): rows 1-4 × columns А-Д of 48px square cells; the mark is an ink cross (Lucide `X`, 28px, stroke 2.75) on `ink-wash`.
- **Class strip** (teacher): the same cells at 10×14px, unnumbered, 2px gaps, followed by a tabular «n/12» in the same «Бланк» column (no separate answers column).

### Option rows
Full-width rows, at least 56px, 8px radius, paper-white with a hairline border. A 32px letter mark (А-Е, 4px radius) sits at left and fills with ink when chosen; the row border turns ink and the ground turns `ink-wash`. Ordering questions use the same row with a numbered mark and two 44px ghost arrow buttons.

### Timer
Rounded chip with a clock icon and `mm:ss` in tabular semibold. Muted paper at rest, `caution-amber` under 5 minutes, `lock-red` under 1 minute. It keeps running on the locked screen.

### Buttons
shadcn radix-vega, about 6px radius. Primary is solid ink; outline is paper with a hairline; secondary is muted paper; ghost for row tools. Student buttons are 48px tall with 16px text. Focus is a 3px ring of `focus-ink` at 50%.

### Status badges
5px-radius labels in the table: «Заблоковано» solid red with white text, «Здав» green-soft, «Пише» graphite outline, «Не почав» plain muted text.

### Cheating flag
Not a badge. A 16px amber warning-triangle icon (`caution-amber-text`, `role="img"`, aria-label and title «Можливе списування») sits before the last event text on one line in the «Події» cell, so flagged rows keep the same height as the rest. A legend line under the table explains the icon.

### Class table
shadcn table inside an 8px card: muted header band, hairline row rules, right-aligned tabular numbers. Sort order: locked, then flagged, then name (Ukrainian collation). Locked rows tint `lock-red-soft` with «Дозволити продовжити» inline. Every row keeps one height.

### Navigation
Teacher sidebar: Lucide icon plus label, 14px; the current section gets a `sidebar-accent` (muted grey) fill and medium weight, not ink.

## Do's and Don'ts

### Do:
- **Do** fill a cell with solid ink to mean "answered", and use the same cell on every surface that shows progress.
- **Do** keep student targets at 48px or more and the prompt at 18px.
- **Do** use `tabular-nums` for every timer, count and number column.
- **Do** switch the timer to amber below 5 minutes and red below 1 minute.
- **Do** sort the class locked, then flagged, then by name, and give locked rows the inline unlock action.
- **Do** write all UI text in Ukrainian.
- **Do** define every colour as a token in `globals.css` with a dark-mode value under `prefers-color-scheme`.

### Don't:
- **Don't** use ballpoint blue for anything but the student's mark, the current-cell outline, focus, or the primary action.
- **Don't** use red, amber or green outside their single meanings, or add a fourth status hue.
- **Don't** animate anything on the test screen: no progress bars, transitions, confetti or entrance motion.
- **Don't** use cream or warm paper tones; the paper is cool.
- **Don't** add shadows to show hierarchy; use paper tone and hairlines.
- **Don't** turn the answer sheet into a progress bar or percentage.
- **Don't** put a text badge on the cheating flag; it is an icon explained by the legend, and it must not change row height.
