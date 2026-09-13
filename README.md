# 橱窗档案 · Window Archive

一座关于橱窗的视觉档案网站：经典艺术档案（蓝色页）+ 社会素材档案（粉白页）。
纯静态实现，**无需 Node、无需构建**，双击 `index.html` 或任意静态服务器即可打开。

## 文件结构

| 文件 / 目录 | 说明 |
| --- | --- |
| `index.html` | 入口页面 |
| `style.css` | 全部样式（含本地字体 @font-face 声明） |
| `app.js` | 全部交互逻辑（原生 JS，无框架依赖） |
| `data-social.js` | 社会素材数据（50 条，文字描述 + 图片文件名） |
| `data-art.js` | 经典艺术档案数据（55 条，文字描述 + 图片文件名） |
| `materials/` | 社会素材图片（50 张 webp） |
| `materials-a/` | 经典艺术档案图片（57 张 jpg） |
| `fonts/` | 本地字体（Inter Tight / Space Mono 的 woff2） |

## 本地预览

直接双击 `index.html`，或：

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```

## 部署到 GitHub Pages

1. 把本目录**全部内容**上传到仓库（例如 `CAASCD-Curation/B5-SHOPWINDOW`）的某个分支根目录。
2. 仓库 Settings → Pages → Source 选择该分支 /(root)。
3. 等待 1–2 分钟，访问 `https://<用户名>.github.io/<仓库名>/`。

所有资源均为相对路径，部署到子路径（如 `/B5-SHOPWINDOW/`）也能正常显示。

## 功能

- 页面1（蓝）：双向平移图片带（上带右→左，下带左→右）、中央自转玻璃方体橱窗、点击图片放大查看详情（左右箭头 / 键盘 ← → 切换，Esc 关闭）
- 页面2（粉白）：年代筛选（all / before-1900 / 1900-49 / 1950-99 / 2000+）、列表行点击展开图文详情
- 页面1 → 页面2 渐隐渐显滚动转场；右侧竖条跑马灯颜色随区块切换（米白×克莱因蓝 / 粉×红）

数据来源：9.13数据库.xlsx（A 经典艺术档案 / C 社会素材）。
