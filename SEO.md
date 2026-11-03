# SEO 与上线配置

正式地址：https://dsircity.top/

## 已配置
- 首页中文姓名、职业标题、描述、canonical、分享预览和 Person / WebSite / ProfilePage 结构化数据。
- /about/、/projects/dinqor/、/projects/interactive-stories/ 提供静态 HTML，可从首页项目区直接访问。
- /robots.txt 和 /sitemap.xml；分享图片 /assets/creative-head.png。
- 404.html 标记 noindex；服务器必须返回真正的 404 状态码。

## 部署要求
运行 npm run build，将 dist 的全部内容上传至网站根目录。启用 HTTPS，确保上述目录地址返回对应 index.html。未知路径返回 404，不要统一返回首页。将 HTTP 和 www 域名重定向到 https://dsircity.top/，避免多个首页版本。

## 上线后
在 Google Search Console 与百度搜索资源平台验证域名所有权，提交 https://dsircity.top/sitemap.xml，并检查首页及各内容页的抓取情况。验证凭据必须使用真实平台分配的值。网站现已部署到 HTTPS 正式域名；尚未完成搜索平台所有权验证或索引提交。

技术配置不能保证搜索排名或一定收录。持续维护真实个人介绍、项目案例与来自真实渠道的指向本站的链接。

## 维护
修改个人介绍、项目内容或域名时，同步更新 index.html、i18n.js、public 下的内容页、robots.txt 与 sitemap.xml。当前语言切换共用一个 URL，不声明不存在的 hreflang 地址。
