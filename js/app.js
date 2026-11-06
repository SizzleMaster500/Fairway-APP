// Fairway — screens, tab navigation and start-up.

function render() {
  let valid = db.rounds.filter(
    (r) => validRound(r) && r.scores.every((s) => s !== null),
  );
  const genuine = valid.filter((r) => !r.test);
  document.getElementById("nRounds").textContent = genuine.length;
  document.getElementById("nHoles").textContent = genuine.reduce(
    (a, r) => a + r.scores.length,
    0,
  );
  document.getElementById("nBest").textContent = genuine.length
    ? signed(Math.min(...genuine.map(scoreDiff)))
    : "—";
  renderHome(genuine);
  renderHandicap(valid);
  renderPlayer(valid);
  renderUnifiedCourseUI();
  document.getElementById("setup").classList.toggle("hidden", !!db.draft);
  document.getElementById("playing").classList.toggle("hidden", !db.draft);
  if (db.draft) {
    let d = db.draft;
    selectedHole = Math.min(selectedHole, d.pars.length - 1);
    document.getElementById("activeCourse").textContent = d.course;
    let activeBadge = document.getElementById("activeTeeBadge");
    activeBadge.replaceChildren(teeBadge(d.tees));
    document.getElementById("activeHole").textContent =
      "Hole " + (selectedHole + 1);
    let completed = d.scores.filter((s) => s !== null).length;
    document.getElementById("activeProgress").textContent =
      completed + "/" + d.scores.length + " holes scored";
    document.getElementById("activeTotal").textContent = d.scores.reduce(
      (a, b) => a + (b || 0),
      0,
    );
    document.getElementById("activeDiff").textContent =
      signed(scoreDiff(d)) + " to par";
    let nav = document.getElementById("holeNav");
    nav.replaceChildren();
    d.scores.forEach((s, i) => {
      let b = node("button", String(i + 1));
      if (i === selectedHole) b.classList.add("selected");
      if (s !== null) b.classList.add("done");
      b.onclick = () => goHole(i);
      nav.append(b);
    });
    document.getElementById("holeNumberDisplay").textContent =
      "Hole " + (selectedHole + 1);
    document.getElementById("holeParDisplay").textContent =
      "Par " + d.pars[selectedHole];
    document.getElementById("holeStrokeIndexDisplay").innerHTML =
      '<span class="si-pill">Stroke Index ' +
      (Number.isInteger(d.strokeIndices?.[selectedHole])
        ? d.strokeIndices[selectedHole]
        : "—") +
      "</span>";
    document.getElementById("holeDistanceDisplay").textContent =
      Number.isFinite(d.distances?.[selectedHole]) &&
      d.distances[selectedHole] > 0
        ? "Distance · " +
          distanceLabel(d.distances[selectedHole], courseUnit(d))
        : "Distance not entered";
    document.getElementById("strokesNumber").textContent =
      d.scores[selectedHole] ?? "—";
    document.getElementById("holeStatus").textContent =
      d.scores[selectedHole] === null
        ? "Tap + or − to start at par"
        : signed(d.scores[selectedHole] - d.pars[selectedHole]) +
          " on this hole";
    renderHoleTracking(d);
  }
  let hist = document.getElementById("historyList");
  hist.replaceChildren();
  if (!valid.length)
    hist.append(node("p", "No completed rounds yet.", "muted"));
  valid.forEach((r) => {
    let div = node("div", undefined, "round-item"),
      top = node("div", undefined, "round-summary"),
      left = node("div", undefined, "round-summary-left"),
      right = node("div", undefined, "round-summary-right"),
      date = node(
        "div",
        displayDate(r.date) + " · " + r.scores.length + " holes",
        "round-date",
      ),
      h = node("h3", r.course),
      tee = node("div", undefined, "round-tee"),
      scoreLabel = node("small", "TOTAL STROKES"),
      score = node(
        "strong",
        String(r.scores.reduce((a, b) => a + b, 0)),
        "round-score",
      ),
      diff = node("span", signed(scoreDiff(r)), "round-diff"),
      details = document.createElement("details"),
      summary = node("summary", "View scorecard"),
      table = document.createElement("table");
    tee.append(
      teeBadge(r.tees),
      node("span", "  · Par " + r.pars.reduce((a, b) => a + b, 0)),
    );
    left.append(date, h, tee);
    right.append(scoreLabel, score, diff);
    top.append(left, right);
    table.className = "scoretable";
    let head = document.createElement("tr");
    ["Hole", "Par", "Distance", "Strokes", "+/-"].forEach((x) =>
      head.append(node("th", x)),
    );
    table.append(head);
    r.scores.forEach((s, i) => {
      let tr = document.createElement("tr");
      [
        i + 1,
        r.pars[i],
        distanceLabel(r.distances?.[i], courseUnit(r)),
        s,
        signed(s - r.pars[i]),
      ].forEach((v, j) => {
        let td = node("td", String(v));
        if (j === 4)
          td.className =
            s - r.pars[i] > 0
              ? "positive"
              : s - r.pars[i] < 0
                ? "negative"
                : "";
        tr.append(td);
      });
      table.append(tr);
    });
    details.append(summary, table);
    let meta = node(
        "p",
        "CR: " + (r.cr ?? "—") + " · Slope: " + (r.slope ?? "—"),
        "muted",
      ),
      del = node("button", "Delete round", "danger");
    del.onclick = () => deleteRound(r.id);
    let edit = node("button", "Edit round", "secondary"),
      actions = node("div", undefined, "actions");
    edit.onclick = () => editRound(r.id);
    actions.append(edit, del);
    div.append(top, details, meta, actions);
    hist.append(div);
  });
  document.getElementById("historyCount").textContent =
    valid.length + " " + (valid.length === 1 ? "round" : "rounds");
  renderAchievements(genuine);
}

