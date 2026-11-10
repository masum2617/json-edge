# Demo assets and storyboard

The README uses a short looping GIF because it can be embedded as an image. A normal MP4 link provides a sharper video/download alternative. Inline Marketplace video playback is not assumed. Verify the actual listing after upload. See [Microsoft-source notes](MARKETPLACE-NOTES.md).

## Assets

- `docs/media/json-twist-demo.gif`: looping, silent README demonstration.
- `docs/media/json-twist-demo.mp4`: H.264/yuv420p companion video.
- `docs/media/demo-manifest.json`: actual frame count, duration, version and output sizes.
- `docs/images/marketplace-editor.png`: one-click Activity Bar opening beside a source JSON document.
- `docs/images/marketplace-input.png`: input JSON and selected field/variations.
- `docs/images/marketplace-preview.png`: virtual file list, explanation and JSON preview.
- `docs/images/marketplace-snippets.png`: converted profile properties and optional dummy values.

These are real captures of the installed extension in a temporary VS Code profile, not AI mockups. All inputs are synthetic names/emails/profile values. Breadcrumbs are hidden to avoid exposing temporary paths. No real project is opened.

## Short storyboard

1. Show a valid profile JSON example and available variations.
2. Select `/email`.
3. Generate four virtual JSON files.
4. Preview missing, null, empty and wrong-type results.
5. Select the null case, copy JSON, and show copy feedback.

Recording holds are intentional human viewing time, not test synchronization or a performance benchmark. The verified final Copied state is held for roughly two seconds after pausing continuous capture around the native clipboard handoff; every displayed UI state is from the real app. The GIF loops without narration. The README supplies a text workflow and meaningful alt text; the video is supplementary.

## Reproduce

Build the VSIX, set `VSCODE_EXECUTABLE_PATH` and `FFMPEG_PATH`, then run `npm run demo:record`. The current recorder uses macOS shortcuts for the optional real-editor setup; runtime extension users do not need FFmpeg or recording dependencies. Inspect the first, middle and final frames before release, check GIF duration/size, and verify that the preview/copy data matches the selected file.
