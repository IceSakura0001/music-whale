// Launch the Electron desktop app.
//
// The harness that may run this script exports ELECTRON_RUN_AS_NODE=1, which
// would turn electron.exe into a plain Node process and hide the `electron`
// module. The launcher therefore strips that variable before spawning the
// real Electron binary resolved from node_modules.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const electron = require('electron');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_NO_ATTACH_CONSOLE;

const child = spawn(electron, [resolve(root, 'app/main.js'), ...process.argv.slice(2)], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: false,
});
child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
