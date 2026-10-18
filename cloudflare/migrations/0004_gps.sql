-- ============================================================
-- 0004_gps.sql  GPS 车载里程快照
-- 数据来源：宁波镇海城运 GPS 平台（nbysgps.com:9999）
-- 由 Cloudflare Cron 定时拉取写入，前端 /api/gps/mileage 只读
-- ============================================================

-- 车辆档案（庄骆贵片区，48 辆）
CREATE TABLE IF NOT EXISTS gps_car (
  car_id     TEXT PRIMARY KEY,
  plate      TEXT NOT NULL,
  model      TEXT,
  cat        TEXT,              -- work / assess（皮卡+面包车归 assess）
  team       TEXT,
  updated_at TEXT NOT NULL
);

-- 逐车逐日里程（单位 km）
CREATE TABLE IF NOT EXISTS gps_mileage (
  day        TEXT    NOT NULL,  -- YYYY-MM-DD
  car_id     TEXT    NOT NULL,
  km         REAL    NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL,
  PRIMARY KEY (day, car_id)
);
CREATE INDEX IF NOT EXISTS idx_gps_mileage_day ON gps_mileage (day);

-- 逐车逐日出车/收车（ACC 点火统计，仅当日抓取）
CREATE TABLE IF NOT EXISTS gps_time (
  day        TEXT NOT NULL,     -- YYYY-MM-DD
  car_id     TEXT NOT NULL,
  start_hm   TEXT,              -- HH:MM 出车
  end_hm     TEXT,              -- HH:MM 收车（空表示无熄火记录）
  running    INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (day, car_id)
);

-- 同步元信息（最近一次成功时间、错误原因等）
CREATE TABLE IF NOT EXISTS gps_sync_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         TEXT NOT NULL,
  ok         INTEGER NOT NULL,
  message    TEXT,
  detail     TEXT
);
