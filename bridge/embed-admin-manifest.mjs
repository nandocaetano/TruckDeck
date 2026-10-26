// Embeds a requireAdministrator manifest into the packaged bridge executable.
//
// Why a separate ESM script instead of the previous `node -e "require('rcedit')..."`:
// rcedit 5.x is a pure ES module ("type": "module"), so require() throws ERR_REQUIRE_ESM
// and the manifest step silently never ran -- every build from rc5 to rc7 shipped with
// the default asInvoker level, which lets Windows UIPI drop SendInput when the game
// runs elevated.
//
// 'requested-execution-level' is used rather than 'application-manifest' because it is a
// single documented option and needs no separate XML file kept in sync.

import { rcedit } from 'rcedit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const exe = path.resolve(here, '..', 'dist', 'TruckDeckBridge.exe');

if (!existsSync(exe)) {
  console.error('Executable not found: ' + exe);
  process.exit(1);
}

await rcedit(exe, { 'requested-execution-level': 'requireAdministrator' });
console.log('Embedded requireAdministrator manifest into ' + exe);
