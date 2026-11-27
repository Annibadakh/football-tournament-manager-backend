// Pure fixture algorithms (no database): generators, bracket seeding, scheduling, clash checks
const { APP_TIMEZONE } = require("../constants/common.constants");
const { FIXTURE_RULES } = require("../constants/match.constants");

// Fisher–Yates shuffle; `random` is injectable for tests
const shuffle = (items, random = Math.random) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Round robin by the circle method. Returns rounds of [home, away] pairs.
 * Odd counts get a rest slot (that team sits out the round). Leg 2 mirrors leg 1 with home/away swapped.
 */
const roundRobin = (teams, { legs = 1 } = {}) => {
  const slots = teams.length % 2 === 0 ? [...teams] : [...teams, null];
  const size = slots.length;
  const firstLeg = [];
  for (let round = 0; round < size - 1; round += 1) {
    const pairs = [];
    for (let i = 0; i < size / 2; i += 1) {
      const a = slots[i];
      const b = slots[size - 1 - i];
      if (a === null || b === null) continue;
      // Alternate the fixed team's side each round to balance home/away
      pairs.push(i === 0 && round % 2 === 1 ? [b, a] : [a, b]);
    }
    firstLeg.push(pairs);
    // Rotate every slot except the first
    slots.splice(1, 0, slots.pop());
  }
  if (legs < 2) return firstLeg;
  return [...firstLeg, ...firstLeg.map((pairs) => pairs.map(([home, away]) => [away, home]))];
};

// Random draw into balanced groups (sizes differ by at most one)
const drawGroups = (teams, groupsCount, random = Math.random) => {
  const groups = Array.from({ length: groupsCount }, () => []);
  shuffle(teams, random).forEach((team, index) => groups[index % groupsCount].push(team));
  return groups;
};

const groupName = (index) => String.fromCharCode(65 + index);

const nextPowerOfTwo = (n) => 2 ** Math.ceil(Math.log2(Math.max(n, 2)));

// Standard bracket order: seed 1 meets the lowest seed, top seeds only meet late
const bracketOrder = (size) => {
  let order = [1, 2];
  while (order.length < size) {
    const total = order.length * 2 + 1;
    order = order.flatMap((seed) => [seed, total - seed]);
  }
  return order;
};

/**
 * Knockout bracket for entries in seed order (entry = team id or a seed label like "A1").
 * Returns rounds of { home, away } where null is a bye in round 1. Later rounds are empty slots.
 */
const buildBracket = (entries) => {
  const size = nextPowerOfTwo(entries.length);
  const order = bracketOrder(size);
  const firstRound = [];
  for (let i = 0; i < size; i += 2) {
    firstRound.push({
      home: entries[order[i] - 1] ?? null,
      away: entries[order[i + 1] - 1] ?? null,
    });
  }
  const rounds = [firstRound];
  for (let count = size / 4; count >= 1; count /= 2) {
    rounds.push(Array.from({ length: count }, () => ({ home: null, away: null })));
  }
  return rounds;
};

/**
 * Knockout seeds after groups: "A1", "B2"… Two qualifiers from an even number of groups use
 * the classic crossover (A1 v B2, B1 v A2) with each pair's winners on opposite halves.
 * Other set-ups seed all group winners first, then runners-up, through bracketOrder.
 */
const crossoverEntries = (groupsCount, qualifiersPerGroup) => {
  const labels = Array.from({ length: groupsCount }, (_, i) => groupName(i));
  if (qualifiersPerGroup === 2 && groupsCount % 2 === 0 && groupsCount >= 2) {
    const firstHalf = [];
    const secondHalf = [];
    for (let i = 0; i < groupsCount; i += 2) {
      const [a, b] = [labels[i], labels[i + 1]];
      firstHalf.push([`${a}1`, `${b}2`]);
      secondHalf.push([`${b}1`, `${a}2`]);
    }
    return { pairs: [...firstHalf, ...secondHalf] };
  }
  const entries = [];
  for (let place = 1; place <= qualifiersPerGroup; place += 1) {
    labels.forEach((label) => entries.push(`${label}${place}`));
  }
  return { entries };
};

// "A1" → "Group A winner", "B2" → "Group B runner-up", "C3" → "Group C 3rd"
const seedPlaceholder = (seed) => {
  const group = seed.slice(0, -1);
  const place = Number(seed.slice(-1));
  const placeName = { 1: "winner", 2: "runner-up", 3: "3rd", 4: "4th" }[place] ?? `#${place}`;
  return `Group ${group} ${placeName}`;
};

// ---------- time ----------

// "2027-03-10" + "09:30" in Indian time → Date (stored as UTC)
const zonedDateTime = (date, time) => new Date(`${date}T${time}:00+05:30`);

