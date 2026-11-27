const PDFDocument = require("pdfkit");
const ApiError = require("../utils/ApiError");
const { findViewableTournament } = require("./tournamentAccess.service");
const { getBracket, listMatches } = require("./fixture.service");
const { getLeaders, getStandings } = require("./live.service");
const { listAwards } = require("./award.service");
const { APP_TIMEZONE } = require("../constants/common.constants");
const { MATCH_STATUS } = require("../constants/match.constants");
const { TOURNAMENT_STATUS } = require("../constants/tournament.constants");

const BRAND = {
  green: "#0F7B3F",
  ink: "#0B1F17",
  muted: "#5B6B63",
  line: "#DCE5E0",
  soft: "#EEF6F1",
};
const MARGIN = 40;

const STATUS_TEXT = {
  [MATCH_STATUS.SCHEDULED]: "",
  [MATCH_STATUS.LIVE]: "Live",
  [MATCH_STATUS.COMPLETED]: "FT",
  [MATCH_STATUS.CANCELLED]: "Cancelled",
  [MATCH_STATUS.WALKOVER]: "Walkover",
  [MATCH_STATUS.FORFEIT]: "Forfeit",
};

const formatKickoff = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        timeZone: APP_TIMEZONE,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Time TBA";

const sideName = (match, side) =>
  match[`${side}Team`]?.name ?? match[`${side}Placeholder`] ?? "TBD";

// ---------- drawing helpers ----------

const startDocument = (output, tournament, heading) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    info: { Title: `${tournament.name} – ${heading}`, Author: "Maidaan" },
  });
  doc.pipe(output);
  doc.rect(0, 0, doc.page.width, 70).fill(BRAND.green);
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#FFFFFF").text("Maidaan", MARGIN, 24);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("maidaanapp.live", MARGIN, 30, { width: doc.page.width - MARGIN * 2, align: "right" });
  doc.y = 90;
  doc.font("Helvetica-Bold").fontSize(16).fillColor(BRAND.ink).text(tournament.name, MARGIN);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(BRAND.muted)
    .text(
      `${heading} · generated ${new Date().toLocaleString("en-IN", { timeZone: APP_TIMEZONE, dateStyle: "medium", timeStyle: "short" })} IST`,
      MARGIN,
    );
  doc.moveDown(1);
  return doc;
};

const ensureSpace = (doc, needed) => {
  if (doc.y + needed > doc.page.height - MARGIN) doc.addPage();
};

const sectionTitle = (doc, text) => {
  ensureSpace(doc, 40);
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND.green).text(text, MARGIN);
  doc.moveDown(0.3);
};

/**
 * Simple table: columns = [{ label, width, align }], rows = arrays of strings.
 * Repeats the header on page breaks.
 */
const drawTable = (doc, columns, rows, { highlightRows = [] } = {}) => {
  const rowHeight = 18;
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  // Text drawing moves doc.y, so every row is placed from a fixed top
  const drawRow = (cells, top, { isHeader = false, isHighlighted = false } = {}) => {
    if (isHeader || isHighlighted)
      doc.rect(MARGIN, top, tableWidth, rowHeight).fill(isHeader ? BRAND.soft : "#F4FAF6");
    doc
      .font(isHeader ? "Helvetica-Bold" : "Helvetica")
      .fontSize(isHeader ? 8.5 : 9)
      .fillColor(isHeader ? BRAND.muted : BRAND.ink);
    let x = MARGIN;
    cells.forEach((cell, index) => {
      const column = columns[index];
      doc.text(String(cell ?? ""), x + 4, top + 5, {
        width: column.width - 8,
        height: rowHeight - 4,
        align: column.align ?? "left",
        lineBreak: false,
        ellipsis: true,
      });
      x += column.width;
    });
    if (!isHeader)
      doc
        .moveTo(MARGIN, top + rowHeight)
        .lineTo(MARGIN + tableWidth, top + rowHeight)
        .strokeColor(BRAND.line)
        .lineWidth(0.5)
        .stroke();
    return top + rowHeight;
  };

  let top = drawRow(
    columns.map((column) => column.label),
    doc.y,
    { isHeader: true },
  );
  rows.forEach((row, index) => {
    if (top + rowHeight > doc.page.height - MARGIN) {
      doc.addPage();
      top = drawRow(
        columns.map((column) => column.label),
        MARGIN,
        { isHeader: true },
      );
    }
    top = drawRow(row, top, { isHighlighted: highlightRows.includes(index) });
  });
  doc.x = MARGIN;
  doc.y = top + 10;
};

const STANDINGS_COLUMNS = [
  { label: "#", width: 26, align: "center" },
  { label: "Team", width: 205 },
  ...["P", "W", "D", "L", "GF", "GA", "GD"].map((label) => ({ label, width: 33, align: "center" })),
  { label: "Pts", width: 53, align: "center" },
];

const drawStandings = (doc, standings) => {
  if (!standings.tables.length) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(BRAND.muted)
      .text("No table for this tournament format.", MARGIN);
    return;
  }
  standings.tables.forEach((table) => {
    if (table.group) sectionTitle(doc, `Group ${table.group.name}`);
    drawTable(
      doc,
      STANDINGS_COLUMNS,
      table.rows.map((row) => [
        row.position,
        row.team.name,
        row.played,
        row.won,
        row.drawn,
        row.lost,
        row.goalsFor,
        row.goalsAgainst,
        row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference,
        row.points,
      ]),
      { highlightRows: table.qualifiers ? [...Array(table.qualifiers).keys()] : [] },
    );
  });
};

