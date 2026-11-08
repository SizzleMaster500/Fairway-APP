// Fairway — courses: tee configurations, course editor, legacy migration.

const U_FORMATS = {
  front: { label: "Front 9", start: 0, count: 9 },
  back: { label: "Back 9", start: 9, count: 9 },
  full: { label: "Full 18", start: 0, count: 18 },
  nine: { label: "9 holes", start: 0, count: 9 },
};

const U_COLORS = ["Yellow", "Blue", "White", "Red", "Black", "Orange", "Green"];

const uFormat = (key) => U_FORMATS[key]?.label || key;

function uLegacyFormat(c) {
  return c.pars.length === 18 ? "full" : "nine";
}

function uMigrate() {
  if (
    db.courseSchema === 2 &&
    db.courses.every((c) => Array.isArray(c.variants))
  )
    return;
  const groups = [];
  for (const old of db.courses) {
    if (Array.isArray(old.variants)) {
      groups.push(old);
      continue;
    }
    if (!Array.isArray(old.pars)) continue;
    const name = old.name.trim().replace(/\s+18\s*holes?$/i, "");
    let group = groups.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!group) {
      group = {
        id: old.id || uId(),
        name,
        holes: old.pars.length === 18 ? 18 : 9,
        pars: [],
        variants: [],
      };
      groups.push(group);
    }
    if (old.pars.length === 18) group.holes = 18;
    const fmt = uLegacyFormat(old),
      tee = old.tees || "Yellow";
    if (!group.variants.some((v) => v.tee === tee && v.format === fmt))
      group.variants.push({
        id: uId(),
        tee,
        format: fmt,
        pars: [...old.pars],
        distances: Array.isArray(old.distances)
          ? [...old.distances]
          : Array(old.pars.length).fill(null),
        strokeIndices: Array.isArray(old.strokeIndices)
          ? [...old.strokeIndices]
          : Array(old.pars.length).fill(null),
        distanceUnit: old.distanceUnit || "m",
        cr: old.cr ?? null,
        slope: old.slope ?? null,
      });
  }
  for (const c of groups) {
    if (c.holes === 18) {
      const full = c.variants.find((v) => v.format === "full");
      c.pars = full
        ? [...full.pars]
        : [...c.variants[0].pars, ...Array(9).fill(4)];
      // Nine-hole legacy entries are retained as Front 9, but we do not invent Back 9 ratings.
      c.variants.forEach((v) => {
        if (v.format === "nine") v.format = "front";
      });
    } else {
      c.pars = [...(c.variants[0]?.pars || Array(9).fill(4))];
    }
  }
  db.courses = groups;
  db.courseSchema = 2;
  try {
    localStorage.setItem(
      KEY + "-before-unified-v010",
      localStorage.getItem(KEY) || "",
    );
  } catch (e) {}
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    alert("Could not save migration. Export your backup.");
  }
}

const U_COURSE_ICONS = [
  ["clock", "Clock tower"],
  ["green", "Putting green"],
  ["tee-box", "Tee box"],
  ["ball", "Golf ball & tee"],
  ["fairway", "Fairway view"],
  ["clubhouse", "Clubhouse"],
  ["bunker", "Bunker"],
  ["lake", "Lake hole"],
];

function uIconPath(key) {
  return (
    "./assets/course-icons/" +
    (U_COURSE_ICONS.some((x) => x[0] === key) ? key : "fairway") +
    ".webp"
  );
}

function uIconElement(key) {
  // Crop the decorative gold frame inside a fixed viewport, rather than
  // stretching or altering the source illustration.
  const frame = document.createElement("span");
  frame.className = "u-course-icon";
  const img = document.createElement("img");
  img.src = uIconPath(key);
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  frame.append(img);
  return frame;
}

