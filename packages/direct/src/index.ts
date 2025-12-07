import { execSync } from 'child_process';
import { request } from 'undici';
import { DisTuneError, PlayableExtractorPlugin, type ResolveOptions, Song } from '@distune/core';
import which from 'which';

interface Metadata {
  title?: string;
  artist?: string;
  thumbnail?: string;
}

export class DirectPlugin extends PlayableExtractorPlugin {
  private ffprobeAvailable: boolean | null = null;

  private checkFfprobe(): boolean {
    if (this.ffprobeAvailable !== null) {
      return this.ffprobeAvailable;
    }

    try {
      which.sync('ffprobe', { nothrow: true });
      this.ffprobeAvailable = true;
    } catch {
      this.ffprobeAvailable = false;
    }

    return this.ffprobeAvailable;
  }

  private extractMetadata(url: string): Metadata {
    if (!this.checkFfprobe()) {
      return {};
    }

    try {
      const output = execSync(
        `ffprobe -v error -print_format json -show_format -show_streams "${url.replace(/"/g, '\\"')}"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      const data = JSON.parse(output);
      const format = data.format || {};
      const metadata = {} as Metadata;

      // Extract title
      if (format.tags?.title) {
        metadata.title = format.tags.title;
      }

      // Extract artist
      if (format.tags?.artist) {
        metadata.artist = format.tags.artist;
      } else if (format.tags?.ARTIST) {
        metadata.artist = format.tags.ARTIST;
      }

      // Extract thumbnail if present
      if (format.tags?.METADATA_BLOCK_PICTURE) {
        try {
          const thumbnailBase64 = format.tags.METADATA_BLOCK_PICTURE;
          metadata.thumbnail = `data:image/;base64,${thumbnailBase64}`;
        } catch {
          // Ignore thumbnail parsing errors
        }
      }

      return metadata;
    } catch {
      return {};
    }
  }

  override async validate(url: string) {
    try {
      const { headers, statusCode } = await request(url, { method: 'HEAD' });
      if (statusCode !== 200) return false;
      const types = headers['content-type'];
      const type = Array.isArray(types) ? types[0] : types;
      if (['audio/', 'video/', 'application/'].some((s) => type?.startsWith(s))) return true;
    } catch {
      // Ignore validation errors
    }
    return false;
  }

  resolve<T>(url: string, options: ResolveOptions<T> = {}): Song<T> {
    const u = new URL(url);
    const metadata = this.extractMetadata(url);

    return new Song(
      {
        id: u.href,
        name: metadata.title || u.pathname.split('/').pop() || u.href,
        url,
        source: 'direct_link',
        playFromSource: true,
        plugin: this,
        uploader: metadata.artist
          ? {
              name: metadata.artist,
              url: undefined
            }
          : undefined,
        thumbnail: metadata.thumbnail
      },
      options
    );
  }

  getStreamURL(song: Song) {
    if (!song.url) {
      throw new DisTuneError('DIRECT_LINK_PLUGIN_INVALID_SONG', 'Cannot get stream url from invalid song.');
    }
    return song.url;
  }

  getRelatedSongs() {
    return [];
  }
}
