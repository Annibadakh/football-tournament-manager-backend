// YouTube link helpers (pure)
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"];
const PATH_PREFIXES = ["/live/", "/embed/", "/shorts/", "/v/"];

/**
 * Extracts the 11-character video id from the link formats people paste:
 * watch?v=, /live/, /embed/, /shorts/, youtu.be/ (with or without https, www, m.).
 * Returns null for anything else.
 */
const parseYouTubeId = (input) => {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (VIDEO_ID.test(trimmed)) return null; // bare ids aren't accepted; links only
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  let id = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1];
  } else if (HOSTS.includes(host)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const prefix = PATH_PREFIXES.find((item) => url.pathname.startsWith(item));
      if (prefix) id = url.pathname.slice(prefix.length).split("/")[0];
    }
  }
  return id && VIDEO_ID.test(id) ? id : null;
};

const watchUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;
const embedUrl = (videoId) => `https://www.youtube-nocookie.com/embed/${videoId}`;

module.exports = { parseYouTubeId, watchUrl, embedUrl };