const FIXTURE_COLUMNS = [
  { label: "No.", width: 32 },
  { label: "Kick-off (IST)", width: 104 },
  { label: "Home", width: 128, align: "right" },
  { label: "Score", width: 54, align: "center" },
  { label: "Away", width: 128 },
  { label: "Ground", width: 69 },
];

const scoreText = (match) => {
  if (match.status === MATCH_STATUS.SCHEDULED || match.status === MATCH_STATUS.CANCELLED)
    return match.status === MATCH_STATUS.CANCELLED ? "cancelled" : "v";
  const base = `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`;
  if (match.decidedBy === 3) return `${base} (p)`;
  if (match.decidedBy === 2) return `${base} (aet)`;
  if (match.status !== MATCH_STATUS.COMPLETED)
    return `${base} ${STATUS_TEXT[match.status].slice(0, 2)}`;
  return base;
};

// ---------- documents ----------

// Each export loads and checks everything first, then returns a render step for the response
const prepareStandings = async (viewer, tournamentId) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  const standings = await getStandings(viewer, tournament.uuid);
  return (output) => {
    const doc = startDocument(output, tournament, "Points table");
    drawStandings(doc, standings);
    doc.end();
  };
};

const prepareFixtures = async (viewer, tournamentId) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  const matches = await listMatches(viewer, tournament.uuid, {});
  return (output) => renderFixtures(output, tournament, matches);
};

const renderFixtures = (output, tournament, matches) => {
  const doc = startDocument(output, tournament, "Fixtures & results");
  if (!matches.length)
    doc.font("Helvetica").fontSize(10).fillColor(BRAND.muted).text("No fixtures yet.", MARGIN);
  const rounds = new Map();
  matches.forEach((match) => {
    const key = `${match.stage}-${match.isThirdPlace ? "third" : match.roundNumber}`;
    if (!rounds.has(key))
      rounds.set(key, { title: match.roundName ?? `Round ${match.roundNumber}`, matches: [] });
    rounds.get(key).matches.push(match);
  });
  rounds.forEach((round) => {
    sectionTitle(doc, round.title);
    drawTable(
      doc,
      FIXTURE_COLUMNS,
      round.matches.map((match) => [
        `M${match.matchNumber}`,
        formatKickoff(match.scheduledAt),
        sideName(match, "home"),
        scoreText(match),
        sideName(match, "away"),
        match.ground?.name ?? "",
      ]),
    );
  });
  doc.end();
};

const prepareSummary = async (viewer, tournamentId) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  if (tournament.status !== TOURNAMENT_STATUS.COMPLETED)
    throw ApiError.conflict("The summary is available once the tournament is completed");
  const [standings, leaders, awards, bracket] = await Promise.all([
    getStandings(viewer, tournament.uuid),
    getLeaders(viewer, tournament.uuid),
    listAwards(viewer, tournament.uuid),
    getBracket(viewer, tournament.uuid),
  ]);
  return (output) => renderSummary(output, tournament, { standings, leaders, awards, bracket });
};

const renderSummary = (output, tournament, { standings, leaders, awards, bracket }) => {
  const doc = startDocument(output, tournament, "Tournament summary");

  sectionTitle(doc, "Awards");
  if (!awards.length)
    doc.font("Helvetica").fontSize(10).fillColor(BRAND.muted).text("No awards.", MARGIN);
  else
    drawTable(
      doc,
      [
        { label: "Award", width: 170 },
        { label: "Winner", width: 200 },
        { label: "Team", width: 145 },
      ],
      awards.map((award) => [
        award.value ? `${award.title} (${award.value})` : award.title,
        award.player?.fullName ?? award.team?.name ?? "",
        award.player ? (award.team?.name ?? "") : "",
      ]),
    );

  const final = bracket.rounds.at(-1)?.matches[0];
  if (final) {
    sectionTitle(doc, "Final");
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(BRAND.ink)
      .text(`${sideName(final, "home")}  ${scoreText(final)}  ${sideName(final, "away")}`, MARGIN);
    doc.moveDown(0.5);
  }

  if (standings.tables.length) {
    sectionTitle(doc, standings.tables.length > 1 ? "Group tables" : "Final table");
    drawStandings(doc, standings);
  }

  sectionTitle(doc, "Top scorers");
  if (!leaders.scorers.length)
    doc.font("Helvetica").fontSize(10).fillColor(BRAND.muted).text("No goals recorded.", MARGIN);
  else
    drawTable(
      doc,
      [
        { label: "#", width: 30, align: "center" },
        { label: "Player", width: 220 },
        { label: "Team", width: 200 },
        { label: "Goals", width: 65, align: "center" },
      ],
      leaders.scorers.map((entry, index) => [
        index + 1,
        entry.player.fullName,
        entry.team.name,
        entry.count,
      ]),
    );
  doc.end();
};

const EXPORTS = { standings: prepareStandings, fixtures: prepareFixtures, summary: prepareSummary };

const EXPORT_FILE_NAMES = {
  standings: "points-table",
  fixtures: "fixtures-results",
  summary: "summary",
};

module.exports = { EXPORTS, EXPORT_FILE_NAMES };
