# 验证记录

日期：2026-10-28（中国标准时间）。

## 自动验证

`node --test test/*.test.mjs`：10 项通过。

- 初始项目和 13 种预设的数据约束。
- 批量动作原子性、版本递增、非法输入与越界音符拒绝。
- 音符移动、时值、移调、轨道复制时 ID 唯一性与删除。
- WAV RIFF/PCM 头、44.1kHz 双声道、时长、非零 PCM、声像、静音与确定性。
- A4 频率约为 440Hz、高八度约为 880Hz、释音结束接近零。
- 13 预设和六种鼓声均生成有限、非零并可区分的波形。
- MIDI 的 BPM、GM program、鼓通道、note-on/off 配对、摇摆与尾时间。
- 静音/独奏规则与过密音频导出预算限制。
- MCP discover/list/call、版本冲突、无效批次不提交、命令回执、WAV/MIDI 导出。
- 跨来源写入拒绝、畸形 JSON 与请求大小限制。

`npm run build` 和 `npm run validate` 通过。生成的 Worker 为有效 ES 模块，导出 fetch。

## 音色引擎升级（2026-10-28）

把“电子合成味”最重的三处补上：频谱只有 8 阶、亮度不随时间变化、没有起音瞬态与琴体共振。

- 合成器：16 阶泛音、非谐性（弦刚性）、逐阶泛音衰减、时变亮度低通、起音噪声/持续气声、琴体共振峰、揉弦、齐奏失谐、逐预设响度校准；鼓组重写为分层音高/噪声模型。全部沿用同一确定性渲染器，浏览器试听与 WAV 导出共用。
- 校验：`synth.harmonics` 允许 8 或 16 阶；新增字段全部可选、范围校验，旧 8 阶项目可直接加载并按预设默认值渲染。
- UI：泛音条从 8 扩到 16；`music_list_presets` 返回全部参数。
- 自动验证：`node --test test/*.test.mjs` 13 项通过（新增击弦后变暗、弓弦揉弦与单簧管稳定、真实感字段校验与旧项目兼容三项）；`npm run build`、`npm run validate` 通过。
- 客观指标（C4 单音，v1 → v2）：钢琴频谱质心 330→330Hz 变为 484→369Hz（衰减 23.7%），4kHz 以上起音能量比 0.41→21.9；小提琴音高抖动 0.84→10.1 音分（揉弦）；长笛频谱平坦度 0.001→0.13（气声）；弦乐由“越奏越亮 −60%”改为衰减 10.6%；六种管弦音色的响度校准到同一 RMS 附近。
- 对比文件：`音色对比-v1/v2`（示例乐句）、`预设对比-v1/v2`（12 个预设试听）、`屏幕底边的食堂-旧/新音色`（当前项目）。

## 本地真实服务

`scripts/verify-local.mjs` 通过 HTTP MCP 新建测试长笛、批量添加音符、修改声像，读取分析，并导出有效 WAV 与 MIDI 文件。浏览器返回 stop acknowledged。测试后恢复了原项目，保留测试前已有音符。

## 浏览器操作

在 Codex 内置浏览器验证：

- 点击添加音符：钢琴音符从 18 增为 19，服务器自动保存。
- 拖动音符：B5、8 拍 → A♯5、9 拍。
- 拖动右侧：1 拍 → 2 拍。
- 播放按钮变为暂停，位置显示随时间推进；停止、三次撤销恢复上述测试。
- MCP 创建的长笛轨出现在列表，能选中并执行音色试听。
- 窄屏项目菜单可见，音色抽屉可展开；编辑区内部滚动。
- 网页导出窗口实际下载了 WAV 文件，12.1 秒、约 2.13 MB，显示导出成功。
- 上述检查期间浏览器错误日志为空。

## 验证边界

验证了浏览器声音调度状态与导出 PCM 的数值有效性，没有进行外部扬声器录音或真人听感评价。实时设备采样率、归一化开关与不同 MIDI 播放器会影响听到的音量或音色。尚未覆盖全部移动设备、浏览器、最大规模长时间播放、共享访问和多标签同时发声场景。

## 云端部署

