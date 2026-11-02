# Changelog

All notable changes to TruckDeck are recorded here. The current release candidate targets Android `1.0.0-rc7` (`versionCode 9`) and Bridge `1.0.0`.

## [1.0.0-rc7] - 2026-10-29

### Added

- First-run setup screen on the packaged client.
- The app menu shows the bridge download address so a player can reach the Windows package from the tablet.

### Changed

- The Windows Bridge launcher self-elevates: a `requireAdministrator` manifest is embedded into the executable after `pkg`.
- Modern keeps its ignition hold; `start-debug` runs elevated.
- Android package advanced to `versionCode 9` / `1.0.0-rc7`.

### Removed

- Unused Modern (`mine`) layout.
- Video loading screen in `index.html` and `body.html`.

### Fixed

- The bridge download link points at the `.zip` package.
- Ignition loop, editor PIN, overlapping corner buttons, and a media leak on the runtime panel.
- `lightsOn` and `retarderOn` are derived locally; the bridge never sent them.
- OBD poster and control suppression now also apply to the shutdown clip.
- Launcher icon rebuilt so the artwork respects the adaptive-icon safe zone.

### Required before release tag

- Publish the Windows Bridge ZIP as a GitHub Release asset with SHA-256 checksums and Windows setup instructions, then link it from the Play Store listing, project download page, and Android app help/menu.
- Restore the Play Store screenshot set (phone and tablet); `store/` currently ships only the icon and feature graphic.
- Write and approve the Play Store listing copy (app title, short description, full description).
- Director sign-off on the Modern (`eu_frame`) and Soviet (`sov_frame`) base panels per `PRODUCTION_WORKFLOW.md` Fase 4.

## [1.0.0-rc6] - 2026-10-25

### Changed

- Editable `Mine` panels can again be deleted from the packaged app; built-in and legacy panels remain protected.
- Runtime key labels use the assigned function name in the active language and default below the physical key.
- Night pictograms use a shape-clipped luminous core plus a softer halo instead of a flat colour.
- Modern OBD startup and shutdown use the same approved animation asset.

### Required before release tag

- Publish the Windows Bridge ZIP as a GitHub Release asset and link it from the Play Store listing, project download page, and Android app help/menu.
- Include concise Windows setup instructions and SHA-256 checksums in the GitHub Release.

## [1.0.0-rc5] - 2026-10-25

### Added

- Atomic editor catalog with categorized Modern and Soviet controls, searchable function groups, and Coach & passengers mappings.
- Independent housing/key rendering for segmented round, rocker, and push-button assets in both the editor and the runtime panel.
- Modern American control set: five black rocker variants, triangular hazard push, chrome parking-brake push, and passive triangular hazard indicator.
- Device-local pictogram backlight preferences for colour, opacity, and halo strength.
- Local Oswald and Roboto Condensed font loading for offline operation.
- Mad Frog branding asset and compact header logo.
- Five-second Mad Frog video loading screen with muted autoplay, reduced-motion bypass, and a hard five-second removal cap.
- Safe `tools/sync-dist.js` dry-run/apply workflow with drift guard, backup, exclusions, SHA-256 verification, and build manifest.
- `AGENTS.md` repository safety rules.
- Integrated light cycle (`off → parking → low → high → off`) and integrated wiper cycle (`off → intermittent → normal → fast → off`).
- Word-style editor menus with current/all-panel downloads, import, save/publish, copy/paste all keys, delete keys, and full clear actions.
- Device-local hazard pictogram colour preference, defaulting to red.

### Changed

- Modern and Soviet light/wiper rotary artwork, masks, detents, pictograms, and runtime stage handling.
- Ignition controls and Truck power workflow, including staged visual feedback.
- Editor palette scrolling, inspector controls, button/pictogram size-copy actions, layer controls, and canvas key-layer rendering.
- Button physics so static housings remain fixed while only their key/core moves.
- Header now displays the official Mad Frog logo.
- Distribution synchronized from `public/` with a verified build manifest and zero remaining drift.
- Cache-buster advanced to `2026-10-24 01:13`.
- All ignition-button assets now use the recommended Truck power sequence; separate engine/electrics entries remain internal compatibility commands.
- Release editor blocks local image uploads; production assets are installed from the project directories.
- Cache-buster advanced to `2026-10-25 00:30`.

### Fixed

- Missing rocker and round key layers on placed editor-canvas items.
- Square glow artifacts caused by filters applied to complete photo bounds.
- Pictogram colour/glow behavior and offline font fallback.
- Hazard behavior: mechanical latch remains engaged while the button backlight and passive telltales follow the flasher phase.
- Modern parking-brake segmentation, hazard backlight, and bipart rocker orientation.
- Modern assets rendering outside the panel package where they were originally introduced.
- Android startup no longer stacks the obsolete bundled splash before the bridge loading video.
- Android package advanced to `versionCode 3` so devices reliably replace the previous native shell.
- Android launcher and mandatory system splash now use the official Truck Deck Heavy Sim Controller artwork (`versionCode 5`).
- Physical left/right indicator keys remain mechanically steady while only OBD telltales flash with turn signals or hazard.
- Hazard pictograms keep a red vector-only night halo without restoring the former square glow artifact.
- Loading video starts on a black poster and hides native media controls to prevent the one-frame media-player icon leak.
- Android package advanced to `versionCode 6` and retained the RC4 signing certificate for in-place tablet upgrades.

### Removed or retired

- Orphan source files `public/panel.html` and `public/ETS2Bridge.js`.
- Retired duplicate/temporary button entries and temporary Military 1 placements.
- Root-level QA screenshots, patch scripts, backups, and logs were moved into `_work/` folders.

### Required before release tag

- Run a final bridge/tablet smoke test for connection, mapping, rotary stages, ignition, hazard flashing, editor persistence, and reload behavior.
- Build and sign the final Bridge executable and Android APK/AAB, then increment Android `versionCode` for each store upload.
- Review and stage the intended Git deletions, modifications, and new production assets; do not commit `_work/`, backups, or raw source-art folders.
