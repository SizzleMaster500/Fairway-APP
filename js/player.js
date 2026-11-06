// Fairway — Player tab, golf bag, shot tracking and the handicap screens.

function setOfficialHcp(value) {
  if (
    value !== "" &&
    (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 54)
  ) {
    alert("Enter a handicap between 0 and 54.");
    return;
  }
  db.officialHcp = value === "" ? null : Number(value);
  save();
}

function setClubUnit(value) {
  if (!["m", "yd"].includes(value)) return;
  db.clubUnit = value;
  save();
}

function addClub() {
  db.clubs = Array.isArray(db.clubs) ? db.clubs : [];
  db.clubs.push({ id: crypto.randomUUID(), name: "", distance: null });
  save();
}

function updateClub(id, field, value) {
  const c = (db.clubs || []).find((c) => c.id === id);
  if (!c) return;
  if (field === "name") c.name = value.slice(0, 60);
  else {
    if (value === "") {
      c.distance = null;
    } else {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 500) return;
      c.distance = toMetres(n, db.clubUnit === "yd" ? "yd" : "m");
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    renderPlayer(
      db.rounds.filter(
        (r) => validRound(r) && r.scores.every((s) => s !== null),
      ),
    );
  } catch (e) {
    alert("Unable to save club.");
  }
}

function removeClub(id) {
  db.clubs = (db.clubs || []).filter((c) => c.id !== id);
  save();
}

function setHoleStat(field, value) {
  const d = db.draft;
  if (!d || d.trackingMode !== "detailed") return;
  if (!Array.isArray(d.holeStats))
    d.holeStats = Array.from({ length: d.pars.length }, () => ({}));
  const stat = d.holeStats[selectedHole] || (d.holeStats[selectedHole] = {});
  if (["putts", "penalties"].includes(field)) {
    if (value === "") {
      delete stat[field];
    } else {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 20) return;
      stat[field] = n;
    }
  } else {
    if (value) stat[field] = value;
    else delete stat[field];
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    alert("Could not save shot tracking data.");
  }
}

function renderHoleTracking(d) {
  const box = document.getElementById("holeTracking");
  box.classList.toggle("hidden", d.trackingMode !== "detailed");
  if (d.trackingMode !== "detailed") return;
  const stat = d.holeStats?.[selectedHole] || {};
  for (const [field, id] of Object.entries({
    putts: "trackPutts",
    tee: "trackTee",
    shape: "trackShape",
    approach: "trackApproach",
    penalties: "trackPenalties",
    ob: "trackOb",
  })) {
    const el = document.getElementById(id);
    if (document.activeElement !== el) el.value = stat[field] ?? "";
  }
}

function renderPerformance(rounds) {
  const target = document.getElementById("performanceSummary");
  target.replaceChildren();
  const stats = rounds
    .filter((r) => !r.test && r.trackingMode === "detailed")
    .flatMap((r) =>
      Array.isArray(r.holeStats)
        ? r.holeStats.map((s, i) => s && { ...s, par: r.pars[i] })
        : [],
    )
    .filter(Boolean);
  const putts = stats.filter((s) => Number.isInteger(s.putts)),
    tee = stats.filter(
      (s) => s.par !== 3 && ["straight", "left", "right"].includes(s.tee),
    ),
    approach = stats.filter((s) =>
      ["green", "short", "long", "left", "right"].includes(s.approach),
    ),
    penalties = stats.filter((s) => Number.isInteger(s.penalties));
  const items = [
    [
      "Tracked holes",
      stats.filter((s) => Object.keys(s).some((k) => k !== "par")).length,
    ],
    [
      "Avg putts / tracked hole",
      putts.length
        ? (putts.reduce((n, s) => n + s.putts, 0) / putts.length).toFixed(1)
        : "—",
    ],
    [
      "Straight tee shots (par 4–5)",
      tee.length
        ? Math.round(
            (100 * tee.filter((s) => s.tee === "straight").length) / tee.length,
          ) + "%"
        : "—",
    ],
    [
      "Approaches on green",
      approach.length
        ? Math.round(
            (100 * approach.filter((s) => s.approach === "green").length) /
              approach.length,
          ) + "%"
        : "—",
    ],
    [
      "Penalty strokes recorded",
      penalties.length ? penalties.reduce((n, s) => n + s.penalties, 0) : "—",
    ],
  ];
  const grid = node("div", undefined, "player-grid");
  for (const [label, value] of items) {
    const cell = node("div", undefined, "player-metric");
    cell.append(node("small", label), node("strong", String(value)));
    grid.append(cell);
  }
  target.append(grid);
}

