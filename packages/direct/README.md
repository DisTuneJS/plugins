<div align="center">
  <p>
    <a href="https://nodei.co/npm/@distune/plugin-direct"><img src="https://nodei.co/npm/@distune/plugin-direct.png?downloads=true&downloadRank=true&stars=true"></a>
  </p>
  <p>
    <img alt="npm peer dependency version" src="https://img.shields.io/npm/dependency-version/@distune/plugin-direct/peer/distune?style=flat-square">
    <img alt="npm" src="https://img.shields.io/npm/dt/@distune/plugin-direct?logo=npm&style=flat-square">
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/DisTuneJS/plugins?logo=github&logoColor=white&style=flat-square">
  </p>
</div>

# @distune/plugin-direct

A DisTune playable extractor plugin for direct links

[_What is a playable extractor plugin?_](https://github.com/DisTuneJS/DisTune/wiki/Projects-Hub#plugins)

# Feature

- Any audio formats supported by ffmpeg
- Song name, artist and album metadata extraction from tags
- Thumbnail extraction from tags

# Installation

```sh
pnpm install @distune/plugin-direct@latest
```

# Usage

```ts
import { DisTune } from "@distune/core";
import { DirectPlugin } from "@distune/plugin-direct";

const distune = new DisTune(client, {
  plugins: [new DirectPlugin()],
});
```
