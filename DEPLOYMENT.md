# 部署与维护

正式网站：https://dsircity.top/  
仓库：https://github.com/DsirNG/ding-xiaodong-portfolio

## 当前部署

- 连接：`ssh dxd`。
- 工作目录：`/opt/ding-xiaodong-portfolio`。
- 独立容器：`ding-xiaodong-portfolio`，重启策略 `unless-stopped`。
- 当前镜像：`ding-xiaodong-portfolio:20261104`。
- 入口容器：`aural-nginx`，与现有音乐 API 共用 80/443，通过 server_name 隔离。
- 外部 Docker 网络：`aural_frontend`，作品集不额外暴露宿主机端口。
- 入口配置：`/opt/aural/app/deploy/selfhost/nginx.conf`。
- 初次部署前的入口备份：`/opt/ding-xiaodong-portfolio/ingress-original.conf`。

## HTTPS

证书路径 `/etc/letsencrypt/live/dsircity.top/`，初次证书到期日 2027-02-01。Certbot 已配置自动续期；deploy hook `/etc/letsencrypt/renewal-hooks/deploy/reload-portfolio-nginx.sh` 负责校验并重载入口。私钥只保留在服务器，不提交 Git。

HTTP 308 跳转到 HTTPS。当前只为根域名配置站点；未配置 www DNS 和证书前，不宣称支持 www。

## 更新

在本地运行 `npm ci`、`npm run build`，将 `dist/` 和 `deploy/` 上传到服务器工作目录。保留旧镜像标签，以新标签构建：

```sh
cd /opt/ding-xiaodong-portfolio
docker build -t ding-xiaodong-portfolio:RELEASE -f deploy/Dockerfile .
docker run --rm ding-xiaodong-portfolio:RELEASE nginx -t
```

确认镜像正确后，将当前容器改名保留作回滚，再用原名称启动新镜像并重新加载入口，使 Docker DNS 更新生效。短暂替换容器会产生维护窗口，应择时操作。后续也可使用 `docker compose -f deploy/compose.yaml up -d --build` 管理，首次切换前需处理同名旧容器。

修改共享入口前先备份当前文件。`deploy/https.conf` 是作品集新增的 server 配置片段，不得直接替换其他站点的配置。当前 `ingress-original.conf` 是首次部署备份，不应用于覆盖后续其他服务的修改。

## 验证

检查首页、/about/、两个 /projects/ 页面、/robots.txt 和 /sitemap.xml 返回 200；未知 URL 应返回 404，HTTP 应返回 308。验证 canonical、JSON-LD 和构建产物 JS/CSS 能加载。再检查原音乐 API 仍可访问。

## 回滚

将作品集容器替换为保留的上一版镜像，再运行 `docker exec aural-nginx nginx -t` 与 `docker exec aural-nginx nginx -s reload`。仅回退作品集相关的 server 块，不覆盖其他站点。不要删除证书或数据库。
