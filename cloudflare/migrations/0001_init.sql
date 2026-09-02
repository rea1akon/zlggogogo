-- ============================================================
-- 0001_init.sql  初始化：9 张业务表 + 索引
-- 覆盖系统内"多类存储读写"场景：
--   ① 结构化业务数据（员工/车辆/物资/项目/养护台账）
--   ② 账号与会话（鉴权）
--   ③ 通用键值存储（KV，用于兜底承接前端 localStorage 多命名空间数据）
--   ④ 操作日志（审计）
-- ============================================================

-- ------------------------------------------------------------
-- 1. 用户账号
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  salt          TEXT    NOT NULL,
  display_name  TEXT,
  role          TEXT    NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','manager','operator','viewer')),
  area          TEXT,
  status        TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  last_login_at TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ------------------------------------------------------------
-- 2. 登录会话（Token 落库，可吊销）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  token      TEXT    NOT NULL,
  user_id    INTEGER NOT NULL,
  expires_at TEXT    NOT NULL,
  ip         TEXT,
  user_agent TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ------------------------------------------------------------
-- 3. 员工档案（原 HR 模块 localStorage 数据）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  gender          TEXT    CHECK (gender IN ('男','女')),
  id_card         TEXT,
  birth_date      TEXT,
  age             INTEGER,
  phone           TEXT,
  native_place    TEXT,
  position        TEXT,
  area            TEXT    CHECK (area IS NULL OR area IN ('片所本级','庄市','骆驼','贵驷')),
  employment_type TEXT    CHECK (employment_type IS NULL OR employment_type IN ('事业','企业','密集型','劳务派遣','劳务外包')),
  hire_date       TEXT,
  address         TEXT,
  remark          TEXT,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  deleted_at      TEXT
);
-- 软删除后身份证号可复用，故用部分唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_idcard ON employees(id_card) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_area ON employees(area, deleted_at);
CREATE INDEX IF NOT EXISTS idx_employees_type ON employees(employment_type, deleted_at);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);

-- ------------------------------------------------------------
-- 4. 车辆 / 污水车台账
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  plate_no          TEXT    NOT NULL,
  vehicle_type      TEXT    CHECK (vehicle_type IS NULL OR vehicle_type IN ('污水车','清扫车','洒水车','巡查车','工程车','其他')),
  model             TEXT,
  driver_name       TEXT,
  driver_phone      TEXT,
  area              TEXT    CHECK (area IS NULL OR area IN ('片所本级','庄市','骆驼','贵驷')),
  status            TEXT    NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','working','maintenance','scrapped')),
  mileage           INTEGER NOT NULL DEFAULT 0,
  last_maintain_at  TEXT,
  next_maintain_at  TEXT,
  remark            TEXT,
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  deleted_at        TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_no) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_area_status ON vehicles(area, status, deleted_at);

-- ------------------------------------------------------------
-- 5. 仓库物资
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouse_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT,
  name        TEXT    NOT NULL,
  category    TEXT,
  spec        TEXT,
  unit        TEXT,
  quantity    INTEGER NOT NULL DEFAULT 0,
  min_stock   INTEGER NOT NULL DEFAULT 0,
  unit_price  REAL    NOT NULL DEFAULT 0,
  location    TEXT,
  area        TEXT    CHECK (area IS NULL OR area IN ('片所本级','庄市','骆驼','贵驷')),
  remark      TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  deleted_at  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wh_code ON warehouse_items(code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wh_category ON warehouse_items(category, deleted_at);
CREATE INDEX IF NOT EXISTS idx_wh_shortage ON warehouse_items(quantity, min_stock);

-- ------------------------------------------------------------
-- 6. 工程项目
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT,
  name        TEXT    NOT NULL,
  category    TEXT    CHECK (category IS NULL OR category IN ('养护维修','改造提升','应急抢修','日常巡检','其他')),
  area        TEXT    CHECK (area IS NULL OR area IN ('片所本级','庄市','骆驼','贵驷')),
  status      TEXT    NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','ongoing','paused','done','archived')),
  manager     TEXT,
  contractor  TEXT,
  start_date  TEXT,
  end_date    TEXT,
  budget      REAL    NOT NULL DEFAULT 0,
  progress    INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  remark      TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  deleted_at  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_code ON projects(code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_area ON projects(area, deleted_at);

-- ------------------------------------------------------------
-- 7. 养护 / 业务台账记录
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  record_no   TEXT,
  record_type TEXT    CHECK (record_type IS NULL OR record_type IN ('管网疏通','井盖维修','道路养护','绿化养护','清淤','应急','其他')),
  area        TEXT    CHECK (area IS NULL OR area IN ('片所本级','庄市','骆驼','贵驷')),
  road_name   TEXT,
  content     TEXT,
  amount      REAL    NOT NULL DEFAULT 0,
  status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','rejected')),
  occurred_at TEXT,
  operator    TEXT,
  remark      TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_biz_type_date ON business_records(record_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_biz_area_status ON business_records(area, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_biz_operator ON business_records(operator);

-- ------------------------------------------------------------
-- 8. 通用键值存储（承接前端多命名空间 localStorage，value 存 JSON）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kv_store (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  namespace  TEXT    NOT NULL,
  key        TEXT    NOT NULL,
  value      TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kv_ns_key ON kv_store(namespace, key);

-- ------------------------------------------------------------
-- 9. 操作日志（审计）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operation_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor       TEXT,
  action      TEXT    NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  detail      TEXT,
  ip          TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_logs_target ON operation_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON operation_logs(created_at);
