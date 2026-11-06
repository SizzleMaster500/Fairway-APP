// Fairway — persistence: localStorage, backup export and import.
const KEY = "fairway-data-v2",
  OLD = "fairway-data-v1";

const fitArray = (a, n) =>
  Array.isArray(a) && a.length === n ? a : Array(n).fill(null);

// Repairs the shape of stored data so one bad record can never blank the whole app.
// It never throws away rounds: invalid ones are simply skipped when displayed.
function sanitizeDb(d) {
  const clean = { ...d };
  clean.rounds = (Array.isArray(d.rounds) ? d.rounds : []).filter(
    (r) => r && typeof r === "object",
  );
  // Old rounds may have no id; without one, deleting a single round could delete several.
  clean.rounds.forEach((r) => {
    if (r.id === undefined || r.id === null || r.id === "") r.id = uId();
  });
  clean.courses = (Array.isArray(d.courses) ? d.courses : []).filter(
    (c) =>
      c &&
      typeof c.name === "string" &&
      (Array.isArray(c.pars) || Array.isArray(c.variants)),
  );
  clean.courses.forEach((c) => {
    if (!Array.isArray(c.variants)) return;
    c.variants = c.variants
      .filter((v) => v && Array.isArray(v.pars))
      .map((v) => ({
        ...v,
        distances: fitArray(v.distances, v.pars.length),
        strokeIndices: fitArray(v.strokeIndices, v.pars.length),
      }));
  });
  clean.draft = validRound(d.draft) ? d.draft : null;
  return clean;
}

function load() {
  let raw = null,
    d = null;
  try {
    raw = localStorage.getItem(KEY);
    d = JSON.parse(raw);
  } catch (e) {}
  if (d && Array.isArray(d.rounds) && Array.isArray(d.courses))
    return sanitizeDb(d);
  // Stored data exists but is unreadable: keep a copy instead of silently overwriting it.
  if (raw) {
    try {
      localStorage.setItem(KEY + "-corrupt-" + Date.now(), raw);
    } catch (e) {}
  }
  let old;
  try {
    old = JSON.parse(localStorage.getItem(OLD));
  } catch (e) {}
  return sanitizeDb({
    rounds: Array.isArray(old?.rounds) ? old.rounds.filter(validRound) : [],
    draft: validRound(old?.draft) ? old.draft : null,
    courses: [],
  });
}

let db = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    alert("Unable to save on this device. Export a backup.");
  }
  render();
}

async function exportBackup() {
  const name =
    "fairway-backup-" + new Date().toLocaleDateString("en-CA") + ".json";
  const json = JSON.stringify(db, null, 2);
  // iPhone home-screen apps handle plain downloads badly, so offer the share sheet first.
  try {
    const file = new File([json], name, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Fairway backup" });
      return;
    }
  } catch (e) {
    if (e?.name === "AbortError") return;
  }
  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function importBackup(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const badCourse = (c) =>
      !c ||
      typeof c.name !== "string" ||
      (!Array.isArray(c.pars) && !Array.isArray(c.variants));
    if (
      !data ||
      !Array.isArray(data.rounds) ||
      !Array.isArray(data.courses) ||
      data.rounds.some((r) => !validRound(r)) ||
      data.courses.some(badCourse)
    )
      throw Error("Invalid backup");
    if (
      confirm(
        "Replace local data with this backup? Export your current backup first.",
      )
    ) {
      db = sanitizeDb(data);
      uMigrate();
      save();
      note("Backup restored.");
    }
  } catch (e) {
    alert("Invalid backup file.");
  }
  ev.target.value = "";
}
