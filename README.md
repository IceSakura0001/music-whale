# Music Whale · 鲸歌（桌面音乐工作台）

用点击和拖动编曲的音乐制作应用。现在有两条运行方式：**桌面应用**（Electron 窗口，内置 FluidR3 GM 采样音源，推荐）和原来的浏览器版（Node.js 22+ 本地服务 + 网页，仍可用于 MCP 与云端部署）。

## 启动

> 仓库：<https://github.com/IceSakura0001/music-whale> · 下载：<https://github.com/IceSakura0001/music-whale/releases/tag/v1.2.0>

**桌面应用（推荐）**：双击 `启动音乐工作台（应用）.cmd`，或直接运行 `release-installer\win-unpacked\Music Whale.exe`。第一次需要 `npm install` 安装 Electron（约 100 MB）；之后双击桌面快捷方式即可。应用会复用已在运行的本机服务，没有的话自己启动一个；项目、采样库、MCP 与网页版共用同一个 `.local` 数据目录。

**浏览器版**：在此目录运行 `npm run dev`，打开 http://127.0.0.1:4317 。Windows 也可双击 `启动音乐工作台.cmd`，服务在后台运行；`停止音乐工作台.cmd` 可关闭。首次启动载入原创四轨示例；项目状态自动写入 `.local/current.json`，不要删除，除非已导出备份。

## 自定义音色（声音设计）

采样预设的波形由录音决定，因此界面会收起波形/泛音编辑器；要自己设计音色，在音色下拉框选「＋ 新建自定义音色」，或点「添加乐器 → 新建自定义音色」。自定义音色使用合成引擎，可调整波形、16 阶泛音、ADSR、亮度、失谐等参数，并通过「保存为我的音色」存进「我的音色」组（最多 50 个）。保存后的音色在任何项目里都能选用；音轨本身也保存一份参数快照，删掉音色库条目不会破坏已有作品。

## 从源码运行与发布

```text
npm install            # Electron 桌面依赖（约 100 MB，走 npmmirror 时设置 ELECTRON_MIRROR）
npm run dev            # 本地服务 + 浏览器版（零运行时依赖）
npm run app            # 桌面窗口（开发方式）
npm run app:build      # NSIS 安装包 → release-installer/
npm test               # 17 项自动测试
```

发布到 GitHub 使用 `scripts/publish-github.ps1`（需要 repo scope 的 GitHub token）：

```text
powershell -ExecutionPolicy Bypass -File scripts/publish-github.ps1 -Repo owner/music-whale -Token $env:GITHUB_TOKEN
```

脚本会创建/更新仓库、推送源码与 MCP 工具、创建 `v<version>` Release，并把 Windows 安装包和 `update.json` 上传为 Release 资产（安装包超过 100 MB，不适合直接进仓库）。

## 更新与发布

安装包由 electron-builder 生成；版本更新使用 `update.json` 清单（菜单「帮助 → 检查更新…」）。发布流程见 [docs/UPDATE.md](docs/UPDATE.md)。

## 采样音源（FluidR3 GM）

