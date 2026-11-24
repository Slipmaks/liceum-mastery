// Tables mirror the data model in PRODUCT.md. Column names are camelCase here and snake_case in Postgres (casing in db/index.ts).
import { boolean, check, index, uniqueIndex, integer, jsonb, pgEnum, pgTable, primaryKey, real, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const id = () => integer().primaryKey().generatedAlwaysAsIdentity();
const at = () => timestamp({ withTimezone: true });
const createdAt = () => at().notNull().defaultNow();
const schoolId = () => integer().notNull().references(() => schools.id);

export const rank = pgEnum('rank', ['director', 'deputy', 'teacher']);
export const questionType = pgEnum('question_type', ['one', 'many', 'match', 'order']);
export const testStatus = pgEnum('test_status', ['draft', 'locked']);
export const attemptStatus = pgEnum('attempt_status', ['in_progress', 'locked', 'finished']);
export const materialType = pgEnum('material_type', ['video', 'presentation', 'document', 'website']);

export const schools = pgTable('schools', {
	id: id(),
	name: text().notNull(),
	createdAt: createdAt()
});

export const users = pgTable(
	'users',
	{
		id: id(),
		schoolId: schoolId(),
		email: text().notNull().unique(),
		name: text().notNull(),
		passwordHash: text().notNull(),
		rank: rank().notNull(),
		/** Display title only («Директор», «Заступник з НВР»); rights come from rank. */
		title: text(),
		createdAt: createdAt()
	},
	t => [
		// One director per school.
		uniqueIndex('users_one_director').on(t.schoolId).where(sql`${t.rank} = 'director'`)
	]
);

export const invites = pgTable('invites', {
	tokenHash: text().primaryKey(),
	schoolId: schoolId(),
	email: text().notNull(),
	rank: rank().notNull(),
	invitedBy: integer().notNull().references(() => users.id),
	expiresAt: at().notNull(),
	usedAt: at()
});

export const subjects = pgTable('subjects', {
	id: id(),
	schoolId: schoolId(),
	name: text().notNull()
});

export const classes = pgTable('classes', {
	id: id(),
	schoolId: schoolId(),
	/** «9-А» */
	name: text().notNull(),
	grade: integer().notNull(),
	/** Unique across all schools: the code alone identifies the school at student login. */
	code: text().notNull().unique(),
	homeroomTeacherId: integer().references(() => users.id)
});

export const students = pgTable(
	'students',
	{
		id: id(),
		schoolId: schoolId(),
		classId: integer().notNull().references(() => classes.id),
		name: text().notNull(),
		/** Null until the student sets a PIN on first login. */
		pinHash: text(),
		failedPins: integer().notNull().default(0),
		lockedUntil: at(),
		/** Students are archived, never deleted: their attempts stay. */
		archivedAt: at(),
		createdAt: createdAt()
	},
	t => [index('students_class').on(t.classId)]
);

/** id is the SHA-256 of the cookie token; the token itself is never stored. Exactly one owner. */
export const sessions = pgTable(
	'sessions',
	{
		id: text().primaryKey(),
		userId: integer().references(() => users.id),
		studentId: integer().references(() => students.id),
		expiresAt: at().notNull()
	},
	t => [check('sessions_one_owner', sql`(${t.userId} is null) <> (${t.studentId} is null)`)]
);

export const tests = pgTable('tests', {
	id: id(),
	schoolId: schoolId(),
	authorId: integer().notNull().references(() => users.id),
	subjectId: integer().notNull().references(() => subjects.id),
	grade: integer().notNull(),
	topic: text().notNull().default(''),
	title: text().notNull(),
	timeLimitMin: integer().notNull(),
	/** draft until first opened to a class; locked tests are read-only, change a copy instead. */
	status: testStatus().notNull().default('draft'),
	createdAt: createdAt()
});

type Item = { id: string; text: string };
/** Holds the correct answer. Server-only: strip before sending a question to a student. */
export type QuestionData =
	| { options: Item[]; correct: string[] } // one, many
	| { left: Item[]; right: Item[]; pairs: Record<string, string> } // match; right may be longer than left
	| { items: Item[] }; // order, stored in the correct order

export const questions = pgTable(
	'questions',
	{
		id: id(),
		testId: integer().notNull().references(() => tests.id, { onDelete: 'cascade' }),
		position: integer().notNull(),
		type: questionType().notNull(),
		prompt: text().notNull(),
		points: real().notNull().default(1),
		data: jsonb().notNull().$type<QuestionData>()
	},
	t => [index('questions_test').on(t.testId, t.position)]
);

export const assignments = pgTable('assignments', {
	id: id(),
	testId: integer().notNull().references(() => tests.id),
	classId: integer().notNull().references(() => classes.id),
	openedBy: integer().notNull().references(() => users.id),
	openedAt: createdAt(),
	closedAt: at(),
	/** Explicit flag: an empty student list never means "everyone". */
	wholeClass: boolean().notNull()
});

export const assignmentStudents = pgTable(
	'assignment_students',
	{
		assignmentId: integer().notNull().references(() => assignments.id),
		studentId: integer().notNull().references(() => students.id)
	},
	t => [primaryKey({ columns: [t.assignmentId, t.studentId] })]
);

/** Each grant allows one more attempt: attempts < 1 + grants. */
export const retakeGrants = pgTable('retake_grants', {
	id: id(),
	assignmentId: integer().notNull().references(() => assignments.id),
	studentId: integer().notNull().references(() => students.id),
	grantedBy: integer().notNull().references(() => users.id),
	reason: text().notNull(),
	createdAt: createdAt()
});

export type Shuffle = { questions: number[]; options: Record<number, string[]> };

export const attempts = pgTable(
	'attempts',
	{
		id: id(),
		assignmentId: integer().notNull().references(() => assignments.id),
		studentId: integer().notNull().references(() => students.id),
		/** Class at start, so reports stay correct after the student moves. */
		classId: integer().notNull().references(() => classes.id),
		startedAt: createdAt(),
		deadlineAt: at().notNull(),
		finishedAt: at(),
		status: attemptStatus().notNull().default('in_progress'),
		shuffle: jsonb().notNull().$type<Shuffle>(),
		score: real(),
		maxScore: real().notNull(),
		/** «можливе списування»: set by any attempt event, never cleared. */
		flagged: boolean().notNull().default(false),
		teacherComment: text()
	},
	t => [index('attempts_assignment_student').on(t.assignmentId, t.studentId)]
);

export const answers = pgTable(
	'answers',
	{
		attemptId: integer().notNull().references(() => attempts.id),
		questionId: integer().notNull().references(() => questions.id),
		response: jsonb().notNull(),
		points: real().notNull().default(0),
		updatedAt: createdAt()
	},
	t => [primaryKey({ columns: [t.attemptId, t.questionId] })]
);

/** Event types and which of them lock an attempt: PRODUCT.md › Anti-cheat. */
export const attemptEvents = pgTable(
	'attempt_events',
	{
		id: id(),
		attemptId: integer().notNull().references(() => attempts.id),
		type: text().notNull(),
		at: createdAt(),
		meta: jsonb()
	},
	t => [index('attempt_events_attempt').on(t.attemptId)]
);

export const materials = pgTable('materials', {
	id: id(),
	schoolId: schoolId(),
	authorId: integer().notNull().references(() => users.id),
	subjectId: integer().notNull().references(() => subjects.id),
	grade: integer(),
	topic: text().notNull().default(''),
	type: materialType().notNull(),
	title: text().notNull(),
	url: text().notNull(),
	createdAt: createdAt()
});
