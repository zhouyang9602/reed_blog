个人博客最重要的功能不是“看起来像产品”，而是让你愿意持续写。

数据库、后台、登录和评论系统都很诱人，但它们也意味着更多维护成本。对一个以文字为主的博客来说，静态网站往往已经足够：文章是 Markdown，页面是 HTML、CSS 和 JavaScript，部署只需要一次 `git push`。

## 这个博客的结构

整个项目没有构建步骤，也不需要服务器：

```text
.
├── index.html
├── about.md
├── assets/
├── css/
│   └── main.css
├── js/
│   ├── config.js
│   └── app.js
└── posts/
    ├── first-post.md
    └── second-post.md
```

`config.js` 保存作者信息、社交链接和文章索引。每篇文章的正文放在 `posts` 目录里，页面通过 `fetch()` 读取 Markdown，再交给浏览器端渲染。

这样的好处是内容与界面分离。改名字、简介、头像首字母，不需要碰页面结构；发布文章，也不必复制整页 HTML。

## 为什么使用 Hash 路由

GitHub Pages 和 EdgeOne Pages 都是静态托管。直接访问 `/article/my-post` 时，服务器会寻找同名文件，而不是交给前端处理。

Hash 路由把页面状态放在 `#` 后面：

```text
https://example.com/#/article/my-post
```

浏览器请求的仍然是 `index.html`，JavaScript 再根据 `#` 后面的内容渲染对应页面。它不完美，但对于小博客足够可靠。

路由逻辑可以简化成这样：

```js
function route() {
  const path = location.hash.replace(/^#/, "") || "/";

  if (path === "/") return renderHome();
  if (path === "/articles") return renderArticles();
  if (path.startsWith("/article/")) return renderArticle(path.slice(9));
  if (path === "/about") return renderAbout();

  renderNotFound();
}

window.addEventListener("hashchange", route);
route();
```

## 每篇文章需要一条索引

Markdown 文件本身只负责正文。标题、日期、摘要、分类和标签写在配置里：

```js
{
  slug: "publish-blog-with-github-pages",
  title: "用 Markdown 和 GitHub Pages，搭建一个轻博客",
  date: "2026-09-18",
  category: "技术手记",
  tags: ["GitHub Pages", "Markdown", "静态网站"],
  excerpt: "不引入框架，也不维护数据库。"
}
```

`slug` 与文件名保持一致。发布一篇新文章，只需要新增一个 Markdown 文件，再在数组中添加一条记录。

这条记录稍微重复，但换来的是完全透明的控制：排序、摘要和标签都由你决定，页面不需要读文件系统，也不需要后端 API。

## 部署到 GitHub Pages

最简单的方式是直接使用仓库根目录：

1. 把所有静态文件推到 GitHub 仓库；
2. 打开仓库的 **Settings → Pages**；
3. 在 **Build and deployment** 中选择 **Deploy from a branch**；
4. 选择 `main` 分支和根目录；
5. 等待一分钟，访问生成的网址。

这个项目使用相对路径读取 Markdown，因此即使部署在 `username.github.io/blog/` 这样的子路径下，也不需要修改基准地址。

如果使用自定义域名，在仓库根目录添加 `CNAME` 文件，并按照 GitHub 的说明配置 DNS。

## 部署到 EdgeOne Pages

EdgeOne Pages 的流程同样直接：

1. 将项目推送到 GitHub、GitLab 或 Gitee；
2. 在 EdgeOne Pages 中导入仓库；
3. 构建命令留空；
4. 输出目录填写项目根目录，或填写 `./`；
5. 部署完成后绑定域名。

这是一个无构建项目，不需要安装依赖。平台会把 HTML、CSS、JavaScript 和 Markdown 原样分发出去。

## 本地预览

不要直接双击 `index.html`。浏览器会出于安全策略阻止 `file://` 页面读取 Markdown 文件。

在项目目录启动一个静态服务器：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

如果你使用 Node.js，也可以运行：

```bash
npx serve .
```

## 何时应该换方案

静态博客并不适合所有人。如果你需要多人协作、复杂评论、会员内容，或者文章数量达到数千篇，完整的内容管理系统可能更合适。

但对多数个人写作者来说，真正重要的是把“写”这件事的门槛降到最低。没有构建、没有数据库，也没有需要定期升级的依赖，本身就是一种自由。

把复杂留给作品，把简单留给工具。
