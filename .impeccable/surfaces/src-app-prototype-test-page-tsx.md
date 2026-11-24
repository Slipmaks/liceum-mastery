---
version: 1
slug: "src-app-prototype-test-page-tsx"
primary_target: "src/app/prototype/test/page.tsx"
related_targets: ["src/app/prototype/monitor/page.tsx"]
---

# Exam surfaces: student test screen and teacher live monitor

Scope: two prototype routes, `/prototype/test` (student, phone first) and `/prototype/monitor` (teacher, desktop first). Mode: Operate. Mock data, labelled as demo data. They become the base for the real screens.

Audience and job:
- A student aged 14–17 on their own phone in a classroom answers 12 NMT-format questions under a server timer. They have one attempt, and switching apps locks it.
- A teacher on a laptop in the same room watches 25–30 students live. They spot who is locked or flagged and unlock them.

Constraints: UI text is Ukrainian. Use shadcn/ui (radix-vega), Tailwind 4, Inter and Lucide. The test has no animation. The timer turns amber at 5 min and red at 1 min. Dark mode follows the system. Correct answers never reach the client.

## Direction contract

THESIS: The exam paper, not the quiz app. Both screens speak the language of the NMT answer sheet (бланк відповідей): numbered cells, and ink marks in a grid. This replaces the category default of colourful quiz cards with a progress bar and confetti.

OWN-WORLD:
- Cool paper-white ground, never cream. Graphite text.
- One accent, ballpoint-ink blue: the colour students fill the sheet with. It means "your mark" or the primary action, and nothing else.
- Status colours carry meaning only: red means locked and needs the teacher; amber means «можливе списування» and the 5-minute timer; green means submitted.
- Hairline grid rules and square-ish cells with a small radius. Inter throughout, with tabular numerals for the timer, counts and cell numbers.

STORY:
- The student always knows which question this is, how much time is left, and which questions are answered. They answer and move on.
- The teacher sees the whole class's state in one glance, and the student needing action surfaces to the top.

FIRST VIEWPORT:
- Student (390×844): a top strip with the question number «Питання 5 з 12» and the timer at right. Below it the prompt in 18 px, then the answer area: options as full-width 56 px rows, or the NMT matching grid (rows 1–4 × columns А–Д). At the bottom, a fixed bar with «Назад» and «Далі» and the answer-sheet toggle that opens the 12-cell grid.
- Teacher (1440): a left rail with navigation, then a header with test, class, time left and live counts. Below that the class table: each row is a student, status, an answer-sheet strip of M cells, events and the flag, with «Дозволити продовжити» inline on locked rows. Locked rows sort first.

FORM: The NMT answer sheet as the signature move. The same cell grid appears as the student's navigator, as the matching grid, and as the teacher's per-student progress strip. seed: none (pinned) — the user approved «спокойний "екзаменаційний" стиль ... нейтральна база і один спокійний синій акцент ... режим фокусу ... нумерована сітка питань і букви А–Д як у НМТ».

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
