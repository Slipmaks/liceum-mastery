// Self-check for scoring and secrets. Run: pnpm check
import assert from "node:assert/strict";
import { grade12, scoreAnswer } from "./scoring.ts";
import { hashSecret, verifySecret } from "./secret.ts";

const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `o${i + 1}`, text: "" }));
const one = { type: "one" as const, points: 1, data: { options: opts(4), correct: ["o2"] } };
const many = { type: "many" as const, points: 3, data: { options: opts(6), correct: ["o1", "o2", "o3"] } };
const items = (p: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${p}${i + 1}`, text: "" }));
const match = { type: "match" as const, points: 4, data: { left: items("l", 4), right: items("r", 5), pairs: { l1: "r1", l2: "r2", l3: "r3", l4: "r4" } } };
const order = { type: "order" as const, points: 3, data: { items: items("i", 3) } };

assert.equal(scoreAnswer(one, ["o2"]), 1);
assert.equal(scoreAnswer(one, ["o1"]), 0);
assert.equal(scoreAnswer(one, ["o2", "o1"]), 0, "one: picking two never scores");
assert.equal(scoreAnswer(many, ["o1", "o2", "o3"]), 3);
assert.equal(scoreAnswer(many, ["o1", "o2"]), 2);
assert.equal(scoreAnswer(many, ["o1", "o2", "o4"]), 1, "one wrong pick cancels one hit");
assert.equal(scoreAnswer(many, ["o4", "o5", "o6"]), 0, "never below zero");
assert.equal(scoreAnswer(many, ["o1", "o2", "o3", "o4", "o5", "o6"]), 0, "picking everything scores 0");
assert.equal(scoreAnswer(match, { l1: "r1", l2: "r2", l3: "r3", l4: "r4" }), 4);
assert.equal(scoreAnswer(match, { l1: "r1", l2: "r5" }), 1);
assert.equal(scoreAnswer(order, ["i1", "i2", "i3"]), 3);
assert.equal(scoreAnswer(order, ["i1", "i3", "i2"]), 1);
assert.equal(scoreAnswer(order, { i1: "x" }), 0, "wrong shape scores 0");
assert.equal(grade12(0, 20), 1);
assert.equal(grade12(20, 20), 12);
assert.equal(grade12(10, 20), 6);

const h = await hashSecret("1234");
assert.ok(await verifySecret("1234", h));
assert.ok(!(await verifySecret("1235", h)));
assert.ok(!(await verifySecret("1234", "garbage")));

console.log("ok");
