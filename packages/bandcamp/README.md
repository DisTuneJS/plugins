<div align="center">
  <p>
    <a href="https://nodei.co/npm/@distune/plugin-yt-dlp"><img src="https://nodei.co/npm/@distune/plugin-yt-dlp.png?downloads=true&downloadRank=true&stars=true"></a>
  </p>
  <p>
    <img alt="npm peer dependency version" src="https://img.shields.io/npm/dependency-version/@distune/plugin-yt-dlp/peer/distune?style=flat-square">
    <img alt="npm" src="https://img.shields.io/npm/dt/@distune/plugin-yt-dlp?logo=npm&style=flat-square">
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/DisTuneJS/plugins?logo=github&logoColor=white&style=flat-square">
  </p>
</div>

# @distune/plugin-bandcamp

A DisTune extractor plugin for Bandcamp.

[_What is a playable extractor plugin?_](https://github.com/DisTuneJS/DisTune/wiki/Projects-Hub#plugins)

# Features

- Search for tracks and albums
- Play music directly from Bandcamp URLs

# Installation

```sh
pnpm install @distune/plugin-bandcamp@latest
```

# Usage

```ts
import { DisTune } from "@distune/core";
import { BandcampPlugin } from "@distune/plugin-bandcamp";

const distune = new DisTune(client, {
  plugins: [new BandcampPlugin()],
});
```