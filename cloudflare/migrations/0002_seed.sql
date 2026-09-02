-- ============================================================
-- 0002_seed.sql  初始化演示数据（可安全重跑，均使用 INSERT OR IGNORE）
--
-- ⚠️ 安全提示：
--    内置账号 admin / zlg123 仅用于本地联调与首次验证。
--    正式上线前必须改密：npm run hash-password -- 新密码
--    然后把生成的 salt / hash 更新到 users 表，或执行：
--    wrangler d1 execute zlg_maintenance_db --remote --command \
--      "UPDATE users SET salt='<salt>', password_hash='<hash>' WHERE username='admin'"
-- ============================================================

-- 管理员账号（密码: zlg123）
INSERT OR IGNORE INTO users (username, password_hash, salt, display_name, role, area, status)
VALUES (
  'admin',
  'a0d94f13980f0a9bce3f34598897c71b8130a9837e603befef5f3af77fe6c546',
  'zlg-init-salt-2026',
  '系统管理员',
  'admin',
  '片所本级',
  'active'
);

-- 普通操作员（密码: zlg123）
INSERT OR IGNORE INTO users (username, password_hash, salt, display_name, role, area, status)
VALUES (
  'operator',
  'a0d94f13980f0a9bce3f34598897c71b8130a9837e603befef5f3af77fe6c546',
  'zlg-init-salt-2026',
  '片区操作员',
  'operator',
  '庄市',
  'active'
);

-- 员工示例
INSERT OR IGNORE INTO employees (name, gender, id_card, birth_date, age, phone, native_place, position, area, employment_type, hire_date)
VALUES
  ('张建国', '男', '330211197505123456', '1975-05-12', 51, '13805740001', '浙江宁波', '管网养护工', '片所本级', '事业', '2010-03-01'),
  ('李秀英', '女', '330211198203084567', '1982-03-08', 44, '13805740002', '浙江宁波', '资料管理员', '庄市', '企业', '2015-07-15'),
  ('王志强', '男', '330211199011206789', '1990-11-20', 35, '13805740003', '安徽阜阳', '污水车驾驶员', '骆驼', '劳务派遣', '2020-05-06');

-- 车辆示例
INSERT OR IGNORE INTO vehicles (plate_no, vehicle_type, model, driver_name, driver_phone, area, status, mileage, last_maintain_at, next_maintain_at)
VALUES
  ('浙B12345', '污水车', '东风天龙', '王志强', '13805740003', '骆驼', 'working', 86230, '2026-06-01', '2026-12-01'),
  ('浙B67890', '清扫车', '福田奥铃', '陈明', '13805740004', '庄市', 'idle', 41200, '2026-07-10', '2027-01-10'),
  ('浙B24680', '巡查车', '大众途观', '赵伟', '13805740005', '贵驷', 'maintenance', 120500, '2026-08-20', '2027-02-20');

-- 物资示例
INSERT OR IGNORE INTO warehouse_items (code, name, category, spec, unit, quantity, min_stock, unit_price, location, area)
VALUES
  ('WJ-001', '球墨铸铁井盖', '井盖', 'Φ700', '套', 120, 30, 380.00, 'A区货架1', '片所本级'),
  ('WJ-002', 'PVC排水管', '管材', 'DN300', '米', 480, 100, 45.50, 'B区管材区', '骆驼'),
  ('WJ-003', '反光锥', '安全防护', '70cm', '个', 26, 50, 22.00, 'C区', '贵驷');

-- 项目示例
INSERT OR IGNORE INTO projects (code, name, category, area, status, manager, contractor, start_date, end_date, budget, progress)
VALUES
  ('XM-2026-001', '庄市片区雨水管网清淤工程', '养护维修', '庄市', 'ongoing', '张建国', '宁波市政工程公司', '2026-03-01', '2026-11-30', 680000, 62),
  ('XM-2026-002', '骆驼片区道路井盖更换', '改造提升', '骆驼', 'planned', '李秀英', '镇海建设集团', '2026-10-01', '2027-01-31', 320000, 0);

-- 养护台账示例
INSERT OR IGNORE INTO business_records (record_no, record_type, area, road_name, content, amount, status, occurred_at, operator)
VALUES
  ('YH-20260801-001', '管网疏通', '庄市', '庄市大道', 'K1+200 至 K1+800 段雨水管疏通', 8600.00, 'done', '2026-08-01', '张建国'),
  ('YH-20260815-002', '井盖维修', '骆驼', '骆驼街道', '破损井盖更换 5 套', 2400.00, 'processing', '2026-08-15', '王志强');

-- 前端通用键值存储示例（演示多命名空间读写）
INSERT OR IGNORE INTO kv_store (namespace, key, value) VALUES
  ('ui-preferences', 'theme', '{"mode":"dark","accent":"#4fc3f7"}'),
  ('ui-preferences', 'sidebar', '{"collapsed":false}'),
  ('draft-forms', 'employee-draft', '{"name":"","area":"庄市"}');
