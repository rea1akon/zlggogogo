# 庄骆贵一体化养护管理系统 · 云端版

Cloudflare **Pages（前端）+ Workers（后端）+ D1（数据库）** 全栈工程。
本地开发并验证通过 → 一次性推送 Git → Cloudflare 连接仓库自动构建部署。

---

## 一、架构

```
浏览器 ──► Cloudflare Pages (静态前端)
              │  /api 请求
              ▼
          Cloudflare Worker (REST API)
              │  D1 绑定
              ▼
          Cloudflare D1 (SQLite)
```

- 前端：Vite + 原生 ES Module，构建产物 `frontend/dist`
- 后端：单 Worker，模块路由，无第三方运行时依赖
- 数据：D1（SQLite 兼容），迁移脚本放在 `migrations/`
- 配置：统一由根目录 `wrangler.toml` 管理（Worker + D1 绑定 + 环境变量）

## 二、目录结构

```
cloudflare/
├── wrangler.toml              # Worker 与 D1 统一配置（唯一配置源）
├── package.json               # 全部依赖与脚本
├── .node-version              # Cloudflare Pages 构建用 Node 版本
├── .dev.vars.example          # Worker 本地密钥模板 → 复制为 .dev.vars
├── .env.example               # 前端环境变量模板 → 复制为 .env.local
├── .gitignore
├── migrations/
│   ├── 0001_init.sql          # 9 张表 + 索引
│   └── 0002_seed.sql          # 初始化账号与演示数据
├── worker/src/
│   ├── index.js               # 入口：CORS + 异常兜底
│   ├── router.js              # 路由分发
│   ├── resources.js           # 资源定义（字段白名单/校验规则）
│   ├── handlers/crud.js       # 通用增删改查
│   ├── handlers/kv.js         # 通用键值存储
│   └── lib/                   # 响应、错误、校验、鉴权、日志
├── frontend/
│   ├── index.html
│   ├── vite.config.js         # 含 /api → :8787 代理
│   └── src/                   # api.js / main.js / styles.css
└── scripts/
    ├── verify-api.mjs         # 59 项本地验证用例
    └── hash-password.mjs      # 生成管理员口令
```

## 三、本地启动

```bash
cd cloudflare
npm install

# 一次性：建立本地 D1 并写入表结构与初始数据
npm run db:migrate

# 同时启动后端(8787) + 前端(5173)
npm run dev
```

打开 http://localhost:5173 ，顶栏应显示「接口正常 · D1 已连接」。

只跑单个服务：

```bash
npm run dev:worker   # 仅后端 :8787
npm run dev:web      # 仅前端 :5173
```

## 四、数据表

| 表 | 用途 | 关键字段 |
|---|---|---|
| `users` | 账号 | username(唯一)、password_hash、salt、role、status |
| `sessions` | 登录会话 | token(唯一)、user_id、expires_at |
| `employees` | 员工档案 | name、id_card(唯一)、area、employment_type |
| `vehicles` | 车辆台账 | plate_no(唯一)、vehicle_type、status、mileage |
| `warehouse_items` | 仓库物资 | code(唯一)、quantity、min_stock、unit_price |
| `projects` | 工程项目 | code(唯一)、status、budget、progress |
| `business_records` | 养护台账 | record_no、record_type、amount、occurred_at |
| `kv_store` | 通用键值 | (namespace, key) 联合唯一，value 存 JSON |
| `operation_logs` | 操作审计 | actor、action、target_type、target_id |

共性：自增主键 `id`、时间戳 `created_at`/`updated_at`（ISO8601 UTC）、
业务表统一 `deleted_at` 软删除、按查询维度建索引、唯一键使用部分索引避免软删后冲突。

## 五、接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查（含 D1 连通性） |
| GET | `/api/meta` | 资源元数据，供前端动态渲染表单 |
| POST | `/api/auth/login` | 登录，返回 token |
| POST | `/api/auth/logout` | 登出（吊销 token） |
| GET | `/api/auth/me` | 当前登录用户 |
| GET | `/api/:resource` | 列表，支持 `limit` `offset` `q` `sort` `order` 及字段过滤 |
| POST | `/api/:resource` | 新增（需登录） |
| GET | `/api/:resource/:id` | 详情 |
| PUT | `/api/:resource/:id` | 更新（需登录） |
| DELETE | `/api/:resource/:id` | 软删除（需登录） |
| POST | `/api/:resource/bulk` | 批量新增，单事务，最多 200 条 |
| GET/PUT/DELETE | `/api/kv/:namespace/:key` | 通用键值读写（PUT 需登录） |
| GET | `/api/kv/:namespace` | 列出命名空间下所有键 |

