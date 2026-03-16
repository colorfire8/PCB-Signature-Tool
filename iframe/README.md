## iframe（PCB 签名工具）说明

本目录包含“PCB 签名工具”扩展在弹窗 iframe 内运行的全部前端代码。

### 页面入口

- `index.html`
  - 弹窗 UI 的 HTML 入口。
  - 通过多个 `<script>` 顺序加载各功能模块（均为 IIFE，挂载到 `window.*` 命名空间）。

### 文件结构与职责

- `pcb-signature.app.js`
  - **应用入口 / 编排层**：绑定 DOM 事件、读取表单输入、触发预览生成、触发插入到 PCB、保存/恢复配置。
  - 约定：保持“薄”，不要把业务细节堆在这里。

- `pcb-signature.config.js`
  - **配置持久化**：基于 `localStorage` 保存用户输入（仓库、作者、版本、颜色选项、大小、手动协议等）。
  - 对外暴露：`window.PcbSignatureConfig.loadConfig()` / `saveConfig()`

- `pcb-signature.github.js`
  - **GitHub 相关**：解析 GitHub 仓库链接、生成 `owner/repo` 文本、通过 GitHub API 获取仓库的开源协议。
  - 对外暴露：`window.PcbSignatureGitHub.parseGithubRepo()` / `toRepoShortText()` / `fetchGithubLicense()`

- `pcb-signature.qr.js`
  - **二维码生成/加载**：调用二维码服务生成 PNG 并以 `Image` 方式加载。
  - 对外暴露：`window.PcbSignatureQR.loadQrImage()`

- `pcb-signature.render.js`
  - **签名图渲染**：将作者/版本/仓库/协议/致谢 + 二维码排版绘制到 Canvas，并导出为 PNG `blob` + `dataUrl`。
  - 同时负责“彩色/灰度 + 反色”的渲染效果处理（用于预览一致性）。
  - 对外暴露：`window.PcbSignatureRender.createSignatureImage()`

- `pcb-signature.eda.js`
  - **插入到 PCB（宿主 EDA API）**：
    - 彩色：以图片对象方式插入到 `TOP_SILKSCREEN`
    - 非彩色：调用 `convertImageToComplexPolygon` 矢量化后插入丝印（支持反色）
  - 对外暴露：`window.PcbSignatureEDA.insertSignatureImage()`

- `pcb-signature.ui.js`
  - **纯 UI 工具**：状态文案、预览画布绘制/清空。
  - 对外暴露：`window.PcbSignatureUI.setStatus()` / `drawPreviewFromDataUrl()` / `clearPreview()`

- `pcb-signature.css`
  - iframe 页面样式（从 `index.html` 中外置，便于维护）。

- `eda-integration.js`
  - **历史兼容文件（legacy shim）**：当前签名工具不依赖它，但保留以避免外部引用失效。
  - 新逻辑请使用 `pcb-signature.eda.js`。

### 常见改动入口（按需求定位文件）

- **改签名图排版/增加一行文本/调整字体大小**：改 `pcb-signature.render.js`
- **改二维码服务/二维码大小策略**：改 `pcb-signature.qr.js` 与 `pcb-signature.render.js`
- **改插入层/插入方式（彩色 vs 矢量化参数）**：改 `pcb-signature.eda.js`
- **改表单字段、默认值、互斥逻辑、自动保存策略**：改 `pcb-signature.app.js` + `pcb-signature.config.js`

### 调试建议

- 如果预览正常但插入异常：优先检查 `pcb-signature.eda.js`（EDA API 调用与层级参数）。
- 如果插入正常但预览异常：优先检查 `pcb-signature.ui.js`（预览绘制）与 `pcb-signature.render.js`（渲染输出）。

