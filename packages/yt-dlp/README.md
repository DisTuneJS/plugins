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

# @distune/plugin-yt-dlp

A DisTune playable extractor plugin using [yt-dlp](https://github.com/yt-dlp/yt-dlp)

[_What is a playable extractor plugin?_](https://github.com/DisTuneJS/DisTune/wiki/Projects-Hub#plugins)

# Feature

- Support [900+ sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) using [yt-dlp](https://github.com/yt-dlp/yt-dlp)

# Installation

```sh
pnpm install @distune/plugin-yt-dlp@latest
```

# Usage

```ts
import { DisTune } from "@distune/core";
import { YtDlpPlugin } from "@distune/plugin-yt-dlp";

const distune = new DisTune(client, {
  plugins: [new YtDlpPlugin()],
});
```

# Documentation

### new YtDlpPlugin([YtDlpPluginOptions])

Create a DisTune `PlayableExtractorPlugin` instance.

> YtDlpPlugin should be the last plugin in the `plugins` array.
