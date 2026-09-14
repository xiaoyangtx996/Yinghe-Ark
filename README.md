<p align="center">
  <img src="./assets/readme/hero.png" width="100%" alt="影核 Ark — 从剧本到成片的开源 AI 影视 Studio">
</p>

<h1 align="center">影核 Ark</h1>

<p align="center">
  面向短剧与漫剧的开源 AI 创作台：解析文本、生成角色与场景、排分镜、配音并导出成片。
</p>

<p align="center">
  <sub>基于 <a href="https://github.com/waooAI/waoowaoo">waoowaoo</a> 二次开发</sub>
</p>

<p align="center">
  <a href="README_en.md">English</a>
  ·
  <a href="https://github.com/xiaoyangtx996/Yinghe-Ark/issues">Issues</a>
  ·
  <a href="https://github.com/xiaoyangtx996/Yinghe-Ark">GitHub</a>
</p>

<p align="center">
  <img src="./assets/readme/workflow.svg" width="100%" alt="制作管线：文本解析 → 角色场景 → 分镜 → 配音 → 成片">
</p>

---

## 它是什么

影核 Ark（Yinghe Ark）把「小说 / 剧本 → 可看短片」拆成可回看、可重跑的工作台阶段，而不是一次性黑盒出片。

| 阶段 | 你得到什么 |
| --- | --- |
| 文本解析 | 角色、场次、冲突与对白结构 |
| 角色与场景 | 可复用的一致性人物 / 场景资产 |
| 分镜排镜 | 可改提示词、可重跑单镜 |
| 配音与成片 | 多角色语音 + 镜头合成导出 |

---

## 功能一览

- **AI 剧本分析** — 从小说或草稿抽出角色、场景与剧情节点
- **角色 & 场景生成** — 跨镜头保持外貌与空间一致
- **分镜视频** — 文字转镜头，支持局部重跑
- **AI 配音** — 多角色语音合成
- **AI 剪辑** — 镜头编排与成片导出
- **资产中心** — 角色 / 场景 / 道具跨项目复用
- **厂商资源池** — 多模型、多服务商接入与默认模型配置
- **中英双语** — 界面一键切换

---

## 快速开始

