/* global SITE_CONFIG */

(function () {
  "use strict";

  const app = document.getElementById("app");
  const header = document.getElementById("siteHeader");
  const themeToggle = document.getElementById("themeToggle");
  const menuToggle = document.getElementById("menuToggle");
  const mobilePanel = document.getElementById("mobilePanel");
  const navSearchForm = document.getElementById("navSearchForm");
  const navSearchInput = document.getElementById("navSearchInput");
  const mobileSearchForm = document.getElementById("mobileSearchForm");
  const mobileSearchInput = document.getElementById("mobileSearchInput");
  const backToTop = document.getElementById("backToTop");
  const readingProgress = document.getElementById("readingProgress");
  const toast = document.getElementById("toast");

  let renderVersion = 0;
  let tocObserver = null;
  let toastTimer = null;
  let scrollTicking = false;

  const THEME_KEY = "linan-blog-theme";
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  /* =======================================================
     Utilities
     ======================================================= */
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function stripHtml(value) {
    return String(value || "").replace(/<[^>]*>/g, "");
  }

  function safeUrl(rawUrl) {
    const value = String(rawUrl || "").trim();
    if (/^(?:javascript|vbscript|data):/i.test(value)) return "#";
    return value || "#";
  }

  function encodeHashPath(path) {
    return String(path)
      .split("/")
      .map(function (segment) {
        return encodeURIComponent(segment);
      })
      .join("/");
  }

  function formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");
    if (Number.isNaN(date.getTime())) return dateString;
    return date.getFullYear() + "." +
      String(date.getMonth() + 1).padStart(2, "0") + "." +
      String(date.getDate()).padStart(2, "0");
  }

  function formatLongDate(dateString) {
    const date = new Date(dateString + "T00:00:00");
    if (Number.isNaN(date.getTime())) return dateString;
    return date.getFullYear() + " 年 " +
      (date.getMonth() + 1) + " 月 " +
      date.getDate() + " 日";
  }

  function estimateReadingTime(text) {
    const plain = stripHtml(text || "");
    const chineseCharacters = (plain.match(/[\u3400-\u9fff]/g) || []).length;
    const latinWords = (plain.match(/[A-Za-z0-9_]+/g) || []).length;
    return Math.max(1, Math.ceil(chineseCharacters / 400 + latinWords / 220));
  }

  function getPosts() {
    return SITE_CONFIG.posts
      .filter(function (post) { return post.published !== false; })
      .slice()
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
  }

  function getCategories() {
    const counts = {};
    getPosts().forEach(function (post) {
      if (!post.category) return;
      counts[post.category] = (counts[post.category] || 0) + 1;
    });
    return counts;
  }

  function getTags() {
    const counts = {};
    getPosts().forEach(function (post) {
      (post.tags || []).forEach(function (tag) {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }

  function updateSiteChrome() {
    document.title = SITE_CONFIG.title;
    document.getElementById("brandName").textContent = SITE_CONFIG.name;
    document.getElementById("brandTagline").textContent = SITE_CONFIG.tagline;
    document.getElementById("footerMonogram").textContent = SITE_CONFIG.initials;
    document.getElementById("footerName").textContent = SITE_CONFIG.name;
    document.getElementById("footerDescription").textContent = SITE_CONFIG.footerDescription;
    document.getElementById("footerCopyright").textContent =
      "© " + new Date().getFullYear() + " " + SITE_CONFIG.name;

    const footerLinks = document.getElementById("footerLinks");
    footerLinks.innerHTML = SITE_CONFIG.socials.map(function (social) {
      return '<a href="' + escapeHtml(safeUrl(social.url)) + '"' +
        (/^https?:/i.test(social.url) ? ' target="_blank" rel="noopener noreferrer"' : "") +
        ">" + escapeHtml(social.name) + "</a>";
    }).join("");
  }

  function setMetaDescription(description) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description || SITE_CONFIG.description);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("visible");
    }, 1800);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
      showToast("已复制到剪贴板");
    } catch (error) {
      showToast("复制失败，请手动选择文本");
    }
  }

  /* =======================================================
     Theme
     ======================================================= */
  function resolveTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (metaTheme) metaTheme.setAttribute("content", theme === "dark" ? "#0b1727" : "#081c34");
    if (themeToggle) {
      themeToggle.setAttribute("aria-label", theme === "dark" ? "切换到浅色主题" : "切换到深色主题");
    }
  }

  try {
    applyTheme(resolveTheme());
  } catch (error) {
    applyTheme("light");
  }

  themeToggle.addEventListener("click", function () {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (error) {
      // A private browsing policy may disable storage; the current theme still works.
    }
  });

  /* =======================================================
     Markdown renderer
     ======================================================= */
  function inlineMarkdown(raw) {
    const codeTokens = [];

    let text = String(raw || "").replace(/`([^`]+)`/g, function (_, code) {
      const token = "@@INLINE_CODE_" + codeTokens.length + "@@";
      codeTokens.push("<code>" + escapeHtml(code) + "</code>");
      return token;
    });

    text = escapeHtml(text);

    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (_, alt, url, title) {
      const safe = safeUrl(url);
      return '<img src="' + safe + '" alt="' + alt + '"' +
        (title ? ' title="' + title + '"' : "") + ' loading="lazy">';
    });

    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, url) {
      const cleanUrl = url.replace(/\s+&quot;.*&quot;$/, "").trim();
      return '<a href="' + safeUrl(cleanUrl) + '">' + label + "</a>";
    });

    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    text = text.replace(/==([^=]+)==/g, "<mark>$1</mark>");
    text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

    codeTokens.forEach(function (html, index) {
      text = text.replace("@@INLINE_CODE_" + index + "@@", html);
    });

    return text;
  }

  function splitTableRow(line) {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(function (cell) { return cell.trim(); });
  }

  function renderMarkdown(source, options) {
    const includeHeadings = !options || options.collectHeadings !== false;
    const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
    const output = [];
    const headings = [];
    const headingIds = new Set();
    let paragraph = [];
    let listType = "";
    let listItems = [];
    let headingIndex = 0;

    function flushParagraph() {
      if (!paragraph.length) return;
      output.push("<p>" + inlineMarkdown(paragraph.join(" ")) + "</p>");
      paragraph = [];
    }

    function flushList() {
      if (!listType || !listItems.length) return;
      output.push("<" + listType + ">");
      listItems.forEach(function (item) {
        output.push("<li>" + inlineMarkdown(item) + "</li>");
      });
      output.push("</" + listType + ">");
      listType = "";
      listItems = [];
    }

    function flushBlocks() {
      flushParagraph();
      flushList();
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();

      if (/^```/.test(trimmed)) {
        flushBlocks();
        const language = trimmed.slice(3).trim() || "text";
        const codeLines = [];
        index += 1;
        while (index < lines.length && !/^```/.test(lines[index].trim())) {
          codeLines.push(lines[index]);
          index += 1;
        }
        output.push(
          '<div class="code-block">' +
            '<div class="code-head"><span>' + escapeHtml(language) + "</span>" +
            '<button class="copy-code" type="button" data-copy-code>复制</button></div>' +
            "<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>" +
          "</div>"
        );
        continue;
      }

      if (!trimmed) {
        flushBlocks();
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushBlocks();
        const level = headingMatch[1].length;
        const headingRaw = headingMatch[2];
        headingIndex += 1;
        let id = "section-" + headingIndex;
        while (headingIds.has(id)) {
          headingIndex += 1;
          id = "section-" + headingIndex;
        }
        headingIds.add(id);
        output.push(
          "<h" + level + ' id="' + id + '">' + inlineMarkdown(headingRaw) + "</h" + level + ">"
        );
        if (includeHeadings && level >= 2 && level <= 3) {
          headings.push({
            id: id,
            level: level,
            text: stripHtml(inlineMarkdown(headingRaw))
          });
        }
        continue;
      }

      if (/^(?:---+|\*\*\*+|___+)$/.test(trimmed)) {
        flushBlocks();
        output.push("<hr>");
        continue;
      }

      if (/^>\s?/.test(trimmed)) {
        flushBlocks();
        const quoteLines = [];
        while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
          quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
          index += 1;
        }
        index -= 1;
        const quote = renderMarkdown(quoteLines.join("\n"), { collectHeadings: false });
        output.push("<blockquote>" + quote.html + "</blockquote>");
        continue;
      }

      if (
        trimmed.indexOf("|") >= 0 &&
        index + 1 < lines.length &&
        /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
      ) {
        flushBlocks();
        const headers = splitTableRow(line);
        const rows = [];
        index += 2;
        while (index < lines.length && lines[index].trim().indexOf("|") >= 0 && lines[index].trim()) {
          rows.push(splitTableRow(lines[index]));
          index += 1;
        }
        index -= 1;
        output.push("<table><thead><tr>");
        headers.forEach(function (cell) {
          output.push("<th>" + inlineMarkdown(cell) + "</th>");
        });
        output.push("</tr></thead><tbody>");
        rows.forEach(function (row) {
          output.push("<tr>");
          headers.forEach(function (_, cellIndex) {
            output.push("<td>" + inlineMarkdown(row[cellIndex] || "") + "</td>");
          });
          output.push("</tr>");
        });
        output.push("</tbody></table>");
        continue;
      }

      const unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/);
      const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (unorderedMatch || orderedMatch) {
        const nextType = unorderedMatch ? "ul" : "ol";
        if (listType && listType !== nextType) flushList();
        flushParagraph();
        listType = nextType;
        listItems.push((unorderedMatch || orderedMatch)[1]);
        continue;
      }

      if (listType) flushList();
      paragraph.push(trimmed);
    }

    flushBlocks();
    return { html: output.join("\n"), headings: headings };
  }

  /* =======================================================
     Shared views
     ======================================================= */
  function articleCard(post, options) {
    const isCompact = options && options.compact;
    const readingTime = post.readingTime || estimateReadingTime(post.excerpt);
    const tags = (post.tags || []).slice(0, isCompact ? 2 : 3);
    const href = "#/article/" + encodeURIComponent(post.slug);

    return (
      '<article class="article-card" data-theme="' + escapeHtml(post.theme || "blue") + '"' +
        ' data-card-href="' + href + '">' +
        '<div class="card-meta">' +
          '<span class="card-category">' + escapeHtml(post.category || "随笔") + "</span>" +
          (post.featured ? '<span class="card-category">置顶</span>' : "") +
          "<span>" + formatDate(post.date) + "</span>" +
          '<span class="card-meta-dot meta-dot-optional"></span>' +
          '<span class="read-time">' + readingTime + " 分钟阅读</span>" +
        "</div>" +
        '<h3 class="card-title"><a href="' + href + '">' + escapeHtml(post.title) + "</a></h3>" +
        '<p class="card-excerpt">' + escapeHtml(post.excerpt) + "</p>" +
        '<div class="card-foot">' +
          '<div class="tag-row">' +
            tags.map(function (tag) {
              return '<a class="tag" href="#/articles?tag=' +
                encodeURIComponent(tag) + '">#' + escapeHtml(tag) + "</a>";
            }).join("") +
          "</div>" +
          '<span class="card-arrow" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>' +
          "</span>" +
        "</div>" +
      "</article>"
    );
  }

  function renderProfileCard() {
    const categories = getCategories();
    const tags = getTags();
    return (
      '<section class="side-card profile-card">' +
        '<div class="profile-avatar">' + escapeHtml(SITE_CONFIG.initials) + "</div>" +
        '<h2 class="profile-name">' + escapeHtml(SITE_CONFIG.name) + "</h2>" +
        '<p class="profile-role">独立开发者 · 产品设计</p>' +
        '<p class="profile-bio">' + escapeHtml(SITE_CONFIG.aboutPreview) + "</p>" +
        '<div class="profile-stats">' +
          '<div class="profile-stat"><strong>' + getPosts().length + "</strong><span>文章</span></div>" +
          '<div class="profile-stat"><strong>' + Object.keys(categories).length + "</strong><span>分类</span></div>" +
          '<div class="profile-stat"><strong>' + Object.keys(tags).length + "</strong><span>标签</span></div>" +
        "</div>" +
        '<div class="profile-socials">' +
          SITE_CONFIG.socials.map(function (social) {
            return '<a href="' + escapeHtml(safeUrl(social.url)) + '"' +
              (/^https?:/i.test(social.url) ? ' target="_blank" rel="noopener noreferrer"' : "") +
              ">" + escapeHtml(social.name) + "</a>";
          }).join("") +
        "</div>" +
      "</section>"
    );
  }

  function renderCategoryCard() {
    const categories = getCategories();
    return (
      '<section class="side-card">' +
        '<h2 class="side-title">文章分类</h2>' +
        '<div class="category-list">' +
          Object.keys(categories).sort().map(function (category) {
            return '<a class="category-link" href="#/articles?category=' +
              encodeURIComponent(category) + '"><span>' + escapeHtml(category) +
              '</span><span class="category-count">' + String(categories[category]).padStart(2, "0") +
              "</span></a>";
          }).join("") +
        "</div>" +
      "</section>"
    );
  }

  function renderTagCard(limit) {
    const tags = getTags();
    const sorted = Object.keys(tags).sort(function (a, b) {
      return tags[b] - tags[a] || a.localeCompare(b, "zh-CN");
    }).slice(0, limit || 12);

    return (
      '<section class="side-card">' +
        '<h2 class="side-title">常用标签</h2>' +
        '<div class="side-tags">' +
          sorted.map(function (tag) {
            return '<a class="tag" href="#/articles?tag=' +
              encodeURIComponent(tag) + '">#' + escapeHtml(tag) + "</a>";
          }).join("") +
        "</div>" +
      "</section>"
    );
  }

  function renderContactCard() {
    return (
      '<section class="side-card newsletter-card">' +
        '<h2 class="side-title">保持联系</h2>' +
        '<p class="newsletter-copy">如果你也喜欢认真做产品、慢慢写东西，欢迎来信聊聊。这里没有订阅弹窗，只有一封真实的邮件。</p>' +
        '<a class="newsletter-mail" href="mailto:' + escapeHtml(SITE_CONFIG.email) + '">↳ ' +
          escapeHtml(SITE_CONFIG.email) + "</a>" +
      "</section>"
    );
  }

  function renderSidebar() {
    return (
      '<aside class="sidebar">' +
        renderProfileCard() +
        renderCategoryCard() +
        renderTagCard(10) +
        renderContactCard() +
      "</aside>"
    );
  }

  /* =======================================================
     Route definitions
     ======================================================= */
  function parseRoute() {
    const rawHash = window.location.hash || "#/";
    const hashBody = rawHash.replace(/^#/, "");
    const questionIndex = hashBody.indexOf("?");
    const path = (questionIndex >= 0 ? hashBody.slice(0, questionIndex) : hashBody) || "/";
    const query = new URLSearchParams(questionIndex >= 0 ? hashBody.slice(questionIndex + 1) : "");
    return { path: path, query: query };
  }

  function renderHome() {
    ++renderVersion;
    const posts = getPosts();
    const categories = getCategories();
    const tags = getTags();
    const latest = posts.slice(0, 4);

    app.innerHTML =
      '<div class="container home-page">' +
        '<section class="hero">' +
          '<div class="hero-grid">' +
            '<div class="hero-copy">' +
              '<p class="hero-eyebrow">' + escapeHtml(SITE_CONFIG.hero.eyebrow) + "</p>" +
              "<h1>" + escapeHtml(SITE_CONFIG.hero.titleTop) + "<br>" +
                '<span class="accent">' + escapeHtml(SITE_CONFIG.hero.titleAccent) + "</span></h1>" +
              '<p class="hero-intro">' + escapeHtml(SITE_CONFIG.hero.intro) + "</p>" +
              '<div class="hero-actions">' +
                '<a class="button button-primary" href="#/articles">' +
                  escapeHtml(SITE_CONFIG.hero.primaryAction) +
                  ' <span aria-hidden="true">→</span></a>' +
                '<a class="button button-ghost" href="#/about">' +
                  escapeHtml(SITE_CONFIG.hero.secondaryAction) + "</a>" +
              "</div>" +
            "</div>" +
            '<aside class="terminal-card" aria-label="关于我的快速信息">' +
              '<div class="terminal-head">' +
                '<span class="terminal-dot"></span><span class="terminal-dot"></span>' +
                '<span class="terminal-dot"></span><span class="terminal-title">now.sh</span>' +
              "</div>" +
              '<div class="terminal-body">' +
                '<p class="terminal-line"><span class="terminal-prompt">$</span> whoami</p>' +
                '<p class="terminal-line"><span class="terminal-key">' + escapeHtml(SITE_CONFIG.englishName) +
                  '</span> <span class="terminal-value">/ product engineer</span></p>' +
                '<p class="terminal-line"><span class="terminal-prompt">$</span> current --focus</p>' +
                '<p class="terminal-line"><span class="terminal-key">' + escapeHtml(SITE_CONFIG.currentFocus) + "</span></p>" +
                '<p class="terminal-line"><span class="terminal-prompt">$</span> location</p>' +
                '<p class="terminal-line"><span class="terminal-value">' + escapeHtml(SITE_CONFIG.location) + "</span></p>" +
                '<p class="terminal-line current">building in public<span class="terminal-cursor"></span></p>' +
              "</div>" +
            "</aside>" +
          "</div>" +
          '<div class="hero-foot">' +
            '<span class="hero-stat"><strong>' + String(posts.length).padStart(2, "0") +
              "</strong><span>篇文章</span></span>" +
            '<span class="hero-stat hero-step"><strong>' + String(Object.keys(categories).length).padStart(2, "0") +
              "</strong><span>个分类</span></span>" +
            '<span class="hero-stat hero-step"><strong>' + String(Object.keys(tags).length).padStart(2, "0") +
              "</strong><span>个标签</span></span>" +
            '<span class="hero-status">since ' + escapeHtml(SITE_CONFIG.since) + " · writing regularly</span>" +
          "</div>" +
        "</section>" +

        '<section class="home-section">' +
          '<div class="section-head">' +
            '<h2 class="section-title">最近更新 <small>' + String(posts.length).padStart(2, "0") + "</small></h2>" +
            '<a class="text-link" href="#/articles">全部文章 <span>→</span></a>' +
          "</div>" +
          '<div class="home-layout">' +
            '<div class="article-list">' +
              latest.map(function (post) { return articleCard(post); }).join("") +
            "</div>" +
            renderSidebar() +
          "</div>" +
        "</section>" +
      "</div>";

    document.title = SITE_CONFIG.name + " · " + SITE_CONFIG.tagline;
    setMetaDescription(SITE_CONFIG.description);
    finishRendering();
  }

  function renderArticles(query) {
    ++renderVersion;
    const q = (query.get("q") || "").trim();
    const selectedTag = (query.get("tag") || "").trim();
    const selectedCategory = (query.get("category") || "").trim();
    const allPosts = getPosts();
    const categories = getCategories();

    let posts = allPosts.filter(function (post) {
      const haystack = [post.title, post.excerpt, post.category].concat(post.tags || []).join(" ").toLowerCase();
      const matchesQuery = !q || haystack.indexOf(q.toLowerCase()) >= 0;
      const matchesTag = !selectedTag || (post.tags || []).indexOf(selectedTag) >= 0;
      const matchesCategory = !selectedCategory || post.category === selectedCategory;
      return matchesQuery && matchesTag && matchesCategory;
    });

    const filters = [];
    if (selectedCategory) filters.push("分类：" + selectedCategory);
    if (selectedTag) filters.push("#" + selectedTag);
    if (q) filters.push("“" + q + "”");

    const pageTitle = selectedCategory
      ? escapeHtml(selectedCategory)
      : selectedTag
        ? "#" + escapeHtml(selectedTag)
        : q
          ? "搜索结果"
          : "所有文章";

    app.innerHTML =
      '<div class="container index-page">' +
        '<section class="page-intro">' +
          '<p class="eyebrow">WRITING ARCHIVE</p>' +
          "<h1>" + pageTitle + "</h1>" +
          "<p>把零散的想法整理成可以回看的文字。按分类、标签或关键词，找到你感兴趣的那一篇。</p>" +
        "</section>" +
        '<div class="home-layout">' +
          "<div>" +
            '<div class="filter-bar">' +
              "<span>按分类筛选</span>" +
              '<div class="filter-chips">' +
                '<a class="filter-chip' + (!selectedCategory ? " active" : "") +
                  '" href="#/articles">全部</a>' +
                Object.keys(categories).sort().map(function (category) {
                  return '<a class="filter-chip' + (selectedCategory === category ? " active" : "") +
                    '" href="#/articles?category=' + encodeURIComponent(category) + '">' +
                    escapeHtml(category) + "</a>";
                }).join("") +
              "</div>" +
              (filters.length ? '<a class="filter-reset" href="#/articles">清除筛选</a>' : "") +
            "</div>" +
            '<p class="results-line">共找到 <strong>' + posts.length + "</strong> 篇文章" +
              (filters.length ? " · " + filters.map(escapeHtml).join(" / ") : "") + "</p>" +
            (posts.length
              ? '<div class="article-list">' +
                posts.map(function (post) { return articleCard(post); }).join("") +
                "</div>"
              : '<div class="empty-state">' +
                '<div class="empty-icon"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle>' +
                  '<path d="m20 20-4-4"></path></svg></div>' +
                "<h2>没有找到匹配的文章</h2>" +
                "<p>换一个关键词或清除筛选条件试试。</p>" +
                '<a class="button button-primary" href="#/articles" style="background:var(--blue);color:#fff">查看全部文章</a>' +
                "</div>") +
          "</div>" +
          renderSidebar() +
        "</div>" +
      "</div>";

    if (navSearchInput) navSearchInput.value = q;
    if (mobileSearchInput) mobileSearchInput.value = q;
    document.title = (q || selectedTag || selectedCategory ? pageTitle.replace(/<[^>]+>/g, "") + " · " : "文章 · ") +
      SITE_CONFIG.name;
    setMetaDescription("浏览 " + SITE_CONFIG.name + " 的文章归档。");
    finishRendering();
  }

  async function renderArticle(slug) {
    const version = ++renderVersion;
    const posts = getPosts();
    const post = posts.find(function (item) { return item.slug === slug; });

    if (!post) {
      renderNotFound("这篇文章不存在，可能已经被移动。");
      return;
    }

    app.innerHTML =
      '<div class="narrow"><div class="page-loading" aria-label="正在加载文章">' +
        "<span></span><span></span><span></span></div></div>";

    try {
      const response = await fetch("posts/" + encodeURIComponent(post.slug) + ".md", { cache: "no-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const markdown = await response.text();
      if (version !== renderVersion) return;

      const rendered = renderMarkdown(markdown);
      const readingTime = estimateReadingTime(markdown);
      const postIndex = posts.findIndex(function (item) { return item.slug === post.slug; });
      const newerPost = posts[postIndex - 1];
      const olderPost = posts[postIndex + 1];
      const updated = post.updated && post.updated !== post.date
        ? '<span class="meta-divider optional"></span>' +
          '<span class="meta-optional">更新于 ' + formatDate(post.updated) + "</span>"
        : "";

      const toc = rendered.headings.length
        ? '<aside class="toc" aria-label="文章目录">' +
            '<p class="toc-title">On this page</p>' +
            "<nav>" + rendered.headings.map(function (heading) {
              return '<a href="#' + heading.id + '" data-toc-target="' + heading.id + '">' +
                (heading.level === 3 ? "↳ " : "") + escapeHtml(heading.text) + "</a>";
            }).join("") + "</nav>" +
          "</aside>"
        : "";

      const adjacent = [];
      if (olderPost) {
        adjacent.push(
          '<a class="adjacent-post" href="#/article/' + encodeURIComponent(olderPost.slug) + '">' +
            '<span class="adjacent-label">← PREVIOUS</span>' +
            '<span class="adjacent-title">' + escapeHtml(olderPost.title) + "</span></a>"
        );
      }
      if (newerPost) {
        adjacent.push(
          '<a class="adjacent-post next" href="#/article/' + encodeURIComponent(newerPost.slug) + '">' +
            '<span class="adjacent-label">NEXT →</span>' +
            '<span class="adjacent-title">' + escapeHtml(newerPost.title) + "</span></a>"
        );
      }

      app.innerHTML =
        '<div class="article-layout">' +
          "<div>" +
            '<article class="article" data-theme="' + escapeHtml(post.theme || "blue") + '">' +
              '<div class="article-topline">' +
                '<a class="back-button" href="#/articles">' +
                  '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg>返回文章</a>' +
                '<div class="breadcrumb"><span>文章</span><span>/</span>' +
                  "<span>" + escapeHtml(post.category || "随笔") + "</span><span>/</span>" +
                  '<span class="current">' + escapeHtml(post.title) + "</span></div>" +
              "</div>" +
              '<div class="article-kicker">' + escapeHtml(post.category || "随笔") + "</div>" +
              '<h1 class="article-title">' + escapeHtml(post.title) + "</h1>" +
              '<p class="article-deck">' + escapeHtml(post.excerpt) + "</p>" +
              '<div class="article-meta">' +
                '<span class="article-author"><span class="article-author-mark">' +
                  escapeHtml(SITE_CONFIG.initials) + "</span>" + escapeHtml(SITE_CONFIG.name) + "</span>" +
                '<span class="meta-divider"></span>' +
                "<span>" + formatLongDate(post.date) + "</span>" +
                '<span class="meta-divider optional"></span>' +
                '<span class="meta-optional">' + readingTime + " 分钟阅读</span>" +
                updated +
                '<div class="article-actions">' +
                  '<button class="article-action" type="button" data-copy-link aria-label="复制文章链接">' +
                    '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"></path>' +
                    '<path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"></path></svg></button>' +
                "</div>" +
              "</div>" +
              '<div class="article-visual" aria-hidden="true"></div>' +
              '<div class="prose">' + rendered.html + "</div>" +
              '<div class="article-tags"><span>标签</span>' +
                (post.tags || []).map(function (tag) {
                  return '<a class="tag" href="#/articles?tag=' + encodeURIComponent(tag) +
                    '">#' + escapeHtml(tag) + "</a>";
                }).join("") +
              "</div>" +
            "</article>" +
            (adjacent.length ? '<nav class="article-navigation" aria-label="相邻文章">' + adjacent.join("") + "</nav>" : "") +
          "</div>" +
          toc +
        "</div>";

      document.title = post.title + " · " + SITE_CONFIG.name;
      setMetaDescription(post.excerpt);
      finishRendering();
      window.scrollTo({ top: 0, behavior: "auto" });
      initArticleBehaviors();
    } catch (error) {
      if (version !== renderVersion) return;
      renderNotFound("文章内容加载失败，请确认 Markdown 文件存在并通过本地服务器访问。");
    }
  }

  async function renderAbout() {
    const version = ++renderVersion;
    app.innerHTML =
      '<div class="narrow"><div class="page-loading" aria-label="正在加载关于页面">' +
        "<span></span><span></span><span></span></div></div>";

    try {
      const response = await fetch("about.md", { cache: "no-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const markdown = await response.text();
      if (version !== renderVersion) return;

      const rendered = renderMarkdown(markdown);
      app.innerHTML =
        '<div class="container about-page">' +
          '<section class="about-hero">' +
            '<div class="about-avatar">' + escapeHtml(SITE_CONFIG.initials) + "</div>" +
            '<div class="about-copy">' +
              '<p class="hero-eyebrow">HELLO, THERE</p>' +
              "<h1>你好，我是<span>" + escapeHtml(SITE_CONFIG.name) + "</span>。</h1>" +
              "<p>" + escapeHtml(SITE_CONFIG.description) + "</p>" +
              '<div class="about-facts">' +
                '<span class="about-fact">📍 ' + escapeHtml(SITE_CONFIG.location) + "</span>" +
                '<span class="about-fact">⌘ Product & Code</span>' +
                '<span class="about-fact">✎ Writing since ' + escapeHtml(SITE_CONFIG.since) + "</span>" +
              "</div>" +
            "</div>" +
          "</section>" +
          '<div class="about-grid">' +
            '<article class="about-content"><div class="prose">' + rendered.html + "</div></article>" +
            '<aside class="about-side">' +
              '<div class="about-note">' +
                '<p class="about-note-label">CURRENTLY</p>' +
                "<p>" + escapeHtml(SITE_CONFIG.currentFocus) + "</p>" +
              "</div>" +
              '<div class="about-note">' +
                '<p class="about-note-label">FIND ME</p>' +
                '<div class="social-list">' +
                  SITE_CONFIG.socials.map(function (social) {
                    return '<a href="' + escapeHtml(safeUrl(social.url)) + '"' +
                      (/^https?:/i.test(social.url) ? ' target="_blank" rel="noopener noreferrer"' : "") +
                      ">" + escapeHtml(social.name) + "</a>";
                  }).join("") +
                "</div>" +
              "</div>" +
              '<div class="about-note">' +
                '<p class="about-note-label">A SMALL NOTE</p>' +
                "<p>这个网站没有算法推荐，也没有后台统计。你愿意读到这里，本身就是一件很珍贵的事。</p>" +
              "</div>" +
            "</aside>" +
          "</div>" +
        "</div>";

      document.title = "关于 · " + SITE_CONFIG.name;
      setMetaDescription(SITE_CONFIG.description);
      finishRendering();
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      if (version !== renderVersion) return;
      renderNotFound("关于页面加载失败，请确认 about.md 存在并通过本地服务器访问。");
    }
  }

  function renderNotFound(message) {
    ++renderVersion;
    app.innerHTML =
      '<div class="container not-found-page">' +
        "<div>" +
          '<p class="not-found-code">404</p>' +
          "<h1>这一页走丢了</h1>" +
          "<p>" + escapeHtml(message || "你访问的页面不存在，或链接已经失效。") + "</p>" +
          '<a class="button" href="#/">回到首页</a>' +
        "</div>" +
      "</div>";
    document.title = "404 · " + SITE_CONFIG.name;
    setMetaDescription("页面不存在。");
    finishRendering();
  }

  /* =======================================================
     Rendering side effects
     ======================================================= */
  function finishRendering() {
    closeMobileMenu();
    updateActiveNav();
    updateReadingProgress();
  }

  function updateActiveNav() {
    const route = parseRoute();
    let active = "home";
    if (route.path === "/articles" || route.path.indexOf("/article/") === 0) active = "articles";
    if (route.path === "/about") active = "about";
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      link.classList.toggle("active", link.dataset.nav === active);
    });
  }

  function finishRoute() {
    const route = parseRoute();
    if (route.path === "/" || route.path === "") {
      renderHome();
    } else if (route.path === "/articles") {
      renderArticles(route.query);
    } else if (route.path.indexOf("/article/") === 0) {
      const slug = decodeURIComponent(route.path.slice("/article/".length));
      renderArticle(slug);
    } else if (route.path === "/about") {
      renderAbout();
    } else {
      renderNotFound();
    }
  }

  function goToArticles(query) {
    const params = new URLSearchParams();
    Object.keys(query || {}).forEach(function (key) {
      if (query[key]) params.set(key, query[key]);
    });
    const suffix = params.toString() ? "?" + params.toString() : "";
    window.location.hash = "#/articles" + suffix;
    closeMobileMenu();
  }

  function closeMobileMenu() {
    mobilePanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  function toggleMobileMenu() {
    const isOpen = mobilePanel.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  }

  function updateReadingProgress() {
    const article = document.querySelector(".article");
    if (!article) {
      readingProgress.style.width = "0";
      return;
    }
    const start = article.offsetTop - 100;
    const total = Math.max(1, article.offsetHeight - window.innerHeight + 180);
    const progress = Math.min(1, Math.max(0, (window.scrollY - start) / total));
    readingProgress.style.width = (progress * 100).toFixed(2) + "%";
  }

  function initArticleBehaviors() {
    if (tocObserver) tocObserver.disconnect();
    const tocLinks = Array.from(document.querySelectorAll("[data-toc-target]"));
    const headings = tocLinks
      .map(function (link) { return document.getElementById(link.dataset.tocTarget); })
      .filter(Boolean);

    if ("IntersectionObserver" in window && headings.length) {
      tocObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          tocLinks.forEach(function (link) {
            link.classList.toggle("active", link.dataset.tocTarget === entry.target.id);
          });
        });
      }, { rootMargin: "-16% 0px -72% 0px", threshold: 0 });
      headings.forEach(function (heading) { tocObserver.observe(heading); });
    }
  }

  /* =======================================================
     Events
     ======================================================= */
  document.addEventListener("click", function (event) {
    const copyCodeButton = event.target.closest("[data-copy-code]");
    if (copyCodeButton) {
      const code = copyCodeButton.closest(".code-block").querySelector("code");
      copyText(code.textContent);
      copyCodeButton.textContent = "已复制";
      window.setTimeout(function () { copyCodeButton.textContent = "复制"; }, 1400);
      return;
    }

    const copyLinkButton = event.target.closest("[data-copy-link]");
    if (copyLinkButton) {
      copyText(window.location.href);
      return;
    }

    const tocLink = event.target.closest("[data-toc-target]");
    if (tocLink) {
      event.preventDefault();
      const target = document.getElementById(tocLink.dataset.tocTarget);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const internalLink = event.target.closest('.prose a[href^="#"]');
    if (internalLink) {
      event.preventDefault();
      const target = document.getElementById(internalLink.getAttribute("href").slice(1));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const card = event.target.closest("[data-card-href]");
    if (card && !event.target.closest("a, button")) {
      window.location.hash = card.dataset.cardHref;
      return;
    }

    if (!event.target.closest(".mobile-panel") && !event.target.closest("#menuToggle")) {
      closeMobileMenu();
    }
  });

  menuToggle.addEventListener("click", toggleMobileMenu);

  navSearchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const q = navSearchInput.value.trim();
    goToArticles(q ? { q: q } : {});
  });

  mobileSearchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const q = mobileSearchInput.value.trim();
    goToArticles(q ? { q: q } : {});
  });

  document.addEventListener("keydown", function (event) {
    const target = event.target;
    const isTyping = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable;
    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      if (window.innerWidth > 860) {
        navSearchInput.focus();
      } else {
        mobilePanel.classList.add("open");
        menuToggle.setAttribute("aria-expanded", "true");
        mobileSearchInput.focus();
      }
    }
    if (event.key === "Escape") closeMobileMenu();
  });

  backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", function () {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(function () {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
      backToTop.classList.toggle("visible", window.scrollY > 520);
      updateReadingProgress();
      scrollTicking = false;
    });
  }, { passive: true });

  window.addEventListener("hashchange", function () {
    finishRoute();
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (event) {
    try {
      if (!localStorage.getItem(THEME_KEY)) applyTheme(event.matches ? "dark" : "light");
    } catch (error) {
      applyTheme(event.matches ? "dark" : "light");
    }
  });

  updateSiteChrome();
  finishRoute();
})();
