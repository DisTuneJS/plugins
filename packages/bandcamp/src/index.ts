/**
 * Bandcamp Plugin for DisTune
 *
 * This plugin allows DisTune to play music from Bandcamp.
 *
 * Features:
 * - Search for tracks and albums
 * - Play from direct Bandcamp URLs (tracks and albums)
 * - Stream 128kb MP3 audio from Bandcamp
 * - Support for album artwork
 *
 * Example usage:
 * ```ts
 * import { BandcampPlugin } from './BandcampPlugin';
 *
 * const bandcamp = new BandcampPlugin();
 * ```
 */

import { Album, DisTuneError, ExtractorPlugin, Song } from '@distune/core';
import type { ResolveOptions } from '@distune/core';

type Falsy = undefined | null | false | 0 | '';
const isTruthy = <T>(x: T | Falsy): x is T => Boolean(x);

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BandcampPluginOptions {
  // Future options can be added here (e.g., quality preferences, API keys if needed)
}

interface BandcampTrackInfo {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  url: string;
  thumbnail?: string;
  streamUrl: string;
  trackNumber?: number;
}

interface BandcampAlbumInfo {
  id: string;
  title: string;
  artist: string;
  url: string;
  thumbnail?: string;
  tracks: BandcampTrackInfo[];
}

interface BandcampSearchResult {
  type: 't' | 'a' | 'b'; // t = track, a = album, b = band/artist
  name: string;
  item_url_root?: string; // For bands
  item_url_path?: string; // For tracks and albums
  band_name?: string;
  band_id?: number;
  img?: string;
  id: number;
}

