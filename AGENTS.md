# TruckDeck agent rules

- `public/` is the only editable frontend source. Never edit `dist/public/` or `android/app/src/main/assets/` by hand.
- Run the development server from the repository root with `node bridge/server.js`. It serves `public/` and reads/writes `data/`. `dist/` is release output only and is populated by `tools/sync-dist.js`.
- Never write to `data/` or `dist/data/` unless the task explicitly names the file. `dist/data/atomic-layout.json` contains the only copy of the mapped `sov_white` board; never overwrite, move, or delete it.
- Never delete, rename, or overwrite a file unless an explicit instruction names it. Never use `robocopy /MIR`, `robocopy /PURGE`, `rm -r`, `del /s`, `git clean`, `git reset --hard`, or `git checkout --` on files.
- Before editing any existing file, copy it next to the original as `<file>.pre-<task>.bak`.
- Edit in place with minimal diffs. Never replace a file with an older copy or a snapshot from another location or session.
- After editing, report the SHA-256 hash of every changed file.
- Never fake execution. If a command was not actually run, say so.
- If a path or instruction is ambiguous, stop and ask.
- Memory system: read docs/agents/README.md at the start of every session, in the order it lists. Treat only [VERIFIED] facts in docs/agents/STATE.md as true. Never edit docs/agents/ (append to your own task's Report only).
- Long-term memory (the Obsidian vault, E:\Truck deck) is outside the repo and operational agents do NOT access it. Any background you need is pasted in your task file's Context section; if it is missing, STOP and ask. Never read or write the vault.
- Search with exclusions for *.bak*, *.pre-* and "app - Copia.js"; never read app.js, app.css or editor.js whole (grep -n, then at most 200 lines).