function renderUnifiedCourseUI() {
  const list = uGet("courseList");
  list.replaceChildren();
  if (!db.courses.length)
    list.append(node("p", "No courses saved yet.", "muted"));
  for (const c of db.courses) {
    const card = node("article", undefined, "course-item"),
      head = node("div", undefined, "saved-course-head");
    const heading = node("div", undefined, "u-course-heading");
    heading.append(uIconElement(c.icon), head);
    head.append(
      node("h3", c.name),
      node(
        "div",
        `${c.holes} holes · ${c.variants.length} tee configurations`,
        "saved-course-subtitle",
      ),
    );
    card.append(heading);
    const details = document.createElement("details"),
      summary = node("summary", "View tee configurations");
    details.append(summary);
    for (const v of c.variants) {
      const line = node("div", undefined, "u-variant-line");
      line.append(
        teeBadge(v.tee),
        node(
          "span",
          `${uFormat(v.format)} · CR ${v.cr ?? "—"} · Slope ${v.slope ?? "—"}`,
        ),
      );
      details.append(line);
    }
    card.append(details);
    const actions = node("div", undefined, "actions"),
      edit = node("button", "Edit course", "secondary"),
      del = node("button", "Remove course", "danger");
    edit.onclick = () => editCourse(c.id);
    del.onclick = () => removeCourse(c.id);
    actions.append(edit, del);
    card.append(actions);
    list.append(card);
  }
  const select = uGet("courseSelect"),
    previous = select.value;
  select.replaceChildren();
  for (const c of db.courses) select.add(new Option(c.name, c.id));
  if (db.courses.some((c) => c.id === previous)) select.value = previous;
  uUpdateRoundOptions();
}

let uWorking = null,
  uActiveVariant = null;

function uBlankVariant(tee, format, pars) {
  const n = U_FORMATS[format].count,
    start = U_FORMATS[format].start;
  return {
    id: uId(),
    tee,
    format,
    pars: pars.slice(start, start + n),
    distances: Array(n).fill(null),
    strokeIndices: Array(n).fill(null),
    distanceUnit: "m",
    cr: null,
    slope: null,
  };
}

function uEditorMarkup() {
  uGet("courseEditor").innerHTML =
    `<h3 id="courseFormHeading">Unified course editor</h3><p class="muted">Save the course once, then add as many tee and hole combinations as you need.</p><label for="uName">Course name</label><input id="uName" placeholder="e.g. Golf Meggen"><label for="uHoles">Course size</label><select id="uHoles"><option value="9">9 holes</option><option value="18">18 holes</option></select><label for="uIcon">Course emblem</label><div id="uIconPicker" class="u-icon-picker"></div><div id="uEditorContent"></div><div class="actions" style="margin-top:18px"><button type="button" onclick="uSaveCourse()">Save course</button><button type="button" class="secondary" onclick="cancelEditCourse()">Cancel</button></div>`;
}

function openCourseEditor() {
  uWorking = {
    id: uId(),
    name: "",
    icon: "fairway",
    holes: 18,
    pars: Array(18).fill(4),
    variants: [],
  };
  uActiveVariant = null;
  uEditorMarkup();
  uGet("uHoles").value = "18";
  uGet("uHoles").onchange = () => uChangeHoles();
  uGet("courseEditor").classList.remove("hidden");
  uDrawIconPicker();
  uDrawEditor();
  uGet("uName").focus();
}

