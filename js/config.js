/**
 * 个人博客内容配置
 * 修改这里即可更新站点身份、导航信息和文章索引。
 */
const SITE_CONFIG = {
  name: "Reed",
  englishName: "REED",
  initials: "RE",
  title: "Reed 的个人博客",
  tagline: "PRODUCT · CODE · LIFE",
  description: "独立开发者与产品设计师。记录代码、产品、阅读，以及生活里那些值得停一下的瞬间。",
  hero: {
    eyebrow: "PERSONAL NOTEBOOK / 2026",
    titleTop: "把复杂的事，",
    titleAccent: "讲得清楚一点。",
    intro: "这里是我的数字书房。写产品思考，也写下技术笔记；偶尔聊聊阅读、城市和那些没有 KPI 的下午。",
    primaryAction: "开始阅读",
    secondaryAction: "认识我"
  },
  aboutPreview: "你好，我是 Reed。白天做产品与前端，晚上写一点不一定有用的东西。",
  location: "Shanghai, China",
  email: "hello@example.com",
  since: "2022",
  currentFocus: "Building thoughtful products with code.",
  socials: [
    { name: "GitHub", url: "https://github.com/" },
    { name: "即刻", url: "https://okjike.com/" },
    { name: "邮件", url: "mailto:hello@example.com" }
  ],
  footerDescription: "写代码，也写那些值得被记住的小事。",
  posts: [
    {
      slug: "design-system-for-solo-product",
      title: "一个人做产品，为什么也要先搭设计系统",
      date: "2026-10-28",
      updated: "2026-11-02",
      category: "产品设计",
      tags: ["设计系统", "产品", "独立开发"],
      excerpt: "小团队做产品，设计系统常被误以为是“大公司的仪式感”。实际上，它更像一份写给自己未来的说明书：减少犹豫，让每个新页面都更快抵达。",
      readingTime: 8,
      featured: true,
      theme: "blue"
    },
    {
      slug: "ai-in-my-daily-workflow",
      title: "把 AI 放进日常开发后，我的工作流变了什么",
      date: "2026-10-16",
      category: "工程实践",
      tags: ["AI", "工作流", "效率"],
      excerpt: "AI 最有价值的时刻，往往不是替你写出全部代码，而是把问题拆小、把上下文补齐，让你更快进入可以判断的状态。",
      readingTime: 7,
      theme: "cyan"
    },
    {
      slug: "reading-notes-attention",
      title: "慢读笔记：把注意力还给自己",
      date: "2026-09-30",
      category: "阅读随记",
      tags: ["阅读", "注意力", "生活"],
      excerpt: "快速读完一本书，不等于拥有它。最近重新练习慢慢阅读，让句子有机会在脑海里多停留一会儿。",
      readingTime: 5,
      theme: "amber"
    },
    {
      slug: "publish-blog-with-github-pages",
      title: "用 Markdown 和 GitHub Pages，搭建一个轻博客",
      date: "2026-09-18",
      category: "技术手记",
      tags: ["GitHub Pages", "Markdown", "静态网站"],
      excerpt: "不引入框架，也不维护数据库。只用 HTML、CSS、JavaScript 和几份 Markdown 文件，做一个真正属于自己的写作空间。",
      readingTime: 9,
      theme: "indigo"
    },
    {
      slug: "a-coffee-walk-in-shanghai",
      title: "周末散步：在上海找一杯不赶时间的咖啡",
      date: "2026-08-24",
      category: "城市生活",
      tags: ["上海", "咖啡", "散步"],
      excerpt: "从武康路拐进一条不知名的小巷，太阳落在旧房子的窗台上。城市最好的部分，常常不在导航推荐的终点。",
      readingTime: 5,
      theme: "rose"
    },
    {
      slug: "small-details-of-web-typography",
      title: "网页排版里的五个小细节，让阅读自然发生",
      date: "2026-08-08",
      category: "产品设计",
      tags: ["排版", "CSS", "体验设计"],
      excerpt: "行高、字宽、段落间距、对比度和留白，看似只是 CSS 里的数字，却决定了读者愿不愿意继续往下读。",
      readingTime: 6,
      theme: "green"
    }
  ]
};
