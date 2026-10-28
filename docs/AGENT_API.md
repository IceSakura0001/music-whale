# Agent 接口

所有工具操作同一个活动项目。读项目 → 取 revision → 批量写 → 处理冲突。不要把 queued 当作已发声。

## MCP 接入

云端：使用部署站点自动生成的个人插件。支持 `server/discover`（2026-07-28）、`tools/list`、`tools/call`，兼容旧版 `initialize`（2025-11-25）、`ping` 与初始化通知。Stateless Streamable HTTP，端点 `/mcp`，POST JSON-RPC，响应 `application/json`；不提供 SSE 会话或订阅。

本地：先启动 `npm run dev`，使用本包 `mcp-stdio.mjs`。客户端配置示例（路径替换成解压后的绝对路径）：

```json
{
  "mcpServers": {
    "muse-grid": {
      "command": "node",
      "args": ["D:/Document/ChatGPT/muse-grid/mcp-stdio.mjs"],
      "env": {"MUSE_GRID_URL": "http://127.0.0.1:4317"}
    }
  }
}
```

stdio 适配器不自动启动网页服务。stdout 只输出 JSON-RPC，诊断到 stderr。不要将云端令牌写入客户端代码；云端通过 Sites 插件认证连接。

## 工具

| 名称 | 用途 |
|---|---|
| music_get_project | 返回 project 与最近 5 个播放命令 |
| music_list_presets | 返回 19 个内置预设（含分组）、默认参数、鼓组映射 |
| music_list_instruments | 返回「我的音色」里保存的自定义音色 |
| music_save_instrument | 保存/更新自定义音色（name + synth，可选 id） |
| music_delete_instrument | 删除自定义音色（音轨保留快照） |
| music_edit | expectedRevision + actions，事务编辑并返回 project、created IDs |
| music_transport | action=play/pause/stop/preview，可带 trackId、pitch |
| music_get_command | 根据 id 读取 queued / acknowledged / error |
| music_export | format=wav/midi，可带 normalize、trackId；返回受同站点访问保护的下载路径 |
| music_get_help | 参数单位、限制、示例与能力说明 |
| music_analyze_project | 音符数、时长、各轨音域和渲染预算 |

工具的 JSON Schema 由 `src/service.js` 的 `TOOLS` 定义，并由 `tools/list` 暴露。工具失败返回 `isError: true`。HTTP 编辑失败返回 400，版本冲突返回 409。重新读取后，应重新生成基于最新版本的改动，不要盲目覆盖。

## 时间与音高

- start、duration 的单位为四分音符拍，从 0 开始。4/4 下第 2 小节从 4 开始。
- pitch 为 MIDI 0–127，60=C4，69=A4=440Hz。
- duration 最短 1/64 全音符（0.0625 个四分音符拍）；必须完全落在 1–16 小节范围内。
- velocity 0.01–1；volume/master 0–1；pan −1 左到 +1 右。
- swing 0–0.45，推迟每个奇数八分拍，延迟为 swing/2 拍；音符时值不改变。
- 鼓组：36 底鼓，38 军鼓，42 闭镲，46 开镲，39 拍手，45 通鼓。使用这些音高才能显示在六行鼓机中。其他鼓音高采用通鼓合成后备音色，MIDI 仍保留原音高。

## 批量示例

```json
{
  "expectedRevision": 0,
  "actions": [
    {"type":"project.set","bpm":100,"name":"长笛与钢琴"},
    {"type":"track.add","id":"flute-01","preset":"flute","name":"长笛"},
    {"type":"notes.add","trackId":"flute-01","notes":[
      {"pitch":72,"start":0,"duration":1,"velocity":0.7},
      {"pitch":76,"start":1,"duration":0.5,"velocity":0.65},
      {"pitch":79,"start":1.5,"duration":1.5,"velocity":0.8}
    ]},
    {"type":"track.set","trackId":"flute-01","pan":0.2,"volume":0.6}
  ]
}
```

实际 expectedRevision 必须使用刚读到的版本，示例的 0 不是固定值。track.add 省略 id 时生成 UUID，可从 created 返回值获得；跨请求使用真实返回 ID。

