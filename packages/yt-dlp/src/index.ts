import {
  DisTuneError,
  PlayableExtractorPlugin,
  Playlist,
  Song,
} from "@distune/core";
import type { DisTune, ResolveOptions } from "@distune/core";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const isPlaylist = (i: any): i is YtDlpPlaylist => Array.isArray(i.entries);

interface YtDlpOptions {
  binary?: string;
}

interface YtDlpPlaylist {
  entries: YtDlpVideo[];
  id: string;
  title: string;
  webpage_url: string;
  thumbnails?: { url: string }[];
  extractor: string;
}

interface YtDlpVideo {
  id: string;
  title: string;
  fulltitle?: string;
  webpage_url: string;
  original_url?: string;
  is_live?: boolean;
  thumbnail?: string;
  thumbnails?: { url: string }[];
  duration: number;
  uploader?: string;
  uploader_url?: string;
  view_count?: number;
  like_count?: number;
  dislike_count?: number;
  repost_count?: number;
  age_limit?: number;
  extractor: string;
  url: string;
}

async function ytDlpJson(
  url: string,
  options: Record<string, any> = {},
  binary = "yt-dlp"
): Promise<YtDlpVideo | YtDlpPlaylist> {
  const args: string[] = [];

  // When dumpSingleJson is true, we want playlist info in a single JSON object
  // Otherwise, we just want individual video info
  if (options.dumpSingleJson) {
    args.push("--dump-single-json");
  } else {
    args.push("--dump-json");
  }

  if (options.noWarnings) args.push("--no-warnings");
  if (options.preferFreeFormats) args.push("--prefer-free-formats");
  if (options.skipDownload) args.push("--skip-download");
  if (options.simulate) args.push("--simulate");
  if (options.format) args.push("--format", options.format);

  // Add URL in quotes to handle special characters
  args.push(JSON.stringify(url));

  const command = `${binary} ${args.join(" ")}`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
    });
    if (stderr && !options.noWarnings) {
      console.warn("yt-dlp stderr:", stderr);
    }

    // Handle multiple JSON objects (one per line) or single JSON
    const trimmed = stdout.trim();
    if (!trimmed) {
      throw new Error("yt-dlp returned empty output");
    }

    // If dumpSingleJson was used, we should get a single JSON object
    if (options.dumpSingleJson) {
      return JSON.parse(trimmed);
    }

    // Otherwise, handle multiple JSON lines (for playlists without --dump-single-json)
    const lines = trimmed.split("\n").filter((line) => line.trim());
    if (lines.length === 1) {
      return JSON.parse(lines[0]);
    }

    // Multiple lines means multiple videos - parse each as a separate video
    const videos = lines.map((line) => JSON.parse(line));
    return videos[0]; // Return first video for single video requests
  } catch (error: any) {
    throw new Error(error.stderr || error.message || String(error));
  }
}

export class YtDlpPlugin extends PlayableExtractorPlugin {
  private binary: string;

  constructor({ binary = "yt-dlp" }: YtDlpOptions = {}) {
    super();
    this.binary = binary;
  }

  override init(distune: DisTune) {
    super.init(distune);
    if (this.distune.plugins[this.distune.plugins.length - 1] !== this) {
      console.warn(
        `[${this.constructor.name}] This plugin is not the last plugin in distune. This is not recommended.`
      );
    }
  }

  validate() {
    return true;
  }

  async resolve<T>(url: string, options: ResolveOptions<T>) {
    const info = await ytDlpJson(
      url,
      {
        dumpSingleJson: true,
        noWarnings: true,
        preferFreeFormats: true,
        skipDownload: true,
        simulate: true,
      },
      this.binary
    ).catch((e: any) => {
      throw new DisTuneError("YTDLP_ERROR", `${e.stderr || e}`);
    });
    if (isPlaylist(info)) {
      if (info.entries.length === 0)
        throw new DisTuneError("YTDLP_ERROR", "The playlist is empty");
      return new Playlist(
        {
          source: `${info.extractor} [yt-dlp]`,
          songs: info.entries.map((i) => new YtDlpSong(this, i, options)),
          id: info.id.toString(),
          name: info.title,
          url: info.webpage_url,
          thumbnail: info.thumbnails?.[0]?.url,
        },
        options
      );
    }
    return new YtDlpSong(this, info, options);
  }

  async getStreamURL(song: Song) {
    if (!song.url) {
      throw new DisTuneError(
        "YTDLP_PLUGIN_INVALID_SONG",
        "Cannot get stream url from invalid song."
      );
    }
    const info = await ytDlpJson(
      song.url,
      {
        dumpSingleJson: true,
        noWarnings: true,
        noCallHome: true,
        preferFreeFormats: true,
        skipDownload: true,
        simulate: true,
        format: "ba/ba*",
      },
      this.binary
    ).catch((e: any) => {
      throw new DisTuneError("YTDLP_ERROR", `${e.stderr || e}`);
    });
    if (isPlaylist(info))
      throw new DisTuneError(
        "YTDLP_ERROR",
        "Cannot get stream URL of a entire playlist"
      );
    return info.url;
  }

  getRelatedSongs() {
    return [];
  }
}

class YtDlpSong<T> extends Song<T> {
  constructor(
    plugin: YtDlpPlugin,
    info: YtDlpVideo,
    options: ResolveOptions<T> = {}
  ) {
    super(
      {
        plugin,
        source: `${info.extractor} [yt-dlp]`,
        playFromSource: true,
        id: info.id,
        name: info.title || info.fulltitle,
        url: info.webpage_url || info.original_url,
        isLive: info.is_live,
        thumbnail: info.thumbnail || info.thumbnails?.[0]?.url,
        duration: info.is_live ? 0 : info.duration,
        uploader: {
          name: info.uploader,
          url: info.uploader_url,
        },
        views: info.view_count,
        likes: info.like_count,
        dislikes: info.dislike_count,
        reposts: info.repost_count,
        ageRestricted: Boolean(info.age_limit) && (info.age_limit ?? 0) >= 18,
      },
      options
    );
  }
}