- 音色来自 [FluidR3 GM](https://github.com/sgossner/VSCO-2-CE) 的 MIT 许可采样（Copyright 2000-2002, 2008 Frank Wen；2008 Toby Smithe）。应用**不携带原始 SoundFont**，只携带从它抽取的紧凑采样库 `assets/fluid-lite.bank`（约 41 MB，23 个音色、581 个 zone、44.1 kHz 单声道、两层力度）。
- 采样库存在时，所有预设自动使用采样音色；没有采样库（例如云端 Worker 部署）时自动回退内置合成引擎，功能不受影响。单条音轨可以用 `synth.engine = 'synth'` 强制使用合成音色。
- 采样库由 `npm run bank` 生成，需要本机有 `FluidR3_GM.sf2`（默认路径 `%TEMP%\sf2\FluidR3_GM.sf2`，也可用参数或 `FLUIDR3_SF2` 指定）。构建产物不进 git；重新分发请保留上面的 MIT 署名。


## 已实现

- 钢琴卷帘：单击添加；拖动移动和改变音高；拖动右侧调整时值；按住空白拖动绘制；右键或橡皮删除。
- Shift 点击多选，Alt 拖动复制，方向键移动，Shift+上下移动八度；Ctrl/Cmd+A 全选、C/V 复制粘贴、Z 撤销、Shift+Z 重做、S 保存项目。
- 最多 16 轨，内置 24 种预设（键盘/管弦/弹拨/合成/节奏分组：钢琴、电钢琴、管风琴、马林巴、竖琴、原声吉他、弦乐、小提琴、大提琴、长笛、单簧管、双簧管、巴松、萨克斯、圆号、小号、长号、合唱人声、贝斯、铺底、拨弦、主音、鼓组、自定义音色）。
- 六行鼓机（底鼓、军鼓、闭镲、开镲、拍手、通鼓），音轨音量、声像、静音、独奏与复制。
- 自定义正弦、三角、锯齿、方波或 16 阶泛音；起音/衰减/延音/释音、亮度、失谐，以及泛音衰减、非谐性、起音噪声、气声、琴体共振、揉弦与齐奏失谐。
- 桌面窗口（Electron）：钢琴卷帘、鼓机、播放、导出、MCP 与本机服务都在一个应用里；采样库可用时自动用 FluidR3 GM 真采样，缺失时回退合成音源。安装包 `release-installer\Music Whale Setup 1.2.0.exe` 由 electron-builder 生成（NSIS，带鲸鱼图标；无代码签名）。
- 自定义音色库：保存自己的合成音色到「我的音色」，可在任意项目里复用；采样预设自动收起波形编辑器，避免改不动的困惑。
- 40–240 BPM、TAP 定速、1–16 小节、4/4 拍、循环、摇摆、试听节拍器、时间尺跳转、时间轴缩放。
- 空间效果与总音量；浏览器合奏、单个音符试听；WAV、MIDI、可继续编辑的 JSON 项目导入导出。
- 服务器自动保存、浏览器恢复副本、最多 60 步本次会话撤销。其他窗口或 agent 编辑后撤销栈清空，防止覆盖外部更改。
- MCP HTTP、MCP stdio、同源 REST 与 `window.museGrid`，统一验证、批量事务和乐观并发版本。

## 声音与限制

声音分两层。默认使用 **FluidR3 GM 采样音色**：23 个内置预设映射到 GM program，采样库 `assets/fluid-lite.bank` 由 MIT 许可的 FluidR3 GM 抽取而来，只保留需要的 zone、混成单声道 32 kHz，播放时做变速重采样、循环、包络和声像处理。采样库缺失时回退**合成引擎**：16 阶带限泛音堆叠，泛音幅度、非谐性与共振峰参考了公开的乐器声学研究与 CC0 授权采样库（VSCO 2 Community Edition 等）的频谱特征，写成合成参数而非样本；声音再由音量包络、时变低通（亮度包络）、逐阶泛音独立衰减、起音噪声/气声、琴体共振、揉弦与齐奏失谐共同构成。鼓组使用分层噪声与音高/振幅包络。44.1kHz WAV 为双声道 16 位 PCM，包含 3.5 秒尾部。实时播放使用浏览器设备采样率；与导出共用单音渲染、声像、混音及空间参数。默认 WAV 归一化会改变响度，可在导出窗口关闭。过载软削波用于混音保护。

MIDI 文件包含 BPM、4/4 拍、力度、GM 音色与混音控制，鼓走第 10 通道。标准 MIDI 支持最多 15 个独立旋律通道；16 轨均为旋律时需静音一轨或导出 WAV。自定义波形与空间效果不能保存在标准 MIDI 中；它们保存在项目文件和 WAV 中。节拍器只用于试听。

项目最多 2048 音符，一批最多 512 操作。WAV 合成密度上限 2200 万单音采样点；超限会明确提示，可缩短乐曲或按音轨导出。当前一个实例编辑一个活动项目，多首曲目通过项目文件切换。不是 VST/AU 插件，不包含录音、外部音频、MP3、采样器、任意拍号、自动化曲线或实时多人光标。浏览器后台节流可能影响实时播放；导出音频不依赖播放时钟。

## Agent 与 MCP

完整接口、示例和接入方式见 [docs/AGENT_API.md](docs/AGENT_API.md)。开发约定见 [AGENTS.md](AGENTS.md)，计划与分阶段边界见 [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)。

本地 MCP：先运行网页服务，再启动 `node mcp-stdio.mjs`。HTTP MCP 地址为 `http://127.0.0.1:4317/mcp`。云端应使用 Sites 自动创建的私有插件连接，不需要单独保存站点凭据。浏览器与 MCP 使用相同项目，但本机和云端是两个独立实例。

## 检查与构建

```text
npm test
npm run build
npm run validate
npm run bank      # 从本机 FluidR3_GM.sf2 重新生成 assets/fluid-lite.bank
npm run app       # 以开发方式启动桌面窗口（需先 npm install）
```

构建生成单文件 Worker `dist/server/index.js`（包含网页资源）以及 `dist/.openai/hosting.json`。Worker 不包含采样库，云端会自动使用合成引擎。桌面版由 Electron 打包：`release-installer\win-unpacked\Music Whale.exe`；重新打包使用 `npx electron-packager . "Music Whale" --platform=win32 --arch=x64 --electron-version=45.1.0 --out=release --overwrite --ignore="^/node_modules$" --ignore="^/release$" --ignore="^/test$" --ignore="^/docs$" --ignore="^/dist$"`。`worker/handler.js` 是 Worker 入口；不要手动修改生成的 dist。

## 存储与访问边界

本地只监听 127.0.0.1，检查 Host 与写请求 Origin。云端依赖 Sites 的所有者私有访问边界，项目位于 R2 的 `studio/current.json`，使用 ETag 条件写入；导出在 `exports/`。这是私有、单工作台模式，不按访问用户分隔数据。若未来开放公开或共享访问，必须先增加写权限与用户/项目隔离，不可仅修改公开开关。历史导出目前保留在本机或 R2，未启用自动清理。

项目和音色只保存在你的实例中，不调用 AI 或第三方音源 API。可选 Google Fonts 仅改善西文字体，加载失败时使用系统字体。

## 技术参考

- [Web Audio AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode)
- [Web Audio StereoPannerNode](https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode)
- [MCP 官方协议与 SDK](https://modelcontextprotocol.io/)

源代码采用 MIT 许可证，见 LICENSE。预制示例乐句由本项目生成，不含外部音乐素材。
