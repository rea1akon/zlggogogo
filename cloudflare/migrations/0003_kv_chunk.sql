-- 0003: 大值分片存储
-- 原因：D1 单条 SQL 绑定参数上限约 100KB，而业务数据（员工/车辆照片 base64）
--       单条 JSON 可达数 MB，必须切分后存储。
-- 约定：小值(<=48KB)仍存 kv_store；大值存 kv_chunk 分片，kv_store 中不留记录。

CREATE TABLE IF NOT EXISTS kv_chunk (
  namespace   TEXT    NOT NULL,
  key         TEXT    NOT NULL,
  chunk_index INTEGER NOT NULL,
  data        TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL,
  PRIMARY KEY (namespace, key, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_kv_chunk_ns_key ON kv_chunk(namespace, key);