已注册所有者私有站点并保留其 project_id。源码上传受 Windows 到源码服务器的 TLS 连接故障阻断（OpenSSL unexpected EOF；Schannel 凭据获取错误），没有确认源码推送或线上部署成功。本地工作台与源码交付不受影响。不要把 hosting 中的站点标识或预期 URL 视为已上线证明。恢复网络后可以继续同一个 Sites 项目，不能重复创建站点。

## 采样音源与桌面应用（2026-10-29）

- 采样：从 Debian 的 `fluid-soundfont-gm 3.1-6` 解包出 FluidR3_GM.sf2（MIT，Frank Wen / Toby Smithe），用 `scripts/sf2.mjs` + `scripts/build-bank.mjs` 抽取 13 个预设需要的 214 个 zone，混成单声道 32 kHz，生成 `assets/fluid-lite.bank`（20 MB，含 JSON 清单与 Int16 PCM）。
- 运行时：`src/sampler.js` 在浏览器与 Node 共用；`audio.js` 的 `voice()` 在采样库存在时走采样，缺失时回退合成；`synth.engine` 可强制 `synth`。云端 Worker 不含采样库，自动回退。
- 桌面：Electron 45 外壳（`app/main.js`）复用本机服务或自行启动 `server.mjs`，项目数据经 `MUSE_GRID_DATA` 指向仓库 `.local`，与网页版、MCP 共用；打包产物 `release-installer\win-unpacked\Music Whale.exe` 与安装包 `release-installer\Music Whale Setup 1.2.0.exe`。启动脚本清除 `ELECTRON_RUN_AS_NODE`，避免 Electron 退化成 Node。
- 验证：`npm test` 15 项通过（新增采样引擎接管/回退/确定性、打包采样库 13 预设加载两项）；`npm run build`、`npm run validate` 通过。Electron 开发窗口与打包 exe 均实际启动，窗口标题、项目数据、`/api/engine`（bank=true）与采样音色加载标记（页面 `data-engine=sample`、toast「已启用 FluidR3 采样音色」）均确认。
- A/B：同一首《红场晨号》合成版与采样版已导出；12 音色对比文件为 `预设对比-v2-新引擎.wav` 与 `预设对比-FluidR3.wav`。
- 边界：采样库为 32 kHz 单声道、单力度层，高频与力度细节弱于完整 SF2；未做真人听感评价；打包体积约 250 MB（Electron 运行时占主要部分）。

## 品牌与界面（Music Whale 鲸歌，2026-10-29）

- 项目更名为 Music Whale（中文「鲸歌」）：窗口标题、品牌区、页脚、安装包、图标、README 与 MCP HELP 文案统一。
- 界面改为 DeepSeek 鲸鱼蓝：`--bg #0A1020`、`--panel #111B30`、强调色 `#4D6BFE`，深蓝径向渐变背景，品牌图标换成鲸鱼 SVG，应用图标为深蓝底蓝鲸。
- 内置预设扩展到 19 个（含 18 个采样预设），新增「自定义音色」与可保存的「我的音色」：采样预设收起波形编辑器并提示由录音决定；自定义音色可调波形/泛音/包络并保存，`music_list_instruments` / `music_save_instrument` / `music_delete_instrument` 三个 MCP 工具同步开放，REST 为 `/api/instruments`。
- 验证：`npm test` 17 项通过；`npm run build`、`npm run validate` 通过；安装包与 win-unpacked 应用重新构建。

## 后续推进（2026-10-29，Music Whale 1.2.0）

- MCP 命名空间迁移：DSH 配置改为 `serverName: music-whale`，桥接移到 `~/.dsh/mcp/music-whale/stdio.mjs`，工具名变为 `mcp__music-whale__*`；`/api/engine` 报告 23 个采样预设。
- 预设扩充到 24 个：新增原声吉他（GM 25）、管风琴（19）、马林巴（12）、萨克斯（65）、巴松（70），新设「弹拨」分组并归入竖琴；采样库重建为 41 MB / 581 zone / 23 采样预设。
- 更新检查：菜单「帮助 → 检查更新…」，支持 `MUSIC_WHALE_UPDATE_URL` 或本地 `update.json` 清单；启动时静默检查；发布流程见 docs/UPDATE.md。
- 验证：`npm test` 17 项通过，`npm run build`、`npm run validate` 通过；安装包 `release-installer/Music Whale Setup 1.2.0.exe` 重新构建。
