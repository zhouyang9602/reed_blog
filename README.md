# Reed 个人博客

一个无需构建的静态个人博客，包含首页、文章列表、Markdown 文章详情和关于页面。

## 功能

- 深色 / 浅色主题，自动跟随系统并可手动切换
- 关键词搜索、分类筛选和标签筛选
- Hash 路由，兼容 GitHub Pages、EdgeOne Pages 等静态托管
- Markdown 渲染，支持标题、列表、引用、表格、代码块和图片
- 文章阅读进度、自动目录、代码复制、相邻文章导航
- 响应式布局和无障碍键盘焦点

## 本地预览

浏览器不允许 `file://` 页面通过 `fetch` 读取 Markdown，请启动本地静态服务器：

```bash
python -m http.server 8000
```

访问 <http://localhost:8000>。

如果使用 Node.js，也可以运行：

```bash
node scripts/serve.js 8000
```

也可以临时使用：

```bash
npx serve .
```

## 修改个人信息

所有站点身份与文章索引都在 [js/config.js](js/config.js)：

- `name`、`initials`、`title`、`description`：姓名与站点简介
- `hero`：首页主视觉文案
- `socials`：页脚与关于页的社交链接
- `posts`：文章标题、日期、分类、标签、摘要和主题色

站点配色、字体和间距集中在 [css/main.css](css/main.css) 顶部的 CSS 变量中。

## 发布文章

1. 在 `posts/` 目录新建 Markdown 文件，例如 `my-new-post.md`；
2. 在 `js/config.js` 的 `posts` 数组中添加一条记录；
3. 保证配置中的 `slug` 与 Markdown 文件名一致；
4. 在本地检查文章列表、详情页和标签筛选。

文章示例：

```js
{
  slug: "my-new-post",
  title: "文章标题",
  date: "2026-11-10",
  category: "技术手记",
  tags: ["JavaScript", "前端"],
  excerpt: "显示在文章列表中的一段摘要。",
  readingTime: 6,
  theme: "blue"
}
```

可选主题色：`blue`、`cyan`、`amber`、`indigo`、`rose`、`green`。

## 部署到 GitHub Pages

1. 创建 GitHub 仓库并上传全部文件；
2. 打开仓库 **Settings → Pages**；
3. 在 **Build and deployment** 中选择 **Deploy from a branch**；
4. 选择 `main` 分支和 `/ (root)` 目录并保存。

项目使用相对路径加载 Markdown，因此既支持 `username.github.io`，也支持 `username.github.io/repository-name/` 形式的项目站点。

## 部署到 EdgeOne Pages

1. 将仓库导入 EdgeOne Pages；
2. 构建命令留空；
3. 输出目录填写 `.`；
4. 完成部署后按需绑定自定义域名。

## 目录结构

```text
.
├── assets/
│   └── favicon.svg
├── css/
│   └── main.css
├── js/
│   ├── app.js
│   └── config.js
├── posts/
│   └── *.md
├── 404.html
├── about.md
├── index.html
├── scripts/
│   └── serve.js
└── README.md
```