export class BandcampPlugin extends ExtractorPlugin {
  constructor(options: BandcampPluginOptions = {}) {
    super();
    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new DisTuneError('INVALID_TYPE', ['object'], options, 'BandcampPluginOptions');
    }
  }

  /**
   * Validates if a URL is a Bandcamp URL
   */
  validate(url: string): boolean {
    if (typeof url !== 'string') return false;

    try {
      const parsed = new URL(url);
      // Match bandcamp.com domains (including subdomains like artist.bandcamp.com)
      return (
        parsed.hostname.endsWith('.bandcamp.com') &&
        (parsed.pathname.includes('/track/') || parsed.pathname.includes('/album/'))
      );
    } catch {
      return false;
    }
  }

  /**
   * Resolves a Bandcamp URL to Song or Album
   */
  async resolve<T>(url: string, options: ResolveOptions<T> = {}): Promise<Song<T> | Album<T>> {
    if (!this.validate(url)) {
      throw new DisTuneError('INVALID_TYPE', 'Bandcamp URL', url, 'url');
    }

    try {
      const html = await this.fetchPage(url);

      if (url.includes('/track/')) {
        return this.parseTrackPage(html, url, options);
      } else if (url.includes('/album/')) {
        return this.parseAlbumPage(html, url, options);
      }

      throw new DisTuneError('BANDCAMP_PLUGIN_INVALID_URL', 'URL must be a track or album');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DisTuneError('BANDCAMP_PLUGIN_RESOLVE_ERROR', message);
    }
  }

  /**
   * Search for songs on Bandcamp
   */
  override async searchSongs<T>(query: string, limit = 10, options: ResolveOptions<T> = {}): Promise<Song<T>[]> {
    if (typeof query !== 'string') {
      throw new DisTuneError('INVALID_TYPE', 'string', query, 'query');
    }
    if (typeof limit !== 'number' || limit < 1 || !Number.isInteger(limit)) {
      throw new DisTuneError('INVALID_TYPE', 'natural number', limit, 'limit');
    }

    try {
      const searchUrl = `https://bandcamp.com/api/bcsearch_public_api/1/autocomplete_elastic`;

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
          search_text: query,
          search_filter: 't',
          full_page: false
        })
      });

      const data: any = await response.json();

      if (!data.auto?.results?.length) {
        throw new DisTuneError('BANDCAMP_PLUGIN_NO_RESULT', `Cannot find any "${query}" tracks on Bandcamp!`);
      }

      const results: BandcampSearchResult[] = data.auto.results.filter((r: any) => r.type === 't');

      if (!results.length) {
        throw new DisTuneError('BANDCAMP_PLUGIN_NO_RESULT', `Cannot find any "${query}" tracks on Bandcamp!`);
      }

      const tracks = await Promise.all(
        results.slice(0, limit).map(async (result) => {
          try {
            const trackUrl = result.item_url_path;
            if (!trackUrl) return null;

            const html = await this.fetchPage(trackUrl);
            return this.parseTrackPage(html, trackUrl, options);
          } catch (error) {
            console.error('Error fetching track:', error);
            return null;
          }
        })
      );
      return tracks.filter(isTruthy) as Song<T>[];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DisTuneError('BANDCAMP_PLUGIN_SEARCH_ERROR', message);
    }
  }

  /**
   * Search for albums on Bandcamp
   */
  override async searchAlbums<T>(query: string, limit = 10, options: ResolveOptions<T> = {}): Promise<Album<T>[]> {
    if (typeof query !== 'string') {
      throw new DisTuneError('INVALID_TYPE', 'string', query, 'query');
    }
    if (typeof limit !== 'number' || limit < 1 || !Number.isInteger(limit)) {
      throw new DisTuneError('INVALID_TYPE', 'natural number', limit, 'limit');
    }

    try {
      const searchUrl = `https://bandcamp.com/api/bcsearch_public_api/1/autocomplete_elastic`;

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
          search_text: query,
          search_filter: 'a',
          full_page: false
        })
      });

      const data: any = await response.json();

      if (!data.auto?.results?.length) {
        throw new DisTuneError('BANDCAMP_PLUGIN_NO_RESULT', `Cannot find any "${query}" albums on Bandcamp!`);
      }

      const results: BandcampSearchResult[] = data.auto.results.filter((r: any) => r.type === 'a');

      if (!results.length) {
        throw new DisTuneError('BANDCAMP_PLUGIN_NO_RESULT', `Cannot find any "${query}" albums on Bandcamp!`);
      }

      const albums = await Promise.all(
        results.slice(0, limit).map(async (result) => {
          try {
            const albumUrl = result.item_url_path;
            if (!albumUrl) return null;

            const html = await this.fetchPage(albumUrl);
            const album = this.parseAlbumPage(html, albumUrl, options);
            // Convert BandcampAlbum to Album
            return new Album<T>(
              {
                source: album.source,
                songs: album.songs,
                name: album.name,
                id: album.id,
                url: album.url,
                thumbnail: album.thumbnail
              },
              options
            );
          } catch (error) {
            console.error('Error fetching album:', error);
            return null;
          }
        })
      );
      return albums.filter(isTruthy) as Album<T>[];
    } catch (error: any) {
      throw new DisTuneError('BANDCAMP_PLUGIN_SEARCH_ERROR', error.message);
    }
  }

  /**
   * Fetch a Bandcamp page
   */
  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Parse a Bandcamp track page
   */
  private parseTrackPage<T>(html: string, url: string, options: ResolveOptions<T>): BandcampSong<T> {
    // Extract the TralbumData JSON from the page
    const tralbumMatch = html.match(/data-tralbum="([^"]+)"/);
    if (!tralbumMatch) {
      throw new Error('Could not find track data on page');
    }

    // Decode HTML entities before parsing JSON
    const decodedData = tralbumMatch[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'");

    const tralbumData = JSON.parse(decodedData);

    // Get the stream URL (128kb MP3)
    const mp3_128 = tralbumData.trackinfo?.[0]?.file?.['mp3-128'];
    if (!mp3_128) {
      console.error('Available track info:', JSON.stringify(tralbumData.trackinfo?.[0], null, 2));
      throw new Error('Could not find MP3 stream URL');
    }

    // Get track info
    const trackInfo = tralbumData.trackinfo[0];
    const artist = tralbumData.artist || this.extractArtistFromMeta(html);
    const thumbnail = tralbumData.artFullsizeUrl || tralbumData.artThumbURL || this.extractThumbnailFromMeta(html);

    const info: BandcampTrackInfo = {
      id: trackInfo.track_id?.toString() || trackInfo.title_link,
      title: trackInfo.title,
      artist: artist,
      album: tralbumData.current?.title,
      duration: trackInfo.duration || 0,
      url: url,
      thumbnail: thumbnail,
      streamUrl: mp3_128,
      trackNumber: trackInfo.track_num
    };

    return new BandcampSong(this, info, options);
  }

  /**
   * Parse a Bandcamp album page
   */
  private parseAlbumPage<T>(html: string, url: string, options: ResolveOptions<T>): BandcampAlbum<T> {
    // Extract the TralbumData JSON from the page
    const tralbumMatch = html.match(/data-tralbum="([^"]+)"/);
    if (!tralbumMatch) {
      throw new Error('Could not find album data on page');
    }

    // Decode HTML entities before parsing JSON
    const decodedData = tralbumMatch[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'");

    const tralbumData = JSON.parse(decodedData);

    const artist = tralbumData.artist || this.extractArtistFromMeta(html);
    const thumbnail = tralbumData.artFullsizeUrl || tralbumData.artThumbURL || this.extractThumbnailFromMeta(html);

    // Parse all tracks in the album
    const tracks: BandcampTrackInfo[] = tralbumData.trackinfo
      .filter((t: any) => t.file?.['mp3-128']) // Only include tracks with stream URLs
      .map((trackInfo: any) => ({
        id: trackInfo.track_id?.toString() || trackInfo.title_link,
        title: trackInfo.title,
        artist: artist,
        album: tralbumData.current?.title,
        duration: trackInfo.duration || 0,
        url: trackInfo.title_link ? `${url.split('/album/')[0]}/track/${trackInfo.title_link}` : url,
        thumbnail: thumbnail,
        streamUrl: trackInfo.file['mp3-128'],
        trackNumber: trackInfo.track_num
      }));

    const albumInfo: BandcampAlbumInfo = {
      id: tralbumData.current?.id?.toString() || url,
      title: tralbumData.current?.title || 'Unknown Album',
      artist: artist,
      url: url,
      thumbnail: thumbnail,
      tracks: tracks
    };

    return new BandcampAlbum(this, albumInfo, options);
  }

  /**
   * Extract artist name from meta tags
   */
  private extractArtistFromMeta(html: string): string {
    const match = html.match(/<meta property="og:site_name" content="([^"]+)"/);
    return match ? match[1] : 'Unknown Artist';
  }

  /**
   * Extract thumbnail from meta tags
   */
  private extractThumbnailFromMeta(html: string): string | undefined {
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);
    return match ? match[1] : undefined;
  }

  /**
   * Get the stream URL for a Bandcamp song
   */
  async getStreamURL<T>(song: BandcampSong<T>): Promise<string> {
    if (!song.streamUrl) {
      throw new DisTuneError('BANDCAMP_PLUGIN_INVALID_SONG', 'Cannot get stream URL from invalid song.');
    }

    // Ensure the URL starts with https://
    if (!song.streamUrl.startsWith('http://') && !song.streamUrl.startsWith('https://')) {
      return `https:${song.streamUrl}`;
    }

    return song.streamUrl;
  }

  /**
   * Search for a single song
   */
  async searchSong<T>(query: string, options: ResolveOptions<T>): Promise<Song<T>> {
    const songs = await this.searchSongs(query, 1, options);
    if (!songs.length) {
      throw new DisTuneError('BANDCAMP_PLUGIN_NO_RESULT', `Cannot find "${query}" on Bandcamp!`);
    }
    return songs[0];
  }

  /**
   * Get related songs for a Bandcamp track
   * This will return other tracks from the same album/artist
   */
  async getRelatedSongs<T>(song: BandcampSong<T>): Promise<Song<T>[]> {
    if (!song.url) {
      return [];
    }

    try {
      // Try to get the artist/album page and return other tracks
      const baseUrl = song.url.split('/track/')[0];
      if (!baseUrl) return [];

      const html = await this.fetchPage(baseUrl);

      // Look for album or music grid
      const tralbumMatch = html.match(/data-tralbum="([^"]+)"/);
      if (tralbumMatch) {
        // Decode HTML entities before parsing JSON
        const decodedData = tralbumMatch[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'");

        const tralbumData = JSON.parse(decodedData);
        const tracks = tralbumData.trackinfo
          .filter((t: any) => t.file?.['mp3-128'] && t.track_id !== song.id)
          .slice(0, 10);

        const artist = tralbumData.artist || this.extractArtistFromMeta(html);
        const thumbnail = tralbumData.artFullsizeUrl || tralbumData.artThumbURL;

        return tracks.map((trackInfo: any) => {
          const trackData: BandcampTrackInfo = {
            id: trackInfo.track_id?.toString() || trackInfo.title_link,
            title: trackInfo.title,
            artist: artist,
            album: tralbumData.current?.title,
            duration: trackInfo.duration || 0,
            url: trackInfo.title_link ? `${baseUrl}/track/${trackInfo.title_link}` : baseUrl,
            thumbnail: thumbnail,
            streamUrl: trackInfo.file['mp3-128'],
            trackNumber: trackInfo.track_num
          };
          return new BandcampSong(this, trackData);
        });
      }

      return [];
    } catch (error) {
      console.error('Error getting related songs:', error);
      return [];
    }
  }
}

