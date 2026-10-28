// Music Whale (鲸歌) desktop shell: starts the local music workbench service when it is
// not already running, then opens it in a native window. The web page inside is
// the same UI as before; the sampled FluidR3 engine loads from assets/ when the
// service finds the bank, and falls back to the synth engine without it.
import electron from 'electron';
const { app, BrowserWindow, Menu, dialog, shell } = electron;
import { spawn } from 'node:child_process';
import { existsSync, createWriteStream, readFileSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { Readable } from 'node:stream';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const port = Number(process.env.MUSE_GRID_PORT || 4317);
const base = `http://127.0.0.1:${port}`;
let serverChild = null;

// Project data lives in MUSE_GRID_DATA when the launcher points at an existing
// workbench (so the desktop app, the dev server and MCP share one project).
// A packaged app without that variable keeps data in the Electron userData dir.
function resolveDataDir() {
  if (process.env.MUSE_GRID_DATA) return resolve(process.env.MUSE_GRID_DATA);
  if (app.isPackaged) return resolve(app.getPath('userData'), 'workbench');
  return resolve(root, '.local');
}
const dataDir = resolveDataDir();

async function healthy() {
  try {
    const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(600) });
    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/** Reuse a running workbench, otherwise start server.mjs beside the app. */
async function ensureServer() {
  if (await healthy()) return false;
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(port), MUSE_GRID_DATA: dataDir };
  serverChild = spawn(process.execPath, [resolve(root, 'server.mjs')], {
    cwd: root,
    env,
    stdio: 'ignore',
    windowsHide: true,
  });
  serverChild.on('exit', () => { serverChild = null; });
  for (let attempt = 0; attempt < 100; attempt++) {
    await delay(200);
    if (await healthy()) return true;
  }
  throw new Error('音乐工作台服务启动超时。请检查端口 4317 是否被占用。');
}

const updateManifestUrl = process.env.MUSIC_WHALE_UPDATE_URL || resolve(root, 'update.json');
function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}
/** Read the update manifest (URL or local update.json) and describe the result. */
async function fetchUpdateManifest() {
  if (/^https?:/i.test(updateManifestUrl)) {
    const response = await fetch(updateManifestUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('更新源返回 HTTP ' + response.status);
    return await response.json();
  }
  if (!existsSync(updateManifestUrl)) return null;
  return JSON.parse(readFileSync(updateManifestUrl, 'utf8'));
}
async function checkForUpdates(win, { silent = false } = {}) {
  let manifest;
  try {
    manifest = await fetchUpdateManifest();
  } catch (error) {
    if (!silent) dialog.showMessageBox(win, { type: 'error', title: '检查更新', message: '无法读取更新信息', detail: String(error.message) });
    return;
  }
  if (manifest === null) {
    if (!silent) dialog.showMessageBox(win, {
      type: 'info', title: '检查更新',
      message: '还没有配置更新源',
      detail: '设置环境变量 MUSIC_WHALE_UPDATE_URL，或在应用目录放置 update.json（包含 version / url / notes）。安装包和格式说明见 docs/UPDATE.md。',
    });
    return;
  }
  if (compareVersions(manifest.version, app.getVersion()) <= 0) {
    if (!silent) dialog.showMessageBox(win, { type: 'info', title: '检查更新', message: '已经是最新版本', detail: '当前版本 ' + app.getVersion() });
    return;
  }
  const result = await dialog.showMessageBox(win, {
    type: 'info', title: '发现新版本',
    message: 'Music Whale ' + manifest.version + ' 可用',
    detail: (manifest.notes ? manifest.notes + '\n\n' : '') + '当前版本 ' + app.getVersion(),
    buttons: ['下载安装包', '稍后'], defaultId: 0, cancelId: 1,
  });
  if (result.response !== 0 || !manifest.url) return;
  // Download the installer next to the temp directory, then launch it. This is
  // the "auto download" half of the updater; the user still confirms the NSIS
  // installer itself.
  const target = resolve(app.getPath('temp'), 'Music Whale Setup ' + manifest.version + '.exe');
  try {
    const response = await fetch(manifest.url, { signal: AbortSignal.timeout(180000) });
    if (!response.ok || !response.body) throw new Error('下载失败 HTTP ' + response.status);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
    const launch = await dialog.showMessageBox(win, {
      type: 'info', title: '下载完成',
      message: '安装包已下载',
      detail: target,
      buttons: ['运行安装程序', '稍后'], defaultId: 0, cancelId: 1,
    });
    if (launch.response === 0) shell.openPath(target);
  } catch (error) {
    dialog.showMessageBox(win, { type: 'error', title: '更新下载失败', message: String(error.message) });
  }
}

function buildMenu(win) {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '重新载入', accelerator: 'CmdOrCtrl+R', click: () => win.reload() },
        { type: 'separator' },
        { label: '退出', role: 'quit' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '开发者工具', accelerator: 'F12', click: () => win.webContents.toggleDevTools() },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '检查更新…', click: () => checkForUpdates(win) },
        { label: '数据目录', click: () => shell.openPath(resolve(root, '.local')) },
        { label: '关于采样音源', click: () => dialog.showMessageBox(win, {
          type: 'info',
          title: '采样音源',
          message: 'FluidR3 GM · MIT 许可',
          detail: 'Copyright 2000-2002, 2008 Frank Wen; 2008 Toby Smithe。应用只携带抽取后的紧凑采样库，不含原始 SoundFont。没有采样库时自动回退到内置合成引擎。',
        }) },
        { label: '关于 Music Whale', click: () => dialog.showMessageBox(win, {
          type: 'info',
          title: 'Music Whale 鲸歌',
          message: 'Music Whale 鲸歌 · 桌面版',
          detail: '钢琴卷帘、鼓机、23 个 FluidR3 采样预设、可保存的自定义音色、WAV/MIDI/项目导出，以及本机 MCP 接口。',
        }) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  try {
    await ensureServer();
  } catch (error) {
    dialog.showErrorBox('Music Whale 启动失败', error.message);
    app.quit();
    return;
  }
  const bank = existsSync(resolve(root, 'assets/fluid-lite.bank'));
  const win = new BrowserWindow({
    width: 1460,
    height: 940,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0A1020',
    title: bank ? 'Music Whale 鲸歌（采样音色）' : 'Music Whale 鲸歌',
    autoHideMenuBar: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  buildMenu(win);
  win.loadURL(base);
  win.webContents.once('did-finish-load', () => { void checkForUpdates(win, { silent: process.env.MUSIC_WHALE_AUTO_UPDATE !== '1' }); });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverChild) serverChild.kill();
  app.quit();
});

app.on('before-quit', () => {
  if (serverChild) serverChild.kill();
});
