// Unit tests for the pure maths: run with `npm test` (needs Node 20+).
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
const ctx = vm.createContext({ db: { officialHcp: null } });
for (const f of ["utils", "handicap"])
  vm.runInContext(
    fs.readFileSync(path.join(root, "js", f + ".js"), "utf8"),
    ctx,
  );
const get = (name) => vm.runInContext(name, ctx);
const near = (a, b, eps = 0.001) =>
  assert(Math.abs(a - b) < eps, `${a} is not close to ${b}`);
const diffs = (...values) => values.map((value) => ({ diff: { value } }));
const round = (over = {}) => ({
  pars: Array(18).fill(4),
  scores: Array(18).fill(5),
  cr: 72,
  slope: 113,
  ...over,
});

test("validStrokeIndices", () => {
  const v = get("validStrokeIndices");
  assert.equal(v([1, 3, 5, 7, 9, 11, 13, 15, 17], 9), true);
  assert.equal(v([1, 3, 5, 7, 9, 11, 13, 15, 19], 9), false);
  assert.equal(v([1, 3, 5, 7, 9, 11, 13, 15, 15], 9), false);
  assert.equal(v(Array(9).fill(null), 9), true);
  assert.equal(
    v(
      Array.from({ length: 18 }, (_, i) => i + 1),
      18,
    ),
    true,
  );
});

test("hcpFromDiffs follows the WHS lowest-differentials table", () => {
  const h = get("hcpFromDiffs");
  assert.equal(h(diffs(10, 12, 14)), 8); // 3 rounds: lowest 1, minus 2.0
  assert.equal(h(diffs(10, 11, 12, 13, 14, 15)), 9.5); // 6 rounds: lowest 2, minus 1.0
  assert.equal(h(diffs(...Array.from({ length: 20 }, (_, i) => i + 1))), 4.5); // 20 rounds: lowest 8
  assert.equal(h([]), null);
});

test("plus handicaps are not clamped to zero", () => {
  assert.equal(get("hcpFromDiffs")(diffs(-3, -3, -3)), -5);
});

test("18-hole differential", () => {
  const d = get("handicapRoundDifferential")(
    round({ scores: Array(18).fill(5), cr: 71, slope: 130 }),
    null,
  );
  near(d.value, ((90 - 71) * 113) / 130);
  assert.equal(d.adjustmentAvailable, false);
});

test("9-hole differential is doubled and flagged approximate", () => {
  const d = get("handicapRoundDifferential")(
    { pars: Array(9).fill(4), scores: Array(9).fill(5), cr: 35.5, slope: 125 },
    null,
  );
  near(d.value, (((45 - 35.5) * 113) / 125) * 2);
  assert.equal(d.approx, true);
});

test("net double bogey caps a blow-up hole", () => {
  const scores = Array(18).fill(5);
  scores[0] = 12; // stroke index 1
  const r = round({
    scores,
    strokeIndices: Array.from({ length: 18 }, (_, i) => i + 1),
  });
  const d = get("handicapRoundDifferential")(r, 20);
  assert.equal(d.courseHcp, 20);
  assert.equal(d.gross, 97);
  assert.equal(d.adjusted, 93); // hole 1 capped at par 4 + 2 + 2 handicap strokes = 8
  assert.equal(d.adjustedHoles, 1);
});

test("rounds without Course Rating or Slope give no differential", () => {
  const f = get("handicapRoundDifferential");
  assert.equal(f(round({ cr: null }), null), null);
  assert.equal(f(round({ slope: 999 }), null), null);
});
