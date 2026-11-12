# JSON Edge demo media

The owner-supplied `docs/media/jsonedgedemo.mp4` is preserved unchanged. Its derived `jsonedgedemo.gif` is embedded near the top of the Marketplace README so the demonstration is visible without opening a separate video page. The original MP4 remains linked for full-colour video and audio.

## Verified conversion

- Full source resolution: **1920 × 1080**; no resizing or cropping.
- All **1,241 source frames** retained; no frame dropping or trimming.
- Source rate: **30 fps**. GIF uses centiseconds, so alternating 30/40 ms frame delays preserve approximately 30 fps, with 41.36 seconds total playback.
- GIF colour is palette-limited (up to 256 entries); global palette generation and Sierra dithering preserve readable detail. Identical MP4 colour quality cannot be represented in GIF.
- GIF has no audio and loops continuously. Use the unchanged original MP4 for audio.
- Actual sizes, checksums and source/screenshot metadata are in `docs/media/demo-manifest.json`.

The full-resolution animation is large. Both GIF and MP4 are hosted in the public repository and excluded from the runtime VSIX to keep extension installation small. The README uses HTTPS links to the hosted assets. Push the assets before publishing the new package; inspect the real Marketplace/VS Code details page afterward.

## Selected screenshots

The three owner-selected PNGs replace all prior Marketplace screenshots. They are copied byte-for-byte, with no image editing. See [screenshot index](../images/README.md). Empty-state captures are labelled as such; the animation shows the actual populated workflow.

## Reproduce the GIF

Use FFmpeg in two passes to avoid buffering the entire full-resolution recording in memory:

```sh
ffmpeg -i docs/media/jsonedgedemo.mp4 -vf "palettegen=max_colors=256:stats_mode=diff" -frames:v 1 palette.png
ffmpeg -i docs/media/jsonedgedemo.mp4 -i palette.png -lavfi "paletteuse=dither=sierra2_4a:diff_mode=rectangle" -fps_mode passthrough -loop 0 docs/media/jsonedgedemo.gif
```

Do not add scaling, frame-rate reduction or trimming when reproducing this owner-requested conversion. The palette is a temporary development artifact; keep it outside the repository. FFmpeg is not an extension runtime dependency.