class BandcampSong<T> extends Song<T> {
  public streamUrl: string;
  public trackNumber?: number;

  constructor(plugin: BandcampPlugin, info: BandcampTrackInfo, options: ResolveOptions<T> = {}) {
    // Ensure stream URL has a protocol
    let finalStreamUrl = info.streamUrl;
    if (finalStreamUrl && !finalStreamUrl.startsWith('http://') && !finalStreamUrl.startsWith('https://')) {
      finalStreamUrl = `https:${finalStreamUrl}`;
    }

    super(
      {
        plugin,
        source: 'bandcamp',
        playFromSource: true,
        id: info.id,
        name: info.title,
        url: info.url,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: {
          name: info.artist,
          url: info.url.split('/track/')[0] || info.url.split('/album/')[0]
        }
      },
      options
    );

    this.streamUrl = finalStreamUrl;
    this.trackNumber = info.trackNumber;
  }
}

class BandcampAlbum<T> extends Album<T> {
  constructor(plugin: BandcampPlugin, info: BandcampAlbumInfo, options: ResolveOptions<T> = {}) {
    super(
      {
        source: 'bandcamp',
        id: info.id,
        name: info.title,
        artist: info.artist,
        url: info.url,
        thumbnail: info.thumbnail,
        songs: info.tracks.map((track) => new BandcampSong(plugin, track, options))
      },
      options
    );
  }
}

export default BandcampPlugin;
