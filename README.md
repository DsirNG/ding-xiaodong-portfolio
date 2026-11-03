# 丁晓东 · Ding Xiaodong

[个人网站与作品集](https://dsircity.top/) · [关于丁晓东](https://dsircity.top/about/) · [DinQorAI](https://dsircity.top/projects/dinqor/) · [互动叙事](https://dsircity.top/projects/interactive-stories/)

丁晓东的个人网站与前端作品集，探索 React、Vue、WebGL、创意编程、AI 产品和互动叙事。网站使用立体字、弹性钥匙扣和软体纸袋呈现交互体验，核心个人介绍与项目内容同时提供静态 HTML。

## 本地开发

需要支持 Vite 7 的 Node.js（建议 Node.js 22 LTS）。

```sh
npm ci
npm run dev
npm run build
npm run preview
```

## 内容与结构

- `index.html`：首页正文、元数据和个人结构化数据。
- `title-hover.js`：逐字入场、鼠标位置交互、钥匙扣落下与回收。
- `softbag-three.js`：WebGL 纸袋模型。
- `public/about/`、`public/projects/`：无需 JavaScript 即可阅读的介绍和项目页面。
- `public/robots.txt`、`public/sitemap.xml`：抓取入口。
- `deploy/`：容器与 Nginx 配置。

正式域名为 **https://dsircity.top/**。页面身份信息以“丁晓东 / Ding Xiaodong”为准，不填充虚假履历或外部账号。

[SEO 配置与收录说明](SEO.md) · [服务器部署、更新与回滚](DEPLOYMENT.md)

README 中的公开链接有助于发现网站，但 GitHub 不负责保证搜索引擎收录或姓名搜索排名。
