# Music Whale（鲸歌）agent 开发约定

- 前端、MCP、HTTP 共用 `src/core.js` 的验证/事务。不要新增绕过版本检查的写入口。
- 所有时间为四分音符拍、从 0 开始；音高为 MIDI 整数。schemaVersion 变更须提供迁移，不可静默丢弃旧项目。
- 不要提交 `.local`、导出音频、临时凭据、浏览器备份或 dist 生成物。保留 `.openai/hosting.json` 的真实 project_id 和私有访问边界。
- 云端是所有者私有、单活动项目。公开或共享之前必须实现写权限与数据隔离。
- 音色预设必须标注合成近似，避免声称是采样钢琴/真实管弦音源；桌面版的 FluidR3 GM 采样是真实录音，必须保留 MIT 署名（Frank Wen / Toby Smithe），且不得把原始 SoundFont 提交进仓库。
- 声音变化应同时验证试听和 WAV 单音渲染。播放命令 queued 不等于已执行；acknowledged 不等于扬声器可闻。
- 音源渲染必须确定性：渲染路径不得使用 `Math.random`（按音符哈希取伪随机），保证同一项目导出字节一致。新增 synth 字段须向后兼容（省略时回退预设默认值）、在 core.js 校验范围，并同步 service.js TOOLS Schema、docs/AGENT_API.md 与 README。
- 自定义音色约定：音色库保存在项目数据的 `instruments` 数组（与项目同文件），preset 形如 `custom:<id>`；轨道保留 synth 快照；`track.add` 可带 synth。采样预设不响应波形编辑，UI 应把它们的设计面板收起。
- 采样引擎约定：`src/sampler.js` 在浏览器与 Node 中通用；采样库缺失时必须回退合成引擎（`voice()` 的 engine 分支），云端 Worker 不携带采样库。`synth.engine` 为 `auto`（默认）/`synth`。重新生成采样库用 `npm run bank`，产物 `assets/fluid-lite.bank` 不进 git。
- 桌面外壳在 `app/main.js`：复用已在运行的本机服务，否则用 `ELECTRON_RUN_AS_NODE` 启动 `server.mjs`；项目数据目录优先 `MUSE_GRID_DATA`。启动脚本 `scripts/launch-app.mjs` 会清除 `ELECTRON_RUN_AS_NODE`，否则 Electron 会退化成 Node。打包命令见 README。
- 新的动作应更新 TOOLS 输入 Schema、HTTP 帮助和 docs/AGENT_API.md。
- 改动后运行 `npm test`、`npm run build`、`npm run validate`；交互改动用真实浏览器验证对应路径。
- 源码入口：core.js（模型）、audio.js（DSP）、sampler.js（采样库）、service.js（API/MCP）、web/app.js（UI/播放）、worker/handler.js（云端存储）、server.mjs（本机服务）、app/main.js（桌面外壳）、scripts/build-bank.mjs（采样库构建）。
- 不要求或授权额外 sub-agent。常规工作直接在此项目完成。
- 不要求或授权额外 sub-agent。常规工作直接在此项目完成。
