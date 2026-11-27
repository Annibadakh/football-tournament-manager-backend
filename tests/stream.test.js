import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { parseYouTubeId, embedUrl } = require("../utils/youtube");
const youtubeService = require("../services/youtube.service");
const { sortStreams } = require("../services/stream.service");
const { STREAM_STATUS } = require("../constants/stream.constants");

const ID = "dQw4w9WgXcQ";

describe("parseYouTubeId", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}&feature=share`,
    `https://www.youtube.com/live/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://youtube.com/shorts/${ID}`,
    `https://youtu.be/${ID}`,
    `youtu.be/${ID}?t=10`,
    `  https://youtu.be/${ID}  `,
  ])("reads %s", (url) => {
    expect(parseYouTubeId(url)).toBe(ID);
  });

  it.each([
    ID,
    "https://vimeo.com/12345",
    "https://www.youtube.com/channel/UC1234567890",
    "https://www.youtube.com/watch?v=short",
    "https://evil.com/watch?v=dQw4w9WgXcQ",
    "not a link",
    "",
    null,
  ])("rejects %s", (url) => {
    expect(parseYouTubeId(url)).toBeNull();
  });

  it("builds the privacy-friendly embed URL", () => {
    expect(embedUrl(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`);
  });
});

describe("lookupVideo (oEmbed)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const respond = (status, body) =>
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: status === 200, status, json: async () => body }),
    );

  it("maps a public video", async () => {
    respond(200, { title: "Final", author_name: "Maidaan", thumbnail_url: "t.jpg" });
    expect(await youtubeService.lookupVideo(ID)).toEqual({
      reachable: true,
      found: true,
      isEmbeddable: true,
      title: "Final",
      channelName: "Maidaan",
      thumbnailUrl: "t.jpg",
    });
  });

  it("detects disabled embedding and private videos", async () => {
    respond(401);
    expect(await youtubeService.lookupVideo(ID)).toMatchObject({
      found: true,
      isEmbeddable: false,
    });
    respond(404);
    expect(await youtubeService.lookupVideo(ID)).toMatchObject({
      found: false,
      isEmbeddable: null,
    });
  });

  it("survives YouTube being unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await youtubeService.lookupVideo(ID)).toEqual({
      reachable: false,
      found: null,
      isEmbeddable: null,
    });
  });
});

describe("sortStreams", () => {
  it("puts live first, upcoming soonest next, replays latest first", () => {
    const sorted = sortStreams([
      { uuid: "old-replay", status: STREAM_STATUS.ENDED, endedAt: "2027-01-01" },
      { uuid: "later", status: STREAM_STATUS.SCHEDULED, scheduledAt: "2027-03-02" },
      { uuid: "live", status: STREAM_STATUS.LIVE, scheduledAt: "2027-03-01" },
      { uuid: "new-replay", status: STREAM_STATUS.ENDED, endedAt: "2027-02-01" },
      { uuid: "sooner", status: STREAM_STATUS.SCHEDULED, scheduledAt: "2027-03-01" },
    ]);
    expect(sorted.map((s) => s.uuid)).toEqual([
      "live",
      "sooner",
      "later",
      "new-replay",
      "old-replay",
    ]);
  });
});
