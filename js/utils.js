// Fairway — shared helpers (units, validation, formatting, tiny DOM helpers). No app state here.

const uId = () => crypto.randomUUID();

const uGet = (id) => document.getElementById(id);

const YARDS_PER_METRE = 1.0936132983;

function toMetres(value, unit) {
  return unit === "yd" ? value / YARDS_PER_METRE : value;
}

function fromMetres(value, unit) {
  return unit === "yd" ? value * YARDS_PER_METRE : value;
}

function distanceLabel(m, unit) {
  return Number.isFinite(m) && m > 0
    ? Math.round(fromMetres(m, unit)).toLocaleString("en-GB") + " " + unit
    : "—";
}

function courseUnit(c) {
  return c.distanceUnit === "yd" ? "yd" : "m";
}

function validStrokeIndices(a, n) {
  return (
    Array.isArray(a) &&
    a.length === n &&
    (a.every((x) => x === null) ||
      (a.every(
        (x) => Number.isInteger(x) && x >= 1 && x <= (n === 9 ? 18 : n),
      ) &&
        new Set(a).size === n))
  );
}

function validDistances(arr, n) {
  return (
    Array.isArray(arr) &&
    arr.length === n &&
    arr.every(
      (v) =>
        v === null ||
        (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 1500),
    )
  );
}

function validRound(r) {
  return (
    r &&
    typeof r.course === "string" &&
    typeof r.date === "string" &&
    Array.isArray(r.pars) &&
    Array.isArray(r.scores) &&
    [9, 18].includes(r.pars.length) &&
    r.pars.length === r.scores.length &&
    r.pars.every((p) => Number.isInteger(p) && p >= 1 && p <= 10) &&
    r.scores.every(
      (s) => s === null || (Number.isInteger(s) && s >= 1 && s <= 30),
    )
  );
}

function displayDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return match ? match[3] + "." + match[2] + "." + match[1] : String(iso || "");
}

function scoreDiff(r) {
  return (
    r.scores.reduce((a, b) => a + (b || 0), 0) -
    r.pars.reduce((a, b, i) => a + (r.scores[i] === null ? 0 : b), 0)
  );
}

function signed(n) {
  return n === 0 ? "E" : n > 0 ? "+" + n : String(n);
}

function node(tag, text, cls) {
  let e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

function note(s) {
  document.getElementById("notice").textContent = s;
}

function teeClass(value) {
  let t = String(value || "")
    .trim()
    .toLowerCase()
    .split(/[\s\-_/]+/)[0];
  return [
    "yellow",
    "white",
    "blue",
    "red",
    "black",
    "orange",
    "green",
  ].includes(t)
    ? "tee-" + t
    : "";
}

function teeBadge(value) {
  let label = String(value || "Standard").trim() || "Standard";
  return node("span", label + " tees", "tee-badge " + teeClass(label));
}
