# pipeline-frontend

基于 [Argo Workflows](https://argoproj.github.io/argo-workflows/) 的流水线平台前端，提供流水线可视化管理、DAG 画布编排、模板管理、制品管理、定时任务等功能。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 框架 | Vue 3 + TypeScript |
| 构建工具 | Vite |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| 流程画布 | Vue Flow |
| 代码编辑器 | Monaco Editor |
| 终端日志 | xterm.js |
| HTTP 请求 | Axios |

## 关联项目

流水线平台由多个仓库组成：

| 仓库 | 说明 |
| --- | --- |
| [pipeline-frontend](https://github.com/SeaYang/pipeline-frontend) | 流水线平台前端（本项目） |
| [pipeline-server](https://github.com/SeaYang/pipeline-server) | 流水线平台后端 |
| [pipeline-manifests](https://github.com/SeaYang/pipeline-manifests) | 流水线平台清单文件（Kubernetes 部署） |
| [cix-cli](https://github.com/SeaYang/cix-cli) | 基础命令行工具 |

> 📖 详细的系统使用说明请参阅 [用户手册](docs/user-guide.md)。

## 环境要求

- **Node.js**：`^20.19.0` 或 `>=22.12.0`（见 `package.json` 中的 `engines` 字段）
- **npm**：随 Node.js 安装（也可使用 pnpm / yarn）

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动后，终端会输出本地访问地址（默认 <http://localhost:5173>，如端口被占用会自动切换），在浏览器中打开该地址即可。

### 3. 后端代理配置

前端所有 API 请求以 `/api` 开头，Vite 开发服务器会自动将其代理到后端服务：

```
/api/demo/pod/log  →  http://localhost:9000/demo/pod/log
```

- 默认后端地址为 `http://localhost:9000`
- 如需指向其他后端地址，通过环境变量 `VITE_DEV_PROXY_TARGET` 指定：

```bash
# 方式一：命令行临时指定
VITE_DEV_PROXY_TARGET=http://192.168.1.100:9000 npm run dev

# 方式二：创建 .env.local 文件
echo 'VITE_DEV_PROXY_TARGET=http://192.168.1.100:9000' > .env.local
npm run dev
```

### 环境变量说明

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `VITE_DEV_PROXY_TARGET` | 开发环境下 Vite 代理的目标后端地址 | `http://localhost:9000` |
| `VITE_API_BASE_URL` | axios 实例的 baseURL（生产环境使用） | `/api` |
| `VITE_K8S_NAMESPACE` | 查询 Pod 日志时使用的默认命名空间 | `argo` |

## 打包构建

```bash
npm run build
```

该命令会先执行 TypeScript 类型检查（`vue-tsc`），再执行 Vite 构建，产物输出到 `dist/` 目录。

本地预览构建产物：

```bash
npm run preview
```

## 部署

### 方式一：Nginx 部署

#### 1. 构建产物

```bash
npm run build
```

将 `dist/` 目录中的所有文件上传到服务器的 Nginx 静态资源目录，例如：

```bash
# 将 dist 内容上传到服务器（示例路径，可自定义）
scp -r dist/* user@your-server:/usr/share/nginx/html/
```

> 具体目录取决于你的 Nginx 配置中的 `root` 指令，常见路径有 `/usr/share/nginx/html/`（默认）、`/var/www/html/` 等。

#### 2. Nginx 配置

参考项目根目录的 [nginx.conf](nginx.conf)，核心配置如下：

```nginx
server {
    listen       80;
    # server_name 是用户访问前端时使用的地址，填写你的域名或服务器 IP。
    # 例如：pipeline.example.com（域名）、192.168.1.50（IP）、localhost（本机）。
    # 如果只有一个站点，填 localhost 也可以正常访问。
    server_name  localhost;

    root   /usr/share/nginx/html;  # 指向 dist 目录内容所在的路径
    index  index.html;

    # Vue Router history 模式：所有路由回退到 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理：/api 开头的请求转发到后端服务
    # 注意：rewrite 会去掉 /api 前缀，与开发环境 Vite proxy 行为一致
    location /api/ {
        proxy_pass http://127.0.0.1:9000/;  # 替换为后端服务地址
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket 支持（日志流等）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }
}
```

#### 3. 后端地址配置说明

根据你的实际部署场景，修改 `proxy_pass` 中的后端地址：

| 场景 | proxy_pass 示例 |
| --- | --- |
| 同机部署 | `http://127.0.0.1:9000/` |
| 内网 IP | `http://192.168.1.100:9000/` |
| 域名访问 | `http://pipeline-api.example.com/` |

> **注意**：`proxy_pass` 末尾的 `/` 很重要，它确保 Nginx 会去掉 `/api` 前缀，例如 `/api/demo/list` → `http://后端/demo/list`。

### 方式二：Docker 部署

#### 1. 构建镜像

```bash
docker build -t pipeline-frontend:latest .
```

Dockerfile 采用多阶段构建：第一阶段用 Node.js 编译产物，第二阶段用 `nginx:alpine` 运行。

> **遇到网络问题？**
>
> Docker 构建时 `npm ci` 在**容器内部**执行，容器有独立的网络栈，**宿主机开 VPN / 代理对容器无效**。如果构建卡在 `RUN npm ci` 一直不动，需要通过 `--build-arg` 将代理传入容器。
>
> **关键点**：容器内不能用 `127.0.0.1` 访问宿主机，必须使用 `host.docker.internal`（Docker Desktop 提供的特殊域名，指向宿主机）。
>
> ```bash
> # 假设本机代理端口为 7897（Clash / V2Ray 等常见端口，按实际修改）
> docker build \
>   --build-arg HTTP_PROXY=socks5://host.docker.internal:7897 \
>   --build-arg HTTPS_PROXY=socks5://host.docker.internal:7897 \
>   --build-arg ALL_PROXY=socks5://host.docker.internal:7897 \
>   -t pipeline-frontend:latest .
> ```
>
> | 常见代理端口 | 软件 |
> | --- | --- |
> | `7897` | Clash Verge / ClashX |
> | `7890` | Clash 旧版默认 |
> | `1080` | V2Ray / Shadowsocks 默认 |
>
> 如果不确定本机代理端口，可在宿主机终端执行 `echo $https_proxy` 或查看代理软件设置。

#### 2. 运行容器

```bash
# 基本运行（默认后端地址 http://localhost:9000）
docker run -d --name pipeline-frontend -p 8090:80 pipeline-frontend:latest

# 指定后端服务地址
docker run -d --name pipeline-frontend \
  -p 8090:80 \
  -e BACKEND_URL=http://192.168.234.1:9000 \
  pipeline-frontend:latest
```

停止与删除容器：

```bash
# 停止容器
docker stop pipeline-frontend

# 停止并删除容器
docker rm -f pipeline-frontend
```

#### 3. Docker Compose 示例

```yaml
services:
  pipeline-frontend:
    image: pipeline-frontend:latest
    ports:
      - "80:80"
    environment:
      - BACKEND_URL=http://pipeline-server:9000  # 后端服务地址
    depends_on:
      - pipeline-server

  pipeline-server:
    image: pipeline-server:latest
    ports:
      - "9000:9000"
```

> 容器启动时会通过 `docker-entrypoint.sh` 读取 `BACKEND_URL` 环境变量，自动替换 `nginx.conf` 中的后端地址，无需重新构建镜像。

## 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run build-only` | 仅执行 Vite 构建（跳过类型检查） |
| `npm run type-check` | TypeScript 类型检查 |
| `npm run preview` | 本地预览构建产物 |
| `npm run format` | Prettier 格式化代码 |

## 项目结构

```
pipeline-frontend/
├── public/                 # 静态资源（favicon 等）
├── src/
│   ├── api/                # API 请求封装
│   ├── assets/             # 全局样式、图片
│   ├── components/         # 公共组件
│   │   ├── common/         #   通用组件（代码编辑器、Git 树选择等）
│   │   ├── flow/           #   流程画布组件（Argo DAG、任务节点等）
│   │   └── layout/         #   布局组件（侧栏、顶栏、主内容区）
│   ├── data/               # 静态数据
│   ├── layouts/            # 页面布局
│   ├── router/             # 路由配置
│   ├── stores/             # Pinia 状态管理
│   ├── utils/              # 工具函数（请求封装、认证、YAML 解析等）
│   └── views/              # 页面视图
│       ├── app-info/       #   应用管理
│       ├── argo/           #   Argo 原生页面
│       ├── artifact/       #   制品管理
│       ├── cron-job/       #   定时任务
│       ├── dict/           #   字典管理
│       ├── generic-config/ #   通用配置
│       ├── pipeline/       #   流水线管理
│       ├── pipeline-parameter/ # 流水线参数
│       ├── pipeline-template/  # 流水线模板
│       ├── task-template/  #   任务模板
│       └── template-event-bind/ # 模板事件绑定
├── docs/                   # 项目文档
│   └── user-guide.md       #   用户手册
├── Dockerfile              # Docker 构建文件
├── nginx.conf              # Nginx 配置模板
└── vite.config.ts          # Vite 配置
```