`:resource` 取值：`employees` `vehicles` `items` `projects` `records`

统一响应：`{ ok: true, data, meta }` 或 `{ ok: false, error: { code, message, details } }`

## 六、本地验证

```bash
npm run verify                              # 默认对 :8787
API_BASE=http://localhost:5173 npm run verify   # 走前端代理链路验证
```

覆盖 9 组共 **59 项**：健康检查、鉴权（错误口令/未授权写/登出失效）、
写入落库、分页搜索过滤、更新与软删除、
异常输入（空体/非法 JSON/缺必填/枚举越界/手机号格式/未知字段/非法 id）、
错误处理（404/405/409 冲突/注入防护）、批量事务、KV 往返一致性、审计日志。

## 七、敏感配置处理

| 配置 | 本地 | 线上 | 是否入库 |
|---|---|---|---|
| Worker 密钥 | `.dev.vars`（由 `.dev.vars.example` 复制） | `npx wrangler secret put <KEY>` | ❌ 已 gitignore |
| 前端 API 地址 | `.env.local`（`VITE_API_BASE`） | Pages 控制台环境变量 | ❌ 已 gitignore |
| D1 数据库 ID | `wrangler.toml` 的 `database_id` | 同左 | ✅ 非敏感，可入库 |
| 允许跨域来源 | `wrangler.toml` 的 `ALLOWED_ORIGINS` | 同左 | ✅ 非敏感 |

**不要**把以下内容写进 `wrangler.toml` 或提交到 Git：账号口令、API Key、Token、证书私钥。

## 八、上线部署

### 1. 创建 D1 并填 ID

```bash
npx wrangler login
npm run db:create          # 输出 database_id
```

把输出的 `database_id` 填入 `wrangler.toml` **两处**：顶层 `[[d1_databases]]` 与 `[[env.production.d1_databases]]`。

```bash
npm run db:migrate:remote   # 在云端建表并写入初始数据
```

### 2. 部署 Worker

```bash
npm run deploy:worker
```

部署成功后得到 `https://zlg-maintenance-api.<子域>.workers.dev`，记下来给前端用。

### 3. 部署 Pages（连接 Git，推荐）

Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**：

| 配置项 | 值 |
|---|---|
| 仓库 | 你的仓库 |
| 生产分支 | `main` |
| Root directory | `cloudflare` |
| Framework preset | 无 / Vite |
| Build command | `npm run build` |
| Build output directory | `frontend/dist` |
| Node version | `20`（已由 `.node-version` 指定） |

环境变量：

| 变量 | 值 |
|---|---|
| `VITE_API_BASE` | `https://zlg-maintenance-api.<子域>.workers.dev/api` |
| `NODE_VERSION` | `20` |

保存后每次 `git push` 自动重新构建。

### 4. 可选：Worker 也接 Git 自动部署

Workers & Pages → **Create** → **Workers** → **Connect to Git**，
Root directory 填 `cloudflare`，Deploy command 填 `npx wrangler deploy`。

### 5. 上线后必做

```bash
npm run hash-password -- 新密码    # 生成 salt / hash
# 按输出的 SQL 在远端执行，替换默认 admin/zlg123
```

并把 `wrangler.toml` 中 `env.production.vars.ALLOWED_ORIGINS` 改为 Pages 正式域名。

## 九、Git 一次性推送

```bash
cd cloudflare
git add -A
git status        # 确认没有 node_modules/ .wrangler/ .dev.vars
git commit -m "feat: Cloudflare Pages + Workers + D1 全栈工程"

cd ..             # 回到仓库根目录
git add -A
git commit -m "chore: 接入云端全栈工程"
git remote add origin https://github.com/rea1akon/<仓库名>.git
git push -u origin main
```

推送后 Cloudflare 会自动拉取并构建。首次提交前务必确认：

```bash
git status --short | grep -E "node_modules|\.wrangler|\.dev\.vars|\.env\."   # 应无输出
```

## 十、安全提示

- 初始账号 `admin / zlg123` 仅供本地验证，**上线必须改密**
- 口令以 `SHA-256(salt:password)` 存储，不存明文；会话 token 落库且 12 小时过期
- 所有 SQL 走参数绑定，列名来自白名单，已通过注入用例验证
- 系统含身份证号、手机号等个人信息，建议 Pages 开启访问限制或仅内部使用
