# Vue 应用

此模板可以帮助你快速开始使用 Vite 开发 Vue 3 应用。

## 推荐的 IDE 配置

[VS Code](https://code.visualstudio.com/) + [Vue（官方）](https://marketplace.visualstudio.com/items?itemName=Vue.volar)（并禁用 Vetur）。

## 推荐的浏览器配置

- 基于 Chromium 的浏览器（Chrome、Edge、Brave 等）：
  - [Vue.js 开发者工具](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [在 Chrome DevTools 中启用自定义对象格式化程序](http://bit.ly/object-formatters)
- Firefox：
  - [Vue.js 开发者工具](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [在 Firefox DevTools 中启用自定义对象格式化程序](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## TS 中 `.vue` 导入的类型支持

TypeScript 默认无法处理 `.vue` 导入的类型信息，因此我们使用 `vue-tsc` 替代 `tsc` CLI 进行类型检查。在编辑器中，需要安装 [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)，让 TypeScript 语言服务识别 `.vue` 类型。

## 自定义配置

请参阅 [Vite 配置参考](https://vite.dev/config/)。

## 项目设置

```sh
npm install
```

### 编译并启动开发环境热更新

```sh
npm run dev
```

### 类型检查、编译并压缩生产版本

```sh
npm run build
```
