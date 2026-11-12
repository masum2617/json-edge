# JSON Edge demo video

The only demonstration video is [jsonedgedemo.mp4](https://github.com/masum2617/json-edge/blob/main/docs/media/jsonedgedemo.mp4), supplied by the project owner on 2026-11-12.

The source recording is copied byte-for-byte into `docs/media/jsonedgedemo.mp4`. It has not been trimmed, transcoded or converted to an animation. The previous generated demo files and automatic demo recorder have been removed.

## Verified media

- Duration: approximately 41.37 seconds.
- Resolution: 1920 × 1080 at 30 fps.
- Video/audio: H.264 and AAC.
- All streams decoded successfully. File size and SHA-256 are recorded in `docs/media/demo-manifest.json`.

## Marketplace presentation

The root README contains a prominent **Watch the JSON Edge demo video** link to the public GitHub file page. Push the recording to `main` before publishing the updated VSIX so that the link resolves publicly. The GitHub page provides the hosted video view; inline MP4 playback within the Marketplace or VS Code README is not assumed.

The video is hosted in the repository and excluded from the runtime VSIX by `.vscodeignore`, avoiding an extra video download on every extension installation. Packaging a local video alone does not publish its public link.

Future demo changes should replace this owner-selected video deliberately and update its manifest. Do not regenerate older demo assets. Static documentation screenshots remain separate from the demonstration video.