**前提**：安装 [Docker Desktop](https://docs.docker.com/get-docker/)（方式一、二）或本机 Node 18+、MySQL、Redis、MinIO（方式三）。

### 方式一：拉取预构建镜像

```bash
curl -O https://raw.githubusercontent.com/xiaoyangtx996/Yinghe-Ark/main/docker-compose.yml
docker compose up -d
```

测试版数据库可能不兼容升级。升级前请先：

```bash
docker compose down -v
docker compose up -d
```

启动后建议清空浏览器缓存再登录。默认访问 [http://localhost:13000](http://localhost:13000)。

### 方式二：克隆仓库 + Docker 构建

```bash
git clone https://github.com/xiaoyangtx996/Yinghe-Ark.git
cd Yinghe-Ark
docker compose up -d
```

更新：

```bash
git pull
docker compose down && docker compose up -d --build
```

### 方式三：本地开发

```bash
git clone https://github.com/xiaoyangtx996/Yinghe-Ark.git
cd Yinghe-Ark

cp .env.example .env
# 编辑 .env：填入 AI API Key；按本机端口调整 MySQL / Redis / MinIO

npm install

# 若使用仓库自带 docker-compose 基础设施（宿主机端口见 .env.example）：
docker compose up mysql redis minio -d

npx prisma db push
npm run dev
```

> [!WARNING]
> 跳过 `npx prisma db push` 会导致表不存在（例如 `tasks`），启动后必报错。

开发模式默认访问 [http://localhost:3000](http://localhost:3000)。

若你本机已有 MySQL `3306` / Redis `6379`，可在 `.env` 中改端口，不必强行起 Docker 映射端口。

---

## API 配置

启动后进入**设置中心**配置各模型服务商的 API Key（内置配置引导）。

目前更推荐官方 API；第三方 OpenAI Compatible 仍在完善中。

---

## 技术栈

- **应用**：Next.js 15 · React 19 · Tailwind CSS v4
- **数据**：MySQL · Prisma
- **任务**：Redis · BullMQ
- **认证**：NextAuth.js
- **存储**：MinIO（S3 兼容）

---

## 产品预览

> 截图均使用仓库相对路径 `images/`，可在 GitHub 直接渲染；首次打开若较慢，请稍等图片加载完成。

### 创作工作台

从项目管理、故事与拆解、分镜与配音，到成片与资产中心，围绕短剧 / 漫剧组织为连续工作流。

<table>
  <tr>
    <td width="50%" align="center"><strong>我的项目</strong><br/><img src="./images/我的项目.png" alt="我的项目" width="100%"/></td>
    <td width="50%" align="center"><strong>故事页面</strong><br/><img src="./images/故事页面.png" alt="故事页面" width="100%"/></td>
  </tr>
  <tr>
    <td width="50%" align="center"><strong>拆解界面</strong><br/><img src="./images/拆解界面.png" alt="拆解界面" width="100%"/></td>
    <td width="50%" align="center"><strong>分镜管理</strong><br/><img src="./images/分镜管理.png" alt="分镜管理" width="100%"/></td>
  </tr>
  <tr>
    <td width="50%" align="center"><strong>分镜管理（细节）</strong><br/><img src="./images/分镜管理2.png" alt="分镜管理细节" width="100%"/></td>
    <td width="50%" align="center"><strong>配音</strong><br/><img src="./images/配音.png" alt="配音" width="100%"/></td>
  </tr>
  <tr>
    <td width="50%" align="center"><strong>成片</strong><br/><img src="./images/成片.png" alt="成片" width="100%"/></td>
    <td width="50%" align="center"><strong>成片管理</strong><br/><img src="./images/成片管理.png" alt="成片管理" width="100%"/></td>
  </tr>
  <tr>
    <td width="50%" align="center"><strong>资产中心</strong><br/><img src="./images/资产中心.png" alt="资产中心" width="100%"/></td>
    <td width="50%" align="center"><strong>AI 剪辑</strong><br/><img src="./images/Ai剪辑.png" alt="AI 剪辑" width="100%"/></td>
  </tr>
</table>

### 设置与运维

模型默认配置、厂商资源池、账户与用户设置，以及任务日志。

<table>
  <tr>
    <td width="50%" align="center"><strong>默认模型配置</strong><br/><img src="./images/默认模型配置.png" alt="默认模型配置" width="100%"/></td>
    <td width="50%" align="center"><strong>厂商资源池</strong><br/><img src="./images/厂商资源池.png" alt="厂商资源池" width="100%"/></td>
  </tr>
  <tr>
    <td width="50%" align="center"><strong>用户设置</strong><br/><img src="./images/用户设置.png" alt="用户设置" width="100%"/></td>
    <td width="50%" align="center"><strong>账户设置</strong><br/><img src="./images/账户设置.png" alt="账户设置" width="100%"/></td>
  </tr>
  <tr>
    <td width="50%" align="center" colspan="2"><strong>日志管理</strong><br/><img src="./images/日志管理.png" alt="日志管理" width="70%"/></td>
  </tr>
</table>

---

## 状态与参与

项目仍在快速迭代，欢迎通过 Issue 反馈问题与需求。

- 🐛 [提交 Bug](https://github.com/xiaoyangtx996/Yinghe-Ark/issues)
- 💡 [功能建议](https://github.com/xiaoyangtx996/Yinghe-Ark/issues)

---

## 鸣谢

本项目基于开源项目 [waoowaoo](https://github.com/waooAI/waoowaoo) 进行二次开发与能力扩展，感谢上游作者与社区。

---

<p align="center">
  <img src="./public/brand/logo-horizontal.png" alt="影核 Ark" height="40">
</p>
