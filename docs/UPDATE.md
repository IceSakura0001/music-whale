# 更新与分发

Music Whale 使用「清单检查 + 手动下载安装包」的轻量更新方式（不依赖代码签名和更新服务器 SDK）。

## 发布一个版本

1. 修改 `package.json` 的 `version`（例如 1.2.1）。
2. 重新构建安装包：

   ```text
   npm run app:build
   ```

   产物在 `release-installer/Music Whale Setup <version>.exe`。
3. 把新安装包上传到任意 HTTP(S) 地址，并发布一个 `update.json`，例如：

   ```json
   {
     "version": "1.2.1",
     "url": "https://example.com/downloads/Music Whale Setup 1.2.1.exe",
     "notes": "新增长笛气声、修复自定义音色保存"
   }
   ```

## 客户端如何检查

- 菜单「帮助 → 检查更新…」会读取更新源；发现新版本时确认后**自动下载安装包并可直接运行安装程序**。
- 更新源优先级：环境变量 `MUSIC_WHALE_UPDATE_URL`（可以是 HTTP(S) 地址或本地 `update.json` 路径）> 应用目录下的 `update.json`。
- 启动时会静默检查一次；没有配置更新源或已是最新版本时不会打扰用户。设置 `MUSIC_WHALE_AUTO_UPDATE=1` 后启动检查也会直接进入下载确认流程。
- 版本号按点分段数字比较（1.2.10 > 1.2.9）。

## 说明

- 安装包未做代码签名，Windows SmartScreen 可能提示；正式发布建议购买代码签名证书并配置 electron-builder 的 `certificateFile`。
- 需要静默安装/差分升级（不弹 NSIS 向导）时，可以改用 `electron-updater` + 静态更新源；当前实现是清单检查 + 自动下载 + 用户确认安装，无需签名证书也能用。
