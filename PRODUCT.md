# Liceum Mastery: product and design

A web platform where students in Ukrainian schools take teacher-made tests in NMT format. It also gives teachers a shared bank of study materials. This document records every decision taken in the design interview. Every item here is settled. To change one, edit it here first.

Status: **demo**. It runs on free tiers only. One school is a playground and the second proves that schools are isolated from each other.

## Stack

- **Next.js** (App Router, TypeScript) as a single deploy. Server code lives in route handlers and server actions. Correct answers, the timer and scoring stay on the server.
- **Postgres on Neon** (Free plan, Frankfurt), accessed through **Drizzle**. The Free plan gives 1 GB per project and 100 CU-hours a month, and the database scales to zero after 5 minutes idle. Expected volume is about 100 MB a year for a 1000-student school, so storage is not the constraint.
- **Vercel Hobby**, with functions in `fra1` next to the database. Hobby allows **non-commercial use only**. Once schools rely on the platform or pay for it, move to Vercel Pro or a VPS. Use plain Next.js and no Vercel-specific APIs, so that move stays possible.
- **Auth is our own code**: a session token in an httpOnly cookie, with only its SHA-256 stored in the database. Passwords and PINs are hashed with scrypt (`node:crypto`). No auth library is needed for email + password and PIN; Neon Auth / Better Auth were rejected because the student PIN flow and the one-session anti-cheat rule need full control over sessions. A staff session lasts 30 days, a student session 8 hours. Expired sessions are swept on login (no cron).
- **No cron.** Vercel Hobby cron runs only daily, so overdue attempts are finalised lazily, on the next request that touches them (see [Attempt lifecycle](#attempt-lifecycle)).
- **No WebSockets.** The teacher monitor polls every 5 s.
- **UI is shadcn/ui** on Tailwind 4, with Radix primitives, the `vega` preset, Lucide icons and Inter (latin + cyrillic). Components are copied into `src/components/ui` one at a time, when a screen needs them (`pnpm dlx shadcn@latest add <name>`). Astryx (Meta) was rejected while it is in beta.

UI text is Ukrainian. Student screens are designed for phones first and teacher screens for desktop first.

## Tenancy

- There are many schools and no subdomains. Every school-owned row carries `school_id`, and every query filters by the `school_id` of the session.
- A teacher's email identifies their school. A class code is unique across the whole system, so the code alone identifies the school for a student.
- **The super-admin (the developer) creates schools and their directors by script.** There is no public sign-up and no super-admin UI.

## People and permissions

**Rank**: Director (exactly one per school) > Deputy (завуч) > Teacher. A user may change only users of strictly lower rank, plus their own profile. Changing the director goes through the super-admin.

**Homeroom teacher** (класний керівник) is not a rank. It is a teacher set as `classes.homeroom_teacher_id`, and one teacher may lead several classes. Homeroom rights apply only to that teacher's own classes.

"Admin" means Director or Deputy. They have the same rights over tests and results.

| Action | Director | Deputy | Teacher | Homeroom (own class) | Student |
|---|---|---|---|---|---|
| Invite / edit / remove deputies | ✓ | — | — | — | — |
| Invite / edit / remove teachers | ✓ | ✓ | — | — | — |
| Create classes, set homeroom teacher | ✓ | ✓ | — | — | — |
| Manage class roster (add, archive, move, reset PIN) | ✓ | ✓ | — | ✓ | — |
| Manage subjects | ✓ | ✓ | — | — | — |
| Create tests, copy any school test | ✓ | ✓ | ✓ | ✓ | — |
| Read any school test (read-only) | ✓ | ✓ | ✓ | ✓ | — |
| Open a test to a class | ✓ | ✓ | own tests | own tests | — |
| Monitor, unlock an attempt | ✓ | ✓ | own tests | own class | — |
| See results | all | all | own tests | own class | — |
| Grant a retake | ✓ | ✓ | own tests | own class | — |
| Add materials | ✓ | ✓ | ✓ | ✓ | — |
| Edit / delete materials | ✓ | ✓ | own | own | — |
| See materials | ✓ | ✓ | ✓ | ✓ | — (deferred) |
| Take a test | — | — | — | — | opened to them |

### Teacher accounts

Directors and deputies enter a teacher's email and get an **invite link valid for 7 days**. They send it themselves through Viber or Telegram, because the demo sends no email. On the link the teacher sets a name and password (at least 8 characters) and is logged in. Later only the delivery changes: Resend sends the same link.

- Only the token's SHA-256 is stored, so the link is shown once, when it is created. A new link for the same email replaces the old one; a pending link can be cancelled.
- A director invites deputies and teachers, a deputy invites teachers. An email that already has an account cannot be invited.
- **Staff who leave are archived («Звільнити»), never deleted**, like students: their tests, assignments and results stay. They are logged out at once and cannot log in, and they stop being homeroom teacher of any class. An admin who outranks them can restore them from the archive on the school page.
- Everyone edits their own name and title, and changes their password with the current one; that logs out their other devices. A forgotten staff password has no reset flow yet: an admin archives the account and sends a new invite to another email, or the super-admin resets it.

### Student accounts

- The class roster is created **in advance** by the homeroom teacher or an admin. Students do not sign themselves up, because anyone with the class code could otherwise take someone's single attempt.
- On first login a student enters the class code, picks their name from the roster and sets a PIN of 4 digits. On later logins they pick their name and enter the PIN.
- After 5 wrong PINs the student is locked out for 15 minutes. If a PIN is lost, the homeroom teacher resets it; the reset also lifts a lockout and ends the student's sessions.
- Students are added to a class as a list of names, one per line. A class code is 6 characters without look-alikes (no 0/O, 1/I/L), generated when the class is created. Class names are unique within a school.
- A student who leaves is **archived, never deleted**, so their attempts stay. A student who changes class is moved, and each attempt keeps a snapshot of the `class_id` it started in.

## Tests

**Question types** follow NMT format. Each question has a teacher-set weight `points`, and partial credit is the default:

| Type | Student does | Score |
|---|---|---|
| `one` | picks one option | `points` if correct, else 0 |
| `many` | picks several options | `points × max(0, (hits − wrong picks) / correct count)` |
| `match` | pairs each left item with a right item; there are extra right items, as in NMT (4 left, 5 right) | `points × correct pairs / left count` |
| `order` | arranges items in order | `points × items in the correct position / item count` |

- **Grade** on the 12-point scale: `max(1, round(12 × score / max))`. Per-test threshold tables are deferred.
- A test has a subject, a grade level (паралель, e.g. 9), a topic, a title and a time limit. Questions **live inside their test**, and there is no shared question bank. To reuse questions, a teacher copies the test.
- **Lock on first open.** A test is a `draft` until it is first opened to any class, and from then on it is `locked` and read-only. To change it, the teacher makes a copy. Scores are never recalculated after the fact.
- All teachers of a school can read every school test and copy it to themselves.
- **Subjects** are per school. A new school is seeded with standard subjects, and admins can add more. A subject no test or material uses can be deleted.
- Builder: one page with the test metadata and a list of questions; a teacher adds a question by choosing its type. Drafts autosave. "Переглянути як учень" (preview as a student) is available.
  - Only the author edits their own draft. Anyone on the staff can copy any school test; the copy is a draft of theirs titled «… (копія)». The author can delete a draft; a locked test is never deleted.
  - A new question starts in NMT shape: 4 options (`one`), 5 options (`many`), 4 rows × 5 letters (`match`), 4 items (`order`). Up to 8 items per list.
  - A draft saves while half-written. Before the first «Відкрити для класу» it must be ready: a title, at least one question, and in each question a prompt, points above 0, no empty item, and a complete key (one correct option for `one`, at least one for `many`, a distinct letter for every `match` row with at least as many letters as rows). The builder and the test page list what is missing, and the server refuses to open a test that is not ready.
  - The preview shuffles like a real attempt and saves nothing: no attempt, no events, no submit.
- **No images.** LaTeX via KaTeX is deferred until a subject needs it.

## Assignments

An assignment is a test opened to a class: `test + class + whole_class flag + student list`.

- The teacher opens and closes the test **by hand**, during the lesson. Until it is opened, a student does not see the test exists.
- If `whole_class` is set, students who join the class later see the test too. Otherwise only the listed students see it.
- While the test is open, the teacher can add students to the list.
- A student who was absent gets a **new assignment** for that one student, not a retake.
- `whole_class` is an explicit flag. An empty list never means "everyone", so removing the last listed student never opens the test to the whole class.

## Taking a test

- **One attempt.** Starting it fixes `deadline_at = started_at + time limit` on the server. The timer never pauses.
- A student sees one question per screen with a grid of question numbers. They can move freely and change answers until they submit or time runs out.
- **Every answer is saved to the server at once.** Nothing is lost if the device dies.
- Question order and option order are shuffled **per student**. The shuffle is stored on the attempt.
- `match` is an NMT answer grid (rows 1–4 × letters А–Д, 48 px cells, an ink cross marks the choice) and `order` uses ↑/↓ buttons. Drag-and-drop is not used. Visual rules live in `DESIGN.md`.
- An `order` question counts as answered once the student moves an item or confirms the current order; the shuffled starting order is not an answer until confirmed.
- «Завершити» on the last question opens the answer sheet, which shows how many questions have no answer; the test is submitted from there. A locked attempt cannot be submitted.
- The browser never receives correct answers. The server strips them before sending questions.
- After submitting, the student sees confirmation («Вітаю! Ви завершили тест», or a clear notice if time ran out or the teacher closed the test). The student is never shown a score or correct answers.

### Anti-cheat

Prevention:
- per-student shuffle;
- **one active session per student**: a login from another device while an attempt is in progress is refused and logged;
- text selection, copy, cut, paste and the context menu are disabled; the attempts are still logged;
- fullscreen is requested on desktop. iOS Safari does not support it, so on iPhone the event log is the only protection.

Every client event is recorded in `attempt_events` with its time. Pagehide is sent through `navigator.sendBeacon`.

| Event | Locks the attempt | Flags it |
|---|---|---|
| tab hidden / app minimised (`visibilitychange`) | ✓ | ✓ |
| page closed (`pagehide`) | ✓ | ✓ |
| attempt page reopened while in progress (covers a dead phone, where no pagehide arrived). The first open after the start or after an unlock is not a reopen. | ✓ | ✓ |
| fullscreen exited | ✓ | ✓ |
| login from a second device | ✓ | ✓ |
| focus lost (`blur`), each time | — | ✓ |
| copy / cut / paste / context menu attempt | — | ✓ |

- **Locked** means the student sees «Зверніться до вчителя» and the server refuses their answers. The timer keeps running. A teacher who may monitor the attempt presses «Дозволити продовжити», and the unlock is logged as an event too. The locked screen polls every 5 s and returns to the test by itself.
- **Switching devices** (a phone died mid-test): the login on the new device is refused and locks the attempt. When the lock came from that second-device login, the unlock also ends the student's sessions, so they can log in on the new device, and the first open there is not a reopen. One unlock is enough. Other unlocks keep the session, so a student who swiped a notification does not have to log in again.
- **Flagged** («можливе списування») is set automatically on any event and cannot be removed. A teacher can add a comment to it, but the grade stays the teacher's call and the system never zeroes it.
- Expect flags on honest phone users, for example from a notification shade or an incoming call. The flag is information, not a verdict.

### Attempt lifecycle

`in_progress` ⇄ `locked` → `finished`

An attempt becomes `finished` when one of these happens:
- the student submits;
- the deadline passes;
- the teacher closes the assignment.

Without cron, an attempt past its deadline is finalised on the next request that touches it: the student's own request, the monitor, or the report. Answers saved after `deadline_at` are rejected.

### Retakes

- A retake is granted by the test's author, the homeroom teacher of the student's class, or an admin. A comment is required («хворів», «заблоковано помилково»).
- A grant allows exactly one more attempt. **The last attempt counts**, and earlier attempts stay in history with their events.
- A retake may be granted after the assignment is closed («хворів»). The closed assignment then shows up again for that student only, until the grant is used, and closing does not end an attempt that started after the close; it runs to its own deadline.
- A grant is given on the student's attempt page, only on their last finished attempt and only if no earlier grant is still unused.

## Teacher views

- **Who sees what.** Admins see every assignment of the school; a teacher sees the assignments of their own tests; a homeroom teacher sees every assignment opened to their class. Only admins and the test's author open and close a test.
- **Monitor** for an open assignment. It polls every 5 s and shows, per student: status (не почав / пише / заблоковано / здав), answered N of M, event count, the flag, and an unlock button. Closing the test asks for confirmation, because it ends every running attempt.
- **Report**: a table of students × questions with points, total, 12-point grade, flag, retake marker, and a bottom row with the % correct for each question (the share of finished students with full points on it). It exports to CSV in UTF-8 with a BOM so Excel shows Cyrillic correctly, with `;` as the separator and decimal commas, as Excel expects in the Ukrainian locale.
- **Attempt page**: the event log, each answer next to the key, the teacher's comment on the flag, the student's attempts and retake grants.

## Materials bank

- In the demo, materials are **links only**: video, presentation, document or website. Files are not stored yet; stored view-only files are the target (see [Deferred](#deferred-and-why)).
- Fields: title, URL, type, subject, grade level, topic, author. The page filters on every field and searches by title.
- Visible to all of the school's teachers and admins, and not yet to students.
- Any teacher or admin adds a material. The author edits and deletes their own; admins edit and delete any.
- Only `http://` and `https://` links are accepted, because the link is rendered as-is.
- Grade is optional («Будь-який»). The topic and author filters offer only values that some material already has.

## Data model

All `id`s are integers. All school-owned tables carry `school_id`. Timestamps are `timestamptz`.

```
schools        id, name
users          id, school_id, email (unique), name, password_hash, rank (director|deputy|teacher), title, archived_at
invites        token_hash, school_id, email, rank, invited_by, expires_at, used_at
sessions       id (sha256 of token), user_id | student_id, expires_at
subjects       id, school_id, name
classes        id, school_id, name ("9-А"), grade, code (globally unique), homeroom_teacher_id → users
students       id, school_id, class_id, name, pin_hash (null until first login), failed_pins, locked_until, archived_at
tests          id, school_id, author_id, subject_id, grade, topic, title, time_limit_min, status (draft|locked)
questions      id, test_id, position, type (one|many|match|order), prompt, points, data jsonb
assignments    id, test_id, class_id, opened_by, opened_at, closed_at, whole_class
assignment_students  assignment_id, student_id
retake_grants  id, assignment_id, student_id, granted_by, reason, created_at
attempts       id, assignment_id, student_id, class_id (snapshot), started_at, deadline_at, finished_at,
               status (in_progress|locked|finished), shuffle jsonb, score, max_score, flagged, teacher_comment
answers        attempt_id, question_id, response jsonb, points, updated_at      PK (attempt_id, question_id)
attempt_events id, attempt_id, type, at, meta jsonb
materials      id, school_id, author_id, subject_id, grade, topic, type, title, url
```

`questions.data` holds the correct answer, and only the server reads it:
- `one` / `many`: `{ options: [{id, text}], correct: [id] }`
- `match`: `{ left: [{id, text}], right: [{id, text}], pairs: { leftId: rightId } }` (right may be longer than left)
- `order`: `{ items: [{id, text}] }`, stored in the correct order

A student may start an attempt while `attempts for (assignment, student)` < 1 + `retake_grants for (assignment, student)`.

## Demo data

- **Ліцей 1** (playground): a director, a deputy, 2 teachers (one is the homeroom teacher of 9-А), 2 classes of 8–10 students, and 3 tests covering all 4 question types. One test already has results, to show the report, and another is open to 9-А right now, so the student quick login has a test to take. The home page has quick-login buttons for each role. They log in only as the seeded Ліцей 1 accounts, so without the seed they do nothing. Every seeded user has the password `demo1234`, every seeded student the PIN `1234`.
- **Ліцей 2**: a director and one teacher, with normal login. It exists to show that schools cannot see each other.

## Deferred, and why

| Deferred | Reason / trigger to add |
|---|---|
| Import tests and rosters from Excel | Next iteration. Parse in the browser with `read-excel-file` (.xlsx only, since we set the format) and re-validate on the server with zod. Format: one row per question with columns `Type · Question · Option 1…8 · Correct · Points`. `match` options are written as `left = right` (an extra right item as `= Д`), and `order` options in the correct order. Ship a template that shows all 4 types. A separate Go/Rust parser service was rejected: parsing a 100-row file takes milliseconds in the browser. |
| .xlsx export | Comes with import. CSV covers the demo. |
| Email delivery of invites | Needs Resend and a verified sending domain. The invite link is copied by hand for now. |
| OAuth / MFA | Not needed for the demo. Google login is a candidate if a school has Google Workspace for Education. |
| School-year rollover (promote 9-А → 10-А) | After the demo. |
| KaTeX formulas | When a math or physics teacher needs them. |
| 12-point threshold tables per test | Linear grading is enough for the demo. |
| Materials for students | Needs a decision on which materials each class sees. |
| Materials as stored files, view only | The target form of the materials bank: files are uploaded and stored, and users can only view them in the browser, never download them. Needs object storage (candidate: Cloudflare R2, free tier, no egress fees). The browser never gets a direct file URL: files are served through the app, which checks the session and `school_id`, with no download button and `Content-Disposition: inline`. View-only is a deterrent, not a guarantee: a screenshot or a dev-tools save is always possible. Choosing to render documents as page images (no downloadable original) is part of that iteration's design. |
| Subdomains | Only a cosmetic sign later. The data model does not change. |
| Scheduled auto-open of tests | Teachers open tests by hand in the lesson. |