支持操作：`project.set`、`project.replace`、`track.add`、`track.set`、`track.remove`、`track.duplicate`、`notes.add`、`notes.update`、`notes.remove`、`notes.clear`、`notes.transpose`。删除最后一轨会被拒绝；使用 project.replace 可以原子替换成一个合法空白项目。缩短小节前须同批删除/截短超范围音符，否则整批失败。

```json
{"type":"track.set","trackId":"synth-id","synth":{"wave":"custom","harmonics":[1,0.3,0.2,0,0.1,0,0,0],"attack":0.02,"decay":0.5,"sustain":0.4,"release":0.3,"cutoff":4500,"detune":7}}
```

切换 preset 会重置 synth 为该预设默认参数，可在同一个 track.set 附加 synth 覆盖。wave 可为 sine/triangle/sawtooth/square/custom。harmonics 为 8 或 16 个 0–1 系数；attack 0.002–2，decay 0.01–3，sustain 0–1，release 0.02–3，cutoff 100–20000Hz，detune 0–30 音分。以下真实感参数均可选、省略即用预设默认值：bright 0–1（亮度包络）、damp 0–18（高阶泛音衰减）、inharmonic 0–0.002（非谐性）、noise 0–1 与 noiseDecay 2–400、noiseTone 100–16000（起音瞬态）、breath 0–1（持续气声）、formant 0–8000 与 formantGain 0–4（琴体共振）、vibrato 0–80 音分与 vibratoRate 1–9Hz、vibratoDelay 0–3s（揉弦）、unison 0–40 音分（齐奏失谐）、level 0.05–4（预设响度校准）。`music_list_presets` 返回全部参数。旧的 8 阶泛音项目保持可加载，省略的新参数按当前预设默认值渲染。engine 为 auto（默认，有采样库时用 FluidR3 采样）、synth（强制合成）或 sample（只接受采样，缺失则报错/回退）。桌面版与带采样库的本地服务会自动用采样；云端 Worker 没有采样库，自动回退合成。

## HTTP

| 方法与路径 | 内容 |
|---|---|
| GET /api/health | 版本及健康状态 |
| GET /api/project | 项目 + 命令 |
| GET /api/presets | 音色与鼓组 |
| GET /api/help | 结构化帮助 |
| POST /api/edit | 与 music_edit 相同 |
| POST /api/transport | 与 music_transport 相同 |
| POST /api/export | 与 music_export 相同 |
| GET /api/exports/{id}.wav 或 .mid | 下载导出文件 |
| POST /api/ack | 浏览器回执，id + error 或 message |

## 浏览器接口

`window.museGrid` 提供：`getProject()`、`dispatch(actions)`（Promise）、`selectTrack(id)`、`getPlayback()`、`play()`、`pause()`、`stop()`、`preview(pitch)`、`export('wav'|'midi'|'json')`。dispatch 带版本检查并更新界面和撤销历史。自动化优先使用 MCP/HTTP；网页 UI 与 API 不应并发无序修改。

播放命令在 15 秒内由打开的页面处理，超过时返回 error；服务端不会伪造浏览器的发声状态。用户至少点击一次播放以启用音频，否则 agent 播放/试听会收到明确错误。acknowledged 代表浏览器执行了调度，不保证扬声器开启或人耳听到了声音。暂停/停止不需要解锁音频。多开窗口会同时轮询，因此实时播放建议只开一个工作台窗口。

导出不依赖打开页面。music_export 返回相对 URL，可拼接当前实例 origin，下载需要相同访问权限。标准 MIDI 不包含自定义合成参数；WAV 与项目文件包含其声音或参数。


## 自定义音色

`track.add` 的 `preset` 可以是内置预设名，也可以是 `custom:<id>`（此时需要同时给出 `synth`）。`music_save_instrument` 用完整 synth 参数保存到音色库；`music_list_instruments` 列出；`music_delete_instrument` 删除。采样音色的波形由 FluidR3 GM 录音决定，修改 synth 的波形/泛音不会生效；需要可编辑的合成音色时使用自定义音色（`engine: 'synth'`）。
