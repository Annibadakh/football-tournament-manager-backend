const matchRepository = require("../repositories/match.repository");
const streamRepository = require("../repositories/stream.repository");
const tournamentRepository = require("../repositories/tournament.repository");
const youtubeService = require("./youtube.service");
const {
  assertViewable,
  canManageTournament,
  findViewableTournament,
} = require("./tournamentAccess.service");
const ApiError = require("../utils/ApiError");
const { embedUrl, parseYouTubeId, watchUrl } = require("../utils/youtube");
const { STREAM_STATUS } = require("../constants/stream.constants");

const fieldError = (field, message) => ApiError.badRequest(message, [{ field, message }]);

const STATUS_ORDER = {
  [STREAM_STATUS.LIVE]: 0,
  [STREAM_STATUS.SCHEDULED]: 1,
  [STREAM_STATUS.ENDED]: 2,
};

// ---------- presenters ----------

const presentTeam = (team) => team && { id: team.uuid, name: team.name, shortName: team.shortName };

const presentStream = (stream) => ({
  id: stream.uuid,
  title: stream.title,
  videoId: stream.youtubeVideoId,
  watchUrl: watchUrl(stream.youtubeVideoId),
  embedUrl: embedUrl(stream.youtubeVideoId),
  thumbnailUrl:
    stream.thumbnailUrl ?? `https://i.ytimg.com/vi/${stream.youtubeVideoId}/hqdefault.jpg`,
  channelName: stream.channelName,
  isEmbeddable: stream.isEmbeddable,
  scheduledAt: stream.scheduledAt,
  status: stream.status,
  startedAt: stream.startedAt,
  endedAt: stream.endedAt,
  match: stream.match && {
    id: stream.match.uuid,
    matchNumber: stream.match.matchNumber,
    roundName: stream.match.roundName,
    homeTeam: presentTeam(stream.match.homeTeam),
    awayTeam: presentTeam(stream.match.awayTeam),
  },
});

// Live first, then upcoming (soonest first), then replays (latest first)
const sortStreams = (streams) =>
  [...streams].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus) return byStatus;
    const timeOf = (stream) =>
      new Date(stream.endedAt ?? stream.scheduledAt ?? stream.createdAt).getTime();
    return a.status === STREAM_STATUS.ENDED ? timeOf(b) - timeOf(a) : timeOf(a) - timeOf(b);
  });

// ---------- access ----------

const canManageStreams = async (user, tournament) =>
  Boolean(user) &&
  (canManageTournament(user, tournament) ||
    (await streamRepository.isActiveMediaOperator(tournament.id, user.id)));

const assertCanManage = async (user, tournament) => {
  if (!(await canManageStreams(user, tournament)))
    throw ApiError.forbidden(
      "Only the organizer and the tournament's media operators manage streams",
    );
  if (!tournament.isStreamingEnabled)
    throw ApiError.badRequest(
      "Streaming isn't enabled for this tournament. Ask an admin to turn it on.",
    );
};

// ---------- link check ----------

const resolveVideo = async (url) => {
  const videoId = parseYouTubeId(url);
  if (!videoId)
    throw fieldError(
      "url",
      "Paste a YouTube link (youtube.com/watch?v=…, youtube.com/live/… or youtu.be/…)",
    );
  const lookup = await youtubeService.lookupVideo(videoId);
  const warnings = [];
  if (!lookup.reachable)
    warnings.push(
      "Couldn't check the link with YouTube right now. It was saved; check it before going live.",
    );
  else if (!lookup.found)
    warnings.push(
      "YouTube says this video is private or doesn't exist yet. Check the link before going live.",
    );
  else if (lookup.isEmbeddable === false)
    warnings.push("The channel doesn't allow embedding, so viewers get a Watch on YouTube button.");
  return {
    videoId,
    warnings,
    lookup,
    fields: {
      youtubeVideoId: videoId,
      isEmbeddable: lookup.isEmbeddable,
      thumbnailUrl: lookup.thumbnailUrl ?? null,
      channelName: lookup.channelName ?? null,
    },
  };
};

const matchLabel = (match) =>
  `M${match.matchNumber} · ${match.homeTeam?.name ?? match.homePlaceholder ?? "TBD"} v ${match.awayTeam?.name ?? match.awayPlaceholder ?? "TBD"}`;

const resolveMatch = async (tournament, matchUuid, { exceptStreamId } = {}) => {
  if (!matchUuid) return null;
  const match = await matchRepository.findMatchByUuid(matchUuid);
  if (!match || match.tournamentId !== tournament.id)
    throw fieldError("matchId", "Choose a match from this tournament");
  const existing = await streamRepository.findStreamByMatchId(match.id);
  if (existing && existing.id !== exceptStreamId)
    throw ApiError.conflict("This match already has a stream. Edit that one instead.", [
      { field: "matchId", message: "This match already has a stream" },
    ]);
  return match;
};

