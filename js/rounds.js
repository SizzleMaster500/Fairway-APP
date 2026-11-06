// Fairway — playing, scoring, saving and editing rounds.
let selectedHole = 0,
  editingRound = null;

let uPlayLength = 9;

function uSetPlayLength(length) {
  uPlayLength = length;
  uUpdateRoundOptions();
}

function uRoundConfig(c, v) {
  return {
    courseId: c.id,
    variantId: v.id,
    course: c.name,
    tees: v.tee,
    holeFormat: v.format,
    pars: [...v.pars],
    strokeIndices: [...v.strokeIndices],
    distances: [...v.distances],
    distanceUnit: v.distanceUnit || "m",
    cr: v.cr,
    slope: v.slope,
  };
}

function uSelected() {
  const c = db.courses.find((c) => c.id === uGet("courseSelect").value);
  if (!c) return null;
  const tee = uGet("playTee").value;
  const format =
    c.holes === 9
      ? uPlayLength === 18
        ? "repeat"
        : "nine"
      : uPlayLength === 18
        ? "full"
        : uGet("playNine").value;
  let v = c.variants.find((v) => v.tee === tee && v.format === format);
  if (format === "repeat")
    v = c.variants.find((v) => v.tee === tee && v.format === "nine");
  return v ? { c, v, format } : null;
}

function uUpdateRoundOptions() {
  const c = db.courses.find((c) => c.id === uGet("courseSelect").value);
  if (!c) return;
  const teeSelect = uGet("playTee"),
    previous = teeSelect.value,
    tees = [...new Set(c.variants.map((v) => v.tee))];
  teeSelect.replaceChildren();
  for (const tee of tees) teeSelect.add(new Option(tee + " tees", tee));
  if (tees.includes(previous)) teeSelect.value = previous;
  uGet("playNineWrap").classList.toggle(
    "hidden",
    c.holes !== 18 || uPlayLength !== 9,
  );
  document.querySelectorAll("#playLengths button").forEach((b) => {
    const selected = Number(b.dataset.length) === uPlayLength;
    b.classList.toggle("selected", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
  const selected = uSelected(),
    out = uGet("playCourseSummary");
  uGet("playCourseIcon").replaceChildren(uIconElement(c.icon));
  const select = uGet("roundConfig");
  select.replaceChildren();
  if (selected) {
    select.add(new Option(selected.v.tee, selected.v.id));
    const { v, format } = selected;
    let rating =
      format === "repeat" ? uRepeatRating(c, v) : { cr: v.cr, slope: v.slope };
    const rated = Number.isFinite(rating.cr) && Number.isFinite(rating.slope);
    out.textContent = `${uPlayLength} holes · ${v.tee} tees · ${format === "repeat" ? "9 holes played twice" : uFormat(format)} · ${rated ? "CR " + rating.cr + " · Slope " + rating.slope : "No published rating saved — round will be unrated"}`;
  } else
    out.textContent =
      "This tee and round-length combination has not been configured. Add it under My Courses.";
}

function uRepeatRating(c, v) {
  const explicit = c.repeatRatings?.[v.tee];
  return explicit &&
    Number.isFinite(explicit.cr) &&
    Number.isFinite(explicit.slope)
    ? explicit
    : { cr: null, slope: null };
}

function startRound() {
  if (db.draft) {
    alert("Finish or discard the active round first.");
    return;
  }
  const selection = uSelected();
  if (!selection) {
    alert(
      "That tee and hole combination is not configured yet. Open My Courses to add it.",
    );
    return;
  }
  const { c, v, format } = selection;
  const cfg = uRoundConfig(c, v);
  if (format === "repeat") {
    const r = uRepeatRating(c, v);
    Object.assign(cfg, {
      holeFormat: "repeat",
      pars: [...v.pars, ...v.pars],
      distances: [...v.distances, ...v.distances],
      strokeIndices: Array(18).fill(null),
      cr: r.cr,
      slope: r.slope,
    });
  }
  db.draft = {
    eligible: uGet("roundEligible").checked,
    test: uGet("roundTest").checked,
    id: uId(),
    date: uGet("roundDate").value || new Date().toLocaleDateString("en-CA"),
    ...cfg,
    scores: Array(cfg.pars.length).fill(null),
    trackingMode:
      document.querySelector('input[name="roundMode"]:checked')?.value ||
      "score",
    holeStats: Array.from({ length: cfg.pars.length }, () => ({})),
  };
  selectedHole = 0;
  save();
}

function changeStrokes(delta) {
  const d = db.draft;
  if (!d) return;
  const current = d.scores[selectedHole];
  // The first tap on an unscored hole starts at par; after that it is +/-1.
  d.scores[selectedHole] =
    current === null
      ? d.pars[selectedHole]
      : Math.min(30, Math.max(1, current + delta));
  save();
}

function moveHole(delta) {
  if (!db.draft) return;
  selectedHole = Math.max(
    0,
    Math.min(db.draft.pars.length - 1, selectedHole + delta),
  );
  render();
}

function goHole(i) {
  selectedHole = i;
  render();
}

function finishRound() {
  let d = db.draft;
  if (!d) return;
  if (d.scores.some((x) => x === null)) {
    alert("Please score every hole before finishing.");
    return;
  }
  db.rounds.unshift(d);
  db.draft = null;
  save();
  tab("history");
  note("Round saved!");
}

function discardRound() {
  if (confirm("Discard this unfinished round?")) {
    db.draft = null;
    save();
  }
}

function deleteRound(id) {
  if (confirm("Permanently delete this round?")) {
    db.rounds = db.rounds.filter((r) => String(r.id) !== String(id));
    save();
  }
}

function uEditChoices() {
  if (!editingRound) return;
  const round = editingRound,
    original = db.rounds.find((r) => r.id === round.id);
  const course =
    db.courses.find((c) => c.id === original.courseId) ||
    db.courses.find((c) => c.name === original.course);
  const format = uGet("editFormat"),
    tee = uGet("editTeeSelect");
  format.replaceChildren();
  tee.replaceChildren();
  const formats = course
    ? [...new Set(course.variants.map((v) => v.format))]
    : [];
  format.add(
    new Option(
      `${uFormat(original.holeFormat || (original.scores.length === 18 ? "full" : "nine"))} (recorded)`,
      "recorded",
    ),
  );
  for (const f of formats) {
    if (U_FORMATS[f].count === original.scores.length)
      format.add(new Option(uFormat(f), f));
  }
  format.value = round.selectedFormat || "recorded";
  uEditTeeOptions(course, original);
}

function uEditTeeOptions(course, original) {
  const select = uGet("editTeeSelect"),
    chosen = editingRound.selectedVariantId;
  select.replaceChildren();
  select.add(new Option(`${original.tees} tees (recorded)`, "recorded"));
  const format = editingRound.selectedFormat || "recorded";
  for (const v of course?.variants || []) {
    if (
      v.pars.length !== original.scores.length &&
      !(
        original.holeFormat === "repeat" &&
        course?.holes === 9 &&
        v.format === "nine"
      )
    )
      continue;
    if (format !== "recorded" && v.format !== format) continue;
    select.add(
      new Option(
        `${v.tee} · ${uFormat(v.format)} · CR ${v.cr ?? "—"} · Slope ${v.slope ?? "—"}`,
        v.id,
      ),
    );
  }
  if ([...select.options].some((o) => o.value === chosen))
    select.value = chosen;
  else select.value = "recorded";
}

function editRound(id) {
  const r = db.rounds.find((r) => String(r.id) === String(id));
  if (!r) return;
  editingRound = structuredClone(r);
  editingRound.selectedVariantId = "recorded";
  editingRound.selectedFormat = "recorded";
  uGet("editCourseName").textContent = r.course;
  uGet("editDate").value = r.date;
  uGet("editEligible").checked = !!r.eligible;
  uGet("editTest").checked = !!r.test;
  uGet("editTeeBadge").replaceChildren(teeBadge(r.tees));
  uEditChoices();
  renderEditScores();
  tab("editRound");
}

function changeEditedRoundFormat(f) {
  if (!editingRound) return;
  editingRound.selectedFormat = f;
  editingRound.selectedVariantId = "recorded";
  const original = db.rounds.find((r) => r.id === editingRound.id);
  const course =
    db.courses.find((c) => c.id === original.courseId) ||
    db.courses.find((c) => c.name === original.course);
  uEditTeeOptions(course, original);
  changeEditedRoundTees("recorded");
}

function changeEditedRoundTees(id) {
  if (!editingRound) return;
  const original = db.rounds.find((r) => r.id === editingRound.id),
    course =
      db.courses.find((c) => c.id === original.courseId) ||
      db.courses.find((c) => c.name === original.course),
    v = course?.variants.find((v) => v.id === id);
  editingRound.selectedVariantId = v?.id || "recorded";
  editingRound.tees = v?.tee || original.tees;
  editingRound.pars = v
    ? original.holeFormat === "repeat"
      ? [...v.pars, ...v.pars]
      : [...v.pars]
    : [...original.pars];
  uGet("editTeeBadge").replaceChildren(teeBadge(editingRound.tees));
  uGet("editTeeHint").textContent = v
    ? `Selected: ${uFormat(v.format)} · CR ${v.cr ?? "—"} · Slope ${v.slope ?? "—"}. Your strokes and detailed tracking are preserved.`
    : "Original recorded tee configuration. Choose a saved configuration to change it.";
  renderEditScores();
}

function renderEditScores() {
  if (!editingRound) return;
  const list = document.getElementById("editHoleList");
  list.replaceChildren();
  editingRound.scores.forEach((strokes, i) => {
    const row = node("div", undefined, "edit-hole-row"),
      info = node("div", undefined, "edit-hole-info"),
      controls = node("div", undefined, "edit-hole-controls"),
      minus = node("button", "−", "secondary"),
      value = node("strong", String(strokes)),
      plus = node("button", "+");
    info.append(
      node("strong", "Hole " + (i + 1)),
      node("small", "Par " + editingRound.pars[i]),
    );
    minus.type = plus.type = "button";
    minus.setAttribute("aria-label", "Decrease hole " + (i + 1) + " strokes");
    plus.setAttribute("aria-label", "Increase hole " + (i + 1) + " strokes");
    minus.disabled = strokes <= 1;
    plus.disabled = strokes >= 30;
    minus.onclick = () => adjustEditScore(i, -1);
    plus.onclick = () => adjustEditScore(i, 1);
    controls.append(minus, value, plus);
    row.append(info, controls);
    list.append(row);
  });
  document.getElementById("editTotal").textContent =
    editingRound.scores.reduce((a, b) => a + b, 0) + " strokes";
}

function adjustEditScore(i, delta) {
  if (!editingRound) return;
  editingRound.scores[i] = Math.max(
    1,
    Math.min(30, editingRound.scores[i] + delta),
  );
  renderEditScores();
}

function cancelEditRound() {
  editingRound = null;
  tab("history");
}

function saveEditedRound() {
  if (!editingRound) return;
  const date = uGet("editDate").value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    alert("Choose a valid date.");
    return;
  }
  const index = db.rounds.findIndex((r) => r.id === editingRound.id);
  if (index < 0) return;
  const original = db.rounds[index],
    updated = {
      ...original,
      date,
      eligible: uGet("editEligible").checked,
      test: uGet("editTest").checked,
      scores: [...editingRound.scores],
    };
  if (editingRound.selectedVariantId !== "recorded") {
    const c =
        db.courses.find((c) => c.id === original.courseId) ||
        db.courses.find((c) => c.name === original.course),
      v = c?.variants.find((v) => v.id === editingRound.selectedVariantId);
    if (
      !v ||
      (v.pars.length !== original.scores.length &&
        !(
          original.holeFormat === "repeat" &&
          c?.holes === 9 &&
          v.format === "nine"
        ))
    ) {
      alert(
        "That tee configuration is unavailable or has a different hole count.",
      );
      return;
    }
    const cfg = uRoundConfig(c, v);
    if (original.holeFormat === "repeat") {
      const r = uRepeatRating(c, v);
      Object.assign(cfg, {
        holeFormat: "repeat",
        pars: [...v.pars, ...v.pars],
        distances: [...v.distances, ...v.distances],
        strokeIndices: Array(18).fill(null),
        cr: r.cr,
        slope: r.slope,
      });
    }
    Object.assign(updated, cfg);
  }
  if (!validRound(updated)) {
    alert("Invalid round data.");
    return;
  }
  db.rounds[index] = updated;
  editingRound = null;
  save();
  tab("history");
  note("Round updated. Detailed tracking preserved.");
}