const addDays = (date, days) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const appDateOf = (when) => new Date(when).toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });

const matchDurationMinutes = (halfMinutes) => halfMinutes * 2 + FIXTURE_RULES.BREAK_MINUTES;

const overlaps = (startA, startB, minutes) =>
  Math.abs(new Date(startA).getTime() - new Date(startB).getTime()) < minutes * 60000;

/**
 * Checks a match against others (same tournament or ground). Blocking: same ground or same team
 * in overlapping time. Warning: a team plays twice on the same day.
 */
const findClashes = (candidate, others, { durationMinutes }) => {
  const errors = [];
  const warnings = [];
  if (!candidate.scheduledAt) return { errors, warnings };
  const teams = [candidate.homeTeamId, candidate.awayTeamId].filter(Boolean);
  others.forEach((other) => {
    if (!other.scheduledAt || other.id === candidate.id) return;
    const isOverlap = overlaps(candidate.scheduledAt, other.scheduledAt, durationMinutes);
    const sharedTeams = [other.homeTeamId, other.awayTeamId].filter((id) => teams.includes(id));
    if (isOverlap && candidate.groundId && other.groundId === candidate.groundId) {
      errors.push({ type: "ground", matchId: other.id });
    }
    if (isOverlap && sharedTeams.length) {
      errors.push({ type: "team", matchId: other.id, teamIds: sharedTeams });
    } else if (
      sharedTeams.length &&
      appDateOf(other.scheduledAt) === appDateOf(candidate.scheduledAt)
    ) {
      warnings.push({ type: "same_day", matchId: other.id, teamIds: sharedTeams });
    }
  });
  return { errors, warnings };
};

/**
 * Fills kick-off times and grounds for matches (already in play order) slot by slot.
 * A round starts only after every match of the previous round has an earlier slot, a team never
 * plays twice in one slot, and slots taken by `busy` matches (already scheduled) are skipped.
 * Returns { assignments: [{ id, scheduledAt, groundId }], unscheduledIds }.
 */
const autoSchedule = (
  matches,
  { startDate, firstKickoff, lastKickoff, slotMinutes, groundIds, busy = [], durationMinutes },
) => {
  const queue = [...matches];
  const assignments = [];
  const taken = busy.filter((match) => match.scheduledAt);
  let lastSlotOfPreviousRound = null;
  let currentRound = queue[0]?.roundKey;

  for (let day = 0; day < FIXTURE_RULES.MAX_SCHEDULE_DAYS && queue.length; day += 1) {
    const date = addDays(startDate, day);
    const dayEnd = zonedDateTime(date, lastKickoff).getTime();
    for (
      let slot = zonedDateTime(date, firstKickoff).getTime();
      slot <= dayEnd && queue.length;
      slot += slotMinutes * 60000
    ) {
      const slotDate = new Date(slot);
      // The next round may begin only in a later slot than the previous round's last match
      if (queue[0].roundKey !== currentRound) {
        if (lastSlotOfPreviousRound !== null && slot <= lastSlotOfPreviousRound) continue;
        currentRound = queue[0].roundKey;
      }
      const teamsInSlot = new Set();
      for (const groundId of groundIds) {
        const groundBusy = taken.some(
          (match) =>
            match.groundId === groundId && overlaps(match.scheduledAt, slotDate, durationMinutes),
        );
        if (groundBusy) continue;
        const index = queue.findIndex((match) => {
          if (match.roundKey !== currentRound) return false;
          const teams = [match.homeTeamId, match.awayTeamId].filter(Boolean);
          if (teams.some((team) => teamsInSlot.has(team))) return false;
          return !taken.some(
            (other) =>
              overlaps(other.scheduledAt, slotDate, durationMinutes) &&
              [other.homeTeamId, other.awayTeamId].some((team) => team && teams.includes(team)),
          );
        });
        if (index === -1) continue;
        const [match] = queue.splice(index, 1);
        [match.homeTeamId, match.awayTeamId].filter(Boolean).forEach((t) => teamsInSlot.add(t));
        const assignment = { id: match.id, scheduledAt: slotDate, groundId };
        assignments.push(assignment);
        taken.push({ ...match, ...assignment });
        if (!queue.some((rest) => rest.roundKey === currentRound)) {
          lastSlotOfPreviousRound = slot;
        }
      }
    }
  }
  return { assignments, unscheduledIds: queue.map((match) => match.id) };
};

module.exports = {
  shuffle,
  roundRobin,
  drawGroups,
  groupName,
  nextPowerOfTwo,
  bracketOrder,
  buildBracket,
  crossoverEntries,
  seedPlaceholder,
  zonedDateTime,
  matchDurationMinutes,
  findClashes,
  autoSchedule,
};
