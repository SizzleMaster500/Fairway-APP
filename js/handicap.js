// Fairway — handicap maths. Pure functions: no DOM access.

// officialHcp defaults to the saved value, but can be passed in so the maths is testable.
function handicapRoundDifferential(r, officialHcp = db.officialHcp) {
  const cr = Number(r.cr),
    slope = Number(r.slope),
    n = r.scores.length;
  if (
    ![9, 18].includes(n) ||
    r.cr === null ||
    r.cr === undefined ||
    r.cr === "" ||
    r.slope === null ||
    r.slope === undefined ||
    r.slope === "" ||
    !Number.isFinite(cr) ||
    cr <= 0 ||
    !Number.isFinite(slope) ||
    slope < 55 ||
    slope > 155
  )
    return null;
  const gross = r.scores.reduce((a, b) => a + b, 0),
    par = r.pars.reduce((a, b) => a + b, 0);
  const referenceHI =
    Number.isFinite(Number(officialHcp)) &&
    officialHcp !== null &&
    officialHcp !== undefined
      ? Number(officialHcp)
      : null;
  let adjusted = gross,
    adjustedHoles = 0,
    courseHcp = null;
  if (
    n === 18 &&
    referenceHI !== null &&
    validStrokeIndices(r.strokeIndices, n) &&
    r.strokeIndices.every(Number.isInteger)
  ) {
    courseHcp = Math.round((referenceHI * slope) / 113 + cr - par);
    adjusted = r.scores.reduce((total, strokes, i) => {
      const allocated =
        Math.floor(courseHcp / 18) +
        (r.strokeIndices[i] <= ((courseHcp % 18) + 18) % 18 ? 1 : 0);
      const cap = r.pars[i] + 2 + allocated;
      if (strokes > cap) adjustedHoles++;
      return total + Math.min(strokes, cap);
    }, 0);
  }
  const pcc =
    Number.isFinite(Number(r.pcc)) && r.pcc !== null && r.pcc !== undefined
      ? Number(r.pcc)
      : 0;
  const played = ((adjusted - cr - pcc) * 113) / slope;
  return {
    value: n === 9 ? played * 2 : played,
    played,
    gross,
    adjusted,
    adjustedHoles,
    courseHcp,
    referenceHI,
    holes: n,
    approx: n === 9,
    pcc,
    adjustmentAvailable: n === 18 && adjustedHoles >= 0 && courseHcp !== null,
  };
}

function hcpFromDiffs(items) {
  const recent = items.slice(-20),
    n = recent.length;
  if (!n) return null;
  const counts = [
    0, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 8,
  ];
  const count = counts[n],
    values = recent.map((x) => x.diff.value).sort((a, b) => a - b);
  let estimate = values.slice(0, count).reduce((a, b) => a + b, 0) / count;
  if (n <= 3) estimate -= 2;
  else if (n === 4 || n === 6) estimate -= 1;
  return Math.min(54, Math.round(estimate * 10) / 10);
}

function hcpRecords(rounds, officialHcp = db.officialHcp) {
  const ordered = rounds
    .map((r, i) => ({ r, i, diff: handicapRoundDifferential(r, officialHcp) }))
    .filter((x) => x.diff !== null)
    .sort(
      (a, b) => String(a.r.date).localeCompare(String(b.r.date)) || a.i - b.i,
    );
  return ordered.map((x, i) => ({
    ...x,
    hcp: hcpFromDiffs(ordered.slice(0, i + 1)),
  }));
}