function editCourse(id) {
  const c = db.courses.find((c) => c.id === id);
  if (!c) return;
  openCourseEditor();
  uWorking = structuredClone(c);
  uGet("uName").value = c.name;
  uGet("uHoles").value = String(c.holes);
  uActiveVariant = c.variants[0]?.id || null;
  uDrawIconPicker();
  uDrawEditor();
  tab("courses");
  uGet("courseEditor").scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEditCourse() {
  uWorking = null;
  uActiveVariant = null;
  uGet("courseEditor").classList.add("hidden");
}

function uDrawIconPicker() {
  const picker = uGet("uIconPicker");
  if (!picker || !uWorking) return;
  picker.replaceChildren();
  for (const [key, label] of U_COURSE_ICONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "u-icon-option" +
      ((uWorking.icon || "fairway") === key ? " selected" : "");
    btn.setAttribute("aria-label", label);
    btn.setAttribute(
      "aria-pressed",
      String((uWorking.icon || "fairway") === key),
    );
    btn.append(uIconElement(key), node("span", label));
    btn.onclick = () => {
      uWorking.icon = key;
      uDrawIconPicker();
    };
    picker.append(btn);
  }
}

function uChangeHoles() {
  const n = +uGet("uHoles").value;
  if (
    uWorking.variants.length &&
    !confirm(
      "Changing course size will remove existing tee configurations in this editor. Continue?",
    )
  ) {
    uGet("uHoles").value = String(uWorking.holes);
    return;
  }
  uWorking.holes = n;
  uWorking.pars = Array(n).fill(4);
  uWorking.variants = [];
  uActiveVariant = null;
  uDrawEditor();
}

function uAddVariant() {
  const tee = uGet("uNewTee").value,
    format = uGet("uNewFormat").value;
  if (uWorking.variants.some((v) => v.tee === tee && v.format === format)) {
    alert("This tee and hole configuration already exists.");
    return;
  }
  const v = uBlankVariant(tee, format, uWorking.pars);
  uWorking.variants.push(v);
  uActiveVariant = v.id;
  uDrawEditor();
}

function uRemoveVariant(id) {
  if (
    !confirm("Remove this tee configuration? Saved rounds will not be changed.")
  )
    return;
  uWorking.variants = uWorking.variants.filter((v) => v.id !== id);
  uActiveVariant = uWorking.variants[0]?.id || null;
  uDrawEditor();
}

function uSetPar(i, value) {
  uWorking.pars[i] = Number(value);
  for (const v of uWorking.variants) {
    const offset = U_FORMATS[v.format].start;
    if (i >= offset && i < offset + v.pars.length)
      v.pars[i - offset] = Number(value);
  }
}

function uDrawEditor() {
  if (!uWorking) return;
  const area = uGet("uEditorContent");
  area.replaceChildren();
  const h = node("h3", "Hole pars (shared by all tees)");
  area.append(h);
  const parGrid = node("div", undefined, "u-par-grid");
  uWorking.pars.forEach((p, i) => {
    const label = node("label", `Hole ${i + 1}`),
      select = document.createElement("select");
    for (const n of [3, 4, 5]) select.add(new Option("Par " + n, n));
    select.value = String(p);
    select.onchange = () => uSetPar(i, select.value);
    label.append(select);
    parGrid.append(label);
  });
  area.append(parGrid);
  if (uWorking.holes === 9) {
    const panel = node("div", undefined, "u-repeat-ratings");
    panel.append(
      node("h3", "18 holes (same nine twice) — optional published ratings"),
      node(
        "p",
        "Only enter official 18-hole CR and Slope if published for this tee. Otherwise repeated rounds remain unrated.",
        "muted",
      ),
    );
    uWorking.repeatRatings ??= {};
    for (const color of [...new Set(uWorking.variants.map((v) => v.tee))]) {
      const row = node("div", undefined, "u-rating-row"),
        entry = (uWorking.repeatRatings[color] ??= { cr: null, slope: null });
      for (const [label, key] of [
        ["18-hole CR", "cr"],
        ["18-hole Slope", "slope"],
      ]) {
        const field = node("label", color + " " + label),
          inp = document.createElement("input");
        inp.type = "number";
        inp.inputMode = "decimal";
        inp.placeholder = key === "cr" ? "e.g. 71.4" : "e.g. 141";
        inp.value = entry[key] ?? "";
        inp.oninput = () =>
          (entry[key] = inp.value === "" ? null : Number(inp.value));
        field.append(inp);
        row.append(field);
      }
      panel.append(row);
    }
    area.append(panel);
  }
  const title = node("h3", "Tee configurations");
  area.append(title);
  const add = node("div", undefined, "u-add-row"),
    tee = document.createElement("select"),
    fmt = document.createElement("select");
  tee.id = "uNewTee";
  fmt.id = "uNewFormat";
  for (const color of U_COLORS) tee.add(new Option(color, color));
  for (const f of uWorking.holes === 18 ? ["front", "back", "full"] : ["nine"])
    fmt.add(new Option(uFormat(f), f));
  const btn = node("button", "+ Add tee / format");
  btn.type = "button";
  btn.onclick = uAddVariant;
  add.append(tee, fmt, btn);
  area.append(add);
  if (!uWorking.variants.length)
    area.append(
      node(
        "p",
        "Add at least one tee configuration to make this course playable.",
        "muted",
      ),
    );
  const tabs = node("div", undefined, "u-variant-tabs");
  for (const v of uWorking.variants) {
    const b = node(
      "button",
      `${v.tee} · ${uFormat(v.format)}`,
      v.id === uActiveVariant ? "" : "secondary",
    );
    b.type = "button";
    b.onclick = () => {
      uActiveVariant = v.id;
      uDrawEditor();
    };
    tabs.append(b);
  }
  area.append(tabs);
  const v = uWorking.variants.find((v) => v.id === uActiveVariant);
  if (!v) return;
  const pane = node("div", undefined, "u-variant-panel");
  pane.append(node("h3", `${v.tee} · ${uFormat(v.format)}`));
  const rating = node("div", undefined, "u-rating-row");
  for (const [label, key, step] of [
    ["Course Rating", "cr", "0.1"],
    ["Slope Rating", "slope", "1"],
  ]) {
    const field = node("label", label),
      inp = document.createElement("input");
    inp.type = "number";
    inp.step = step;
    inp.inputMode = "decimal";
    inp.placeholder = key === "cr" ? "35.7" : "141";
    inp.value = v[key] ?? "";
    inp.oninput = () => (v[key] = inp.value === "" ? null : Number(inp.value));
    field.append(inp);
    rating.append(field);
  }
  pane.append(rating);
  const unit = node("label", "Distance unit"),
    units = document.createElement("select");
  for (const x of ["m", "yd"])
    units.add(new Option(x === "m" ? "Metres" : "Yards", x));
  units.value = v.distanceUnit;
  units.onchange = () => {
    v.distanceUnit = units.value;
    uDrawEditor();
  };
  unit.append(units);
  pane.append(unit);
  const grid = node("div", undefined, "u-hole-grid");
  const header = node("div", undefined, "u-hole-row u-hole-header");
  ["Hole", "Par", "Distance", "SI"].forEach((x) =>
    header.append(node("strong", x)),
  );
  grid.append(header);
  v.pars.forEach((par, i) => {
    const row = node("div", undefined, "u-hole-row");
    row.append(
      node("strong", String(U_FORMATS[v.format].start + i + 1)),
      node("span", "Par " + par),
    );
    for (const key of ["distances", "strokeIndices"]) {
      const input = document.createElement("input");
      input.type = "number";
      input.inputMode = "numeric";
      input.min = "1";
      input.max = key === "distances" ? "2000" : "18";
      input.placeholder = key === "distances" ? v.distanceUnit : "SI";
      input.value = v[key][i] ?? "";
      input.oninput = () =>
        (v[key][i] = input.value === "" ? null : Number(input.value));
      row.append(input);
    }
    grid.append(row);
  });
  pane.append(grid);
  const remove = node("button", "Remove this configuration", "danger");
  remove.type = "button";
  remove.onclick = () => uRemoveVariant(v.id);
  pane.append(remove);
  area.append(pane);
}

function uSaveCourse() {
  if (!uWorking) return;
  const name = uGet("uName").value.trim();
  if (!name) {
    alert("Enter a course name.");
    return;
  }
  if (!uWorking.variants.length) {
    alert("Add at least one tee configuration.");
    return;
  }
  for (const v of uWorking.variants) {
    if (v.cr !== null && (!Number.isFinite(v.cr) || v.cr <= 0 || v.cr > 90)) {
      alert("Check the Course Rating for " + v.tee);
      return;
    }
    if (
      v.slope !== null &&
      (!Number.isInteger(v.slope) || v.slope < 55 || v.slope > 155)
    ) {
      alert("Slope must be between 55 and 155.");
      return;
    }
    if (
      v.distances.some(
        (d) => d !== null && (!Number.isFinite(d) || d <= 0 || d > 2000),
      )
    ) {
      alert("Check distances for " + v.tee);
      return;
    }
    const si = v.strokeIndices;
    if (
      si.some((x) => x !== null) &&
      (!si.every((x) => Number.isInteger(x) && x >= 1 && x <= 18) ||
        new Set(si).size !== si.length)
    ) {
      alert(
        "Stroke Indices must be unique numbers 1–18, or all blank, for " +
          v.tee,
      );
      return;
    }
  }
  if (uWorking.holes === 9) {
    for (const [tee, r] of Object.entries(uWorking.repeatRatings || {})) {
      if ((r.cr === null) !== (r.slope === null)) {
        alert(
          "Enter both 18-hole CR and Slope for " +
            tee +
            ", or leave both blank.",
        );
        return;
      }
      if (
        r.cr !== null &&
        (!Number.isFinite(r.cr) ||
          r.cr <= 0 ||
          r.cr > 90 ||
          !Number.isInteger(r.slope) ||
          r.slope < 55 ||
          r.slope > 155)
      ) {
        alert("Check the published 18-hole rating for " + tee);
        return;
      }
    }
  }
  uWorking.name = name;
  const index = db.courses.findIndex((c) => c.id === uWorking.id);
  if (index >= 0) db.courses[index] = uWorking;
  else db.courses.push(uWorking);
  cancelEditCourse();
  save();
  note("Unified course saved.");
}

function removeCourse(id) {
  if (confirm("Remove this saved course? Existing rounds will stay saved.")) {
    db.courses = db.courses.filter((c) => c.id !== id);
    save();
  }
}