function renderPlayer(rounds) {
  const personal = hcpRecords(rounds.filter((r) => !r.test)),
    eligible = hcpRecords(rounds.filter((r) => r.eligible && !r.test));
  const a = personal.at(-1),
    b = eligible.at(-1);
  document.getElementById("playerPersonalHcp").textContent = a
    ? a.hcp.toFixed(1)
    : "—";
  document.getElementById("playerWhsHcp").textContent = b
    ? b.hcp.toFixed(1)
    : "—";
  document.getElementById("officialHcpDisplay").textContent = Number.isFinite(
    db.officialHcp,
  )
    ? db.officialHcp.toFixed(1)
    : "—";
  const official = document.getElementById("officialHcp");
  if (document.activeElement !== official)
    official.value = db.officialHcp ?? "";
  const unit = db.clubUnit === "yd" ? "yd" : "m";
  document.getElementById("clubUnit").value = unit;
  const chart = document.getElementById("clubDistanceChart");
  chart.replaceChildren();
  const measured = (db.clubs || [])
    .filter((c) => Number.isFinite(c.distance) && c.distance > 0)
    .sort((a, b) => b.distance - a.distance);
  if (!measured.length) {
    chart.append(
      node(
        "p",
        "Enter club carry distances to see your distance staircase.",
        "muted",
      ),
    );
  } else {
    const max = Math.max(1, ...measured.map((c) => c.distance));
    measured.forEach((c) => {
      const entry = node("div", undefined, "club-bar-entry"),
        heading = node("div", undefined, "club-bar-heading"),
        track = node("div", undefined, "club-bar-track"),
        fill = node("div", undefined, "club-bar-fill");
      heading.append(
        node("span", c.name || "Unnamed club"),
        node("strong", Math.round(fromMetres(c.distance, unit)) + " " + unit),
      );
      fill.style.width = ((c.distance / max) * 100).toFixed(2) + "%";
      track.append(fill);
      entry.append(heading, track);
      chart.append(entry);
    });
  }
  renderPerformance(rounds);
  const list = document.getElementById("clubList");
  if (
    document.activeElement?.matches?.("input") &&
    list.contains(document.activeElement)
  )
    return;
  list.replaceChildren();
  (db.clubs || []).forEach((c) => {
    const row = node("div", undefined, "club-row"),
      name = node("input"),
      dist = node("input"),
      remove = node("button", "×", "danger");
    name.placeholder = "Club (e.g. 7 iron)";
    name.value = c.name || "";
    name.setAttribute("aria-label", "Club name");
    name.oninput = () => updateClub(c.id, "name", name.value);
    dist.type = "number";
    dist.inputMode = "decimal";
    dist.min = "0";
    dist.max = "550";
    dist.placeholder = unit;
    dist.value = Number.isFinite(c.distance)
      ? String(Math.round(fromMetres(c.distance, unit)))
      : "";
    dist.setAttribute("aria-label", "Carry distance in " + unit);
    dist.oninput = () => updateClub(c.id, "distance", dist.value);
    remove.setAttribute("aria-label", "Remove club");
    remove.onclick = () => removeClub(c.id);
    row.append(name, dist, remove);
    list.append(row);
  });
}

