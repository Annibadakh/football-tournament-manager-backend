const config = require("../config/env");
const logger = require("../config/logger");
const { STREAM_RULES } = require("../constants/stream.constants");
const { watchUrl } = require("../utils/youtube");

/**
 * Looks a video up through YouTube's public oEmbed endpoint (no API key).
 * - 200: title, channel and thumbnail; embeddable
 * - 401/403: the owner disabled embedding
 * - 400/404: private, deleted or not public yet
 * Network problems return { reachable: false } so callers can still save the link.
 */
const lookupVideo = async (videoId) => {
  const url = `${config.youtube.oembedUrl}?format=json&url=${encodeURIComponent(watchUrl(videoId))}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(STREAM_RULES.OEMBED_TIMEOUT_MS) });
    if (res.ok) {
      const body = await res.json();
      return {
        reachable: true,
        found: true,
        isEmbeddable: true,
        title: body.title ?? null,
        channelName: body.author_name ?? null,
        thumbnailUrl: body.thumbnail_url ?? null,
      };
    }
    if (res.status === 401 || res.status === 403)
      return { reachable: true, found: true, isEmbeddable: false };
    return { reachable: true, found: false, isEmbeddable: null };
  } catch (error) {
    logger.warn({ err: error.message, videoId }, "YouTube oEmbed lookup failed");
    return { reachable: false, found: null, isEmbeddable: null };
  }
};

module.exports = { lookupVideo };
