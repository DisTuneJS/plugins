import { beforeEach, describe, expect, it } from 'vitest';
import { BandcampPlugin } from '../src/index';

describe('BandcampPlugin - basic behaviors', () => {
  let plugin: BandcampPlugin;

  beforeEach(() => {
    plugin = new BandcampPlugin();
  });

  it('validates bandcamp links correctly', () => {
    expect(plugin.validate('https://artist.bandcamp.com/track/song-name')).toBe(true);
    expect(plugin.validate('https://artist.bandcamp.com/album/album-name')).toBe(true);
    expect(plugin.validate('https://not-bandcamp.com/track/song')).toBe(false);
    expect(plugin.validate('not-a-url')).toBe(false);
  });

  it('resolve track URL returns song with expected fields', async () => {
    const trackUrl = 'https://kinggizzard.bandcamp.com/track/supercell';

    const song = await plugin.resolve(trackUrl);
    expect(song.name).toBe('Supercell');
    expect(song.url).toBe(trackUrl);
    expect(song.duration).toBe(305.862);
  });

  it('resolve album URL returns album with tracks', async () => {
    const url =
      'https://kinggizzard.bandcamp.com/album/petrodragonic-apocalypse-or-dawn-of-eternal-night-an-annihilation-of-planet-earth-and-the-beginning-of-merciless-damnation';

    const album = await plugin.resolve(url);
    expect(album.songs).toBeDefined();
    expect(album.songs.length).toBe(7);
    expect(album.name).toContain('PetroDragonic Apocalypse');
    expect(album.songs[0].name).toBe('Motor Spirit');
  });

  it('getStreamURL returns https: schema when missing', async () => {
    const trackUrl = 'https://kinggizzard.bandcamp.com/track/supercell';
    const song: any = await plugin.resolve(trackUrl);

    // The streamUrl should already be fixed in the song object
    expect(song.streamUrl).toMatch(/^https:\/\//);

    // Test the getStreamURL method
    const streamUrl = await plugin.getStreamURL(song);
    expect(streamUrl).toMatch(/^https:\/\//);
  });
});

export {};