function renderHandicap(rounds) {
  const records = hcpRecords(rounds.filter((r) => !r.test)),
    last = records[records.length - 1],
    current = last ? last.hcp : null;
  const display = current === null ? "—" : current.toFixed(1);
  document.getElementById("hcpValue").textContent = display;
  document.getElementById("hcpDetailValue").textContent = display;
  document.getElementById("hcpRoundCount").textContent = String(records.length);
  document.getElementById("hcpHoleCount").textContent =
    records.reduce((sum, x) => sum + x.diff.holes, 0) + " rated holes recorded";
  const unrated = rounds.filter((r) => !r.test).length - records.length;
  document.getElementById("hcpDescription").textContent = records.length
    ? "Personal estimate from " +
      records.length +
      " rated rounds (9 and 18 holes). " +
      (unrated ? unrated + " unrated rounds not included. " : "") +
      "Not an official WHS index."
    : "No rated rounds yet. Add Course Rating and Slope to new rounds to calculate a personal estimate.";
  const first = records[0];
  document.getElementById("hcpTrend").textContent =
    first && last
      ? "Change since first rated round: " +
        (last.hcp - first.hcp > 0 ? "+" : "") +
        (last.hcp - first.hcp).toFixed(1)
      : "Your playing-level estimate";
  const list = document.getElementById("hcpRoundList");
  list.replaceChildren();
  if (!records.length)
    list.append(
      node(
        "p",
        "No rated rounds yet. Your saved rounds are still counted in History and Awards.",
        "muted",
      ),
    );
  records
    .slice()
    .reverse()
    .forEach((x) => {
      const wrap = node("div", undefined, "hcp-entry"),
        a = node("div"),
        b = node("div", undefined, "hcp-entry-right");
      a.append(
        node("strong", x.r.course),
        node(
          "small",
          displayDate(x.r.date) + " · " + x.diff.holes + " holes · " + x.r.tees,
        ),
      );
      b.append(
        node("strong", x.diff.value.toFixed(1)),
        node(
          "small",
          x.diff.approx
            ? "9-hole approximation"
            : x.diff.adjustmentAvailable
              ? "Adjusted " + x.diff.adjusted + " / gross " + x.diff.gross
              : "Gross " + x.diff.gross + " · SI/HI needed for adjustment",
        ),
      );
      wrap.append(a, b);
      list.append(wrap);
    });
  const chart = document.getElementById("hcpChart");
  chart.replaceChildren();
  if (!records.length) {
    chart.append(
      node(
        "p",
        "Your handicap chart will appear after your first rated round.",
        "muted",
      ),
    );
    document.getElementById("hcpChartCaption").textContent =
      "Save a rated round to start your chart.";
    return;
  }
  const vals = records.map((x) => x.hcp),
    min = Math.min(...vals),
    max = Math.max(...vals),
    low = Math.floor(min - 3),
    high = Math.min(54, Math.max(low + 1, Math.ceil(max + 3))),
    W = 640,
    H = 220,
    left = 42,
    right = 14,
    top = 20,
    bottom = 35;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "Fairway handicap progression chart, " + records.length + " rated rounds",
  );
  const make = (tag, attrs) => {
    let e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    svg.append(e);
    return e;
  };
  const x = (i) =>
    left +
    (W - left - right) *
      (records.length === 1 ? 0.5 : i / (records.length - 1));
  const y = (v) => top + ((H - top - bottom) * (high - v)) / (high - low);
  [0, 1, 2, 3, 4].forEach((i) => {
    let value = low + ((high - low) * i) / 4;
    make("line", {
      x1: left,
      y1: y(value),
      x2: W - right,
      y2: y(value),
      stroke: "#3b614a",
      "stroke-width": 1,
    });
    let t = make("text", {
      x: 34,
      y: y(value) + 4,
      fill: "#b6cbb9",
      "font-size": 12,
      "text-anchor": "end",
    });
    t.textContent = value.toFixed(0);
  });
  make("polyline", {
    points: records.map((r, i) => x(i) + "," + y(r.hcp)).join(" "),
    fill: "none",
    stroke: "#e6c779",
    "stroke-width": 3,
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
  });
  records.forEach((r, i) => {
    let dot = make("circle", {
      cx: x(i),
      cy: y(r.hcp),
      r: records.length > 30 ? 2.5 : 4,
      fill: "#f5da91",
    });
    let title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent =
      displayDate(r.r.date) + " · " + r.r.course + " · " + r.hcp.toFixed(1);
    dot.append(title);
  });
  const t = make("text", {
    x: left,
    y: H - 8,
    fill: "#b6cbb9",
    "font-size": 12,
  });
  t.textContent = "First round";
  const t2 = make("text", {
    x: W - right,
    y: H - 8,
    fill: "#b6cbb9",
    "font-size": 12,
    "text-anchor": "end",
  });
  t2.textContent = "Latest round";
  chart.append(svg);
  document.getElementById("hcpChartCaption").textContent =
    "Lower is better · " +
    records.length +
    " rated rounds · 9-hole scores use a non-WHS approximation.";
}