// started/ended times follow manual status changes
const statusFields = (stream, status) => {
  if (status === undefined || status === stream?.status) return {};
  const now = new Date();
  if (status === STREAM_STATUS.LIVE)
    return { status, startedAt: stream?.startedAt ?? now, endedAt: null };
  if (status === STREAM_STATUS.ENDED)
    return { status, endedAt: now, startedAt: stream?.startedAt ?? null };
  return { status, endedAt: null };
};

// ---------- commands ----------

const createStream = async (actor, tournamentId, { title, url, scheduledAt, matchId }) => {
  const tournament = await findViewableTournament(actor, tournamentId);
  await assertCanManage(actor, tournament);
  const match = await resolveMatch(tournament, matchId);
  const video = await resolveVideo(url);
  const finalTitle = title || (match ? matchLabel(match) : video.lookup.title) || "Live stream";
  const stream = await streamRepository.createStream({
    tournamentId: tournament.id,
    matchId: match?.id ?? null,
    title: finalTitle.slice(0, 120),
    scheduledAt: scheduledAt ?? match?.scheduledAt ?? null,
    status: STREAM_STATUS.SCHEDULED,
    createdBy: actor.id,
    updatedBy: actor.id,
    ...video.fields,
  });
  return {
    stream: presentStream(await streamRepository.findStreamByUuid(stream.uuid)),
    warnings: video.warnings,
  };
};

const loadStreamForManager = async (actor, streamUuid) => {
  const stream = await streamRepository.findStreamByUuid(streamUuid);
  if (!stream) throw ApiError.notFound("Stream not found");
  const tournament = await tournamentRepository.findTournamentById(stream.tournamentId);
  await assertCanManage(actor, tournament);
  return { stream, tournament };
};

const updateStream = async (actor, streamUuid, changes) => {
  const { stream, tournament } = await loadStreamForManager(actor, streamUuid);
  const match =
    changes.matchId !== undefined
      ? await resolveMatch(tournament, changes.matchId, { exceptStreamId: stream.id })
      : undefined;
  const video = changes.url ? await resolveVideo(changes.url) : null;
  await streamRepository.updateStream(stream, {
    ...(changes.title !== undefined && { title: changes.title }),
    ...(changes.scheduledAt !== undefined && { scheduledAt: changes.scheduledAt }),
    ...(match !== undefined && { matchId: match?.id ?? null }),
    ...(video && video.fields),
    ...statusFields(stream, changes.status),
    updatedBy: actor.id,
  });
  return {
    stream: presentStream(await streamRepository.findStreamByUuid(streamUuid)),
    warnings: video?.warnings ?? [],
  };
};

const deleteStream = async (actor, streamUuid) => {
  const { stream } = await loadStreamForManager(actor, streamUuid);
  await stream.destroy();
  return null;
};

// ---------- reads ----------

const listStreams = async (viewer, tournamentId) => {
  const tournament = await findViewableTournament(viewer, tournamentId);
  const canManage = await canManageStreams(viewer, tournament);
  if (!tournament.isStreamingEnabled) return { isEnabled: false, canManage, streams: [] };
  const streams = await streamRepository.findStreamsByTournament(tournament.id);
  return { isEnabled: true, canManage, streams: sortStreams(streams).map(presentStream) };
};

// The match's stream for the match page (null when streaming is off or none added)
const getMatchStream = async (match, tournament) => {
  if (!tournament.isStreamingEnabled) return null;
  const stream = await streamRepository.findStreamByMatchId(match.id);
  return stream ? presentStream(stream) : null;
};

const getStream = async (viewer, streamUuid) => {
  const stream = await streamRepository.findStreamByUuid(streamUuid);
  if (!stream) throw ApiError.notFound("Stream not found");
  assertViewable(viewer, await tournamentRepository.findTournamentById(stream.tournamentId));
  return presentStream(stream);
};

// Tournaments the user streams for (media operator), for their dashboard
const listMyStreamingTournaments = async (user) =>
  (await streamRepository.findMediaOperatorTournaments(user.id)).map((tournament) => ({
    id: tournament.uuid,
    slug: tournament.slug,
    name: tournament.name,
    status: tournament.status,
    startDate: tournament.startDate,
  }));

module.exports = {
  presentStream,
  sortStreams,
  createStream,
  updateStream,
  deleteStream,
  listStreams,
  getMatchStream,
  getStream,
  listMyStreamingTournaments,
};