function renderHome(rounds) {
  const awards = [
    { name: "Birdies", emoji: "🐦", count: 0 },
    { name: "Eagles", emoji: "🦅", count: 0 },
    { name: "Hole-in-ones", emoji: "🏆", count: 0 },
    { name: "Albatrosses", emoji: "✨", count: 0 },
  ];
  let pars = 0;
  rounds.forEach((r) =>
    r.scores.forEach((strokes, i) => {
      let d = strokes - r.pars[i];
      if (d === 0) pars++;
      if (d === -1) awards[0].count++;
      if (d === -2) awards[1].count++;
      if (strokes === 1) awards[2].count++;
      if (d === -3) awards[3].count++;
    }),
  );
  document.getElementById("nPars").textContent = pars;
  const top = awards.reduce(
    (best, item) => (item.count > best.count ? item : best),
    awards[0],
  );
  document.getElementById("featuredEmoji").textContent = top.count
    ? top.emoji
    : "🏆";
  document.getElementById("featuredTitle").textContent = top.count
    ? top.count + " " + top.name
    : "Your first achievement awaits";
  document.getElementById("featuredDescription").textContent = top.count
    ? "Your most-earned special achievement. Keep it going!"
    : "Save a round to start collecting awards.";
  const latest = rounds.reduce(
    (best, r) => (!best || String(r.date) > String(best.date) ? r : best),
    null,
  );
  document.getElementById("latestEmpty").classList.toggle("hidden", !!latest);
  document.getElementById("latestDetails").classList.toggle("hidden", !latest);
  if (latest) {
    document.getElementById("latestDate").textContent =
      displayDate(latest.date) + " · " + latest.scores.length + " holes";
    document.getElementById("latestCourse").textContent = latest.course;
    document.getElementById("latestTee").replaceChildren(teeBadge(latest.tees));
    document.getElementById("latestScore").textContent = latest.scores.reduce(
      (a, b) => a + b,
      0,
    );
    document.getElementById("latestDiff").textContent =
      signed(scoreDiff(latest)) + " to par";
  }
}

function renderAchievements(rounds) {
  const counts = { birdies: 0, eagles: 0, aces: 0, albatrosses: 0, pars: 0 };
  let holes = 0,
    best = null;
  rounds.forEach((r) => {
    holes += r.scores.length;
    let diff = scoreDiff(r);
    if (best === null || diff < best) best = diff;
    r.scores.forEach((strokes, i) => {
      const delta = strokes - r.pars[i];
      if (delta === -1) counts.birdies++;
      if (delta === -2) counts.eagles++;
      if (delta === -3) counts.albatrosses++;
      if (delta === 0) counts.pars++;
      if (strokes === 1) counts.aces++;
    });
  });
  const awards = [
    ["🐦", "Birdies", counts.birdies, "1 under par"],
    ["🦅", "Eagles", counts.eagles, "2 under par"],
    ["🏆", "Hole-in-ones", counts.aces, "One stroke"],
    ["✨", "Albatrosses", counts.albatrosses, "3 under par"],
  ];
  const grid = document.getElementById("awardGrid");
  grid.replaceChildren();
  awards.forEach(([emoji, title, value, description]) => {
    let card = node("div", undefined, "award-card");
    card.append(
      node("div", emoji, "award-emoji"),
      node("div", String(value), "award-count"),
      node("div", title, "award-title"),
      node("div", description, "award-desc"),
    );
    grid.append(card);
  });
  const milestones = [
    ["Completed rounds", rounds.length],
    ["Holes played", holes],
    ["Pars made", counts.pars],
    ["Best round to par", best === null ? "—" : signed(best)],
  ];
  const list = document.getElementById("milestoneList");
  list.replaceChildren();
  milestones.forEach(([name, value]) => {
    let row = node("div", undefined, "milestone-row");
    row.append(node("span", name), node("strong", String(value)));
    list.append(row);
  });
}

function tab(t) {
  document
    .querySelectorAll("main section")
    .forEach((x) => x.classList.toggle("hidden", x.id !== t));
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
  if (t === "play") refreshRoundDate();
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}

// The round date defaults to today, unless the person picked one themselves.
function refreshRoundDate() {
  const input = uGet("roundDate");
  if (!input.dataset.touched)
    input.value = new Date().toLocaleDateString("en-CA");
}

// iOS: hide fixed navigation while an editing keyboard is visible.
(function () {
  let focused = false;
  const isTextField = (e) =>
    e?.matches?.(
      "input:not([type=checkbox]):not([type=radio]):not([type=date]), textarea",
    );
  function update() {
    const viewport = window.visualViewport;
    const keyboard = viewport && window.innerHeight - viewport.height > 140;
    document.body.classList.toggle("fw-keyboard-open", !!(focused && keyboard));
  }
  document.addEventListener("focusin", (e) => {
    focused = isTextField(e.target);
    update();
  });
  document.addEventListener("focusout", () => {
    focused = false;
    update();
  });
  window.visualViewport?.addEventListener("resize", update);
  window.addEventListener("resize", update);
})();

// ---- Start-up ----
document
  .querySelectorAll("nav button")
  .forEach((b) => (b.onclick = () => tab(b.dataset.tab)));
uGet("courseSelect").addEventListener("change", uUpdateRoundOptions);
uGet("roundDate").addEventListener(
  "input",
  (e) => (e.target.dataset.touched = "1"),
);
uMigrate();
refreshRoundDate();
render();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
navigator.storage?.persist?.().catch?.(() => {});
