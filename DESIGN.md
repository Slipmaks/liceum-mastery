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

<!-- impeccable:design-map -->
Name: Liceum Mastery
Colors: primary: ballpoint-ink oklch(0.45 0.17 263); neutral: paper oklch(0.99 0.003 250); status: lock-red oklch(0.53 0.2 27); primary: ink-wash oklch(0.95 0.025 263) (+15 more in the sidecar)
Fonts: Inter (headline, prompt, title, body, body-sm, label, cell-numeral)
Spacing: hair 2px, xs 4px, sm 8px, md 12px, lg 16px, xl 20px, 2xl 32px
Radius: cell 2px, mark 4px, sm 0.3rem, md 0.4rem, lg 0.5rem
North Star: "The Exam Paper"
Rules:
- The Ink Means You Rule. Ballpoint blue marks what the student has written or the action that moves them forward.
- The Status Means One Thing Rule. Red is locked or under one minute; amber is suspected cheating or under five minutes; green is submitted.
- The Graphite Selection Rule. A non-answer selected state (a pressed filter) fills with graphite, so ink stays reserved for marks.
- The Tabular Rule. Every number a user compares or watches change (timer, «4/12», row numbers, times, filter counts) uses `tabular-nums`.
- The Two Densities Rule. Student touch targets are at least 48px tall (option rows 56px, nav buttons 48px, reorder buttons 44px square minimum) with an 18px prompt.
Don't:
- Don't use ballpoint blue for anything but the student's mark, the current-cell outline, focus, or the primary action.
- Don't use red, amber or green outside their single meanings, or add a fourth status hue.
- Don't animate anything on the test screen: no progress bars, transitions, confetti or entrance motion.
- Don't use cream or warm paper tones; the paper is cool.
- Don't add shadows to show hierarchy; use paper tone and hairlines.
- Don't turn the answer sheet into a progress bar or percentage.
- Don't put a text badge on the cheating flag; it is an icon explained by the legend, and it must not change row height.
Do:
- Do fill a cell with solid ink to mean "answered", and use the same cell on every surface that shows progress.
- Do keep student targets at 48px or more and the prompt at 18px.
- Do use `tabular-nums` for every timer, count and number column.
- Do switch the timer to amber below 5 minutes and red below 1 minute.
- Do sort the class locked, then flagged, then by name, and give locked rows the inline unlock action.
- Do write all UI text in Ukrainian.
- (+1 more)
Map: src/app/globals.css
Map: src/app/layout.tsx
Full: .impeccable/design-full.md (read a section when you need its detail)
