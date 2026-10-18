// GPS 数据同步与查询
//   syncGps(env)          —— Cron 调用：拉 GPS → 写 D1
//   getMileage(env, url)  —— 前端只读：按月份返回逐车逐日里程

import {
  login, fetchCars, fetchMileage, fetchAccTime,
  beijingNow, shiftDay,
} from '../lib/gps.js';

const BACKFILL_FROM = '20260101'; // 首次同步的回溯起点

// 惰性建表：走 Worker 自身的 D1 绑定，无需 wrangler d1 migration 权限
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  const ddl = [
    `CREATE TABLE IF NOT EXISTS gps_car (
       car_id TEXT PRIMARY KEY, plate TEXT NOT NULL, model TEXT,
       cat TEXT, team TEXT, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS gps_mileage (
       day TEXT NOT NULL, car_id TEXT NOT NULL, km REAL NOT NULL DEFAULT 0,
       updated_at TEXT NOT NULL, PRIMARY KEY (day, car_id))`,
    `CREATE INDEX IF NOT EXISTS idx_gps_mileage_day ON gps_mileage (day)`,
    `CREATE TABLE IF NOT EXISTS gps_time (
       day TEXT NOT NULL, car_id TEXT NOT NULL, start_hm TEXT, end_hm TEXT,
       running INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
       PRIMARY KEY (day, car_id))`,
    `CREATE TABLE IF NOT EXISTS gps_sync_log (
       id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL,
       ok INTEGER NOT NULL, message TEXT, detail TEXT)`,
  ];
  for (const sql of ddl) await env.DB.prepare(sql).run();
  schemaReady = true;
}

async function chunkBatch(env, stmts, size = 60) {
  for (let i = 0; i < stmts.length; i += size) {
    await env.DB.batch(stmts.slice(i, i + size));
  }
}

async function logSync(env, ok, message, detail) {
  try {
    await env.DB.prepare(
      'INSERT INTO gps_sync_log (at, ok, message, detail) VALUES (?, ?, ?, ?)'
    ).bind(new Date().toISOString(), ok ? 1 : 0, message || '', detail ? String(detail).slice(0, 500) : '').run();
  } catch { /* 日志失败不影响主流程 */ }
}

/** 主同步流程 */
export async function syncGps(env, opts = {}) {
  const now = beijingNow();
  const out = { at: now.iso, cars: 0, rows: 0, acc: 0, backfill: false };

  try {
    await ensureSchema(env);
    const sid = await login(env);
    const cars = await fetchCars(sid);
    if (!cars.length) throw new Error('未取到庄骆贵片区车辆');
    out.cars = cars.length;

    const iso = new Date().toISOString();
    await chunkBatch(env, cars.map((c) =>
      env.DB.prepare(
        `INSERT INTO gps_car (car_id, plate, model, cat, team, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(car_id) DO UPDATE SET
           plate=excluded.plate, model=excluded.model, cat=excluded.cat,
           team=excluded.team, updated_at=excluded.updated_at`
      ).bind(c.carId, c.plate, c.model, c.cat, c.team, iso)
    ));

    const ids = cars.map((c) => c.carId);

    // 同步窗口：默认今天 + 昨天（平台会重算最近一天）；DB 为空或强制时全量回溯
    const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM gps_mileage').first();
    const empty = !cnt || !cnt.n;
    const ranges = [];
    if (empty || opts.full) {
      out.backfill = true;
      let cursor = BACKFILL_FROM;
      while (cursor <= now.ymd) {
        const y = +cursor.slice(0, 4), m = +cursor.slice(4, 6);
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const end = shiftDay(cursor, last - +cursor.slice(6, 8));
        const stop = end > now.ymd ? now.ymd : end;
        ranges.push([cursor, stop]);
        cursor = shiftDay(stop, 1);
      }
    } else {
      ranges.push([shiftDay(now.ymd, -1), now.ymd]);
    }

    const stmts = [];
    for (const [s, e] of ranges) {
      const rows = await fetchMileage(sid, ids, s, e);
      out.rows += rows.length;
      for (const r of rows) {
        stmts.push(
          env.DB.prepare(
            `INSERT INTO gps_mileage (day, car_id, km, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(day, car_id) DO UPDATE SET km=excluded.km, updated_at=excluded.updated_at`
          ).bind(r.day, r.carId, r.km, iso)
        );
      }
    }
    await chunkBatch(env, stmts);

    // ACC 出车时间：仅今天、只查当日有里程的车（控制子请求数，免费版单次上限 50）
    // 回溯补数据时不取 ACC，避免超限
    const wantAcc = !out.backfill && (opts.acc || (now.min < 20 && now.hour % 2 === 0));
    if (wantAcc && now.hour >= 7 && now.hour <= 21) {
      const activeIds = new Set(
        (await env.DB.prepare('SELECT car_id FROM gps_mileage WHERE day = ?').bind(now.date).all())
          .results.map((r) => r.car_id)
      );
      const targets = cars.filter((c) => activeIds.has(c.carId)).slice(0, 40);
      const accStmts = [];
      const results = await Promise.all(
        targets.map((c) => fetchAccTime(sid, c.carId, now.date).catch(() => null))
      );
      results.forEach((t, i) => {
        if (!t) return;
        accStmts.push(
          env.DB.prepare(
            `INSERT INTO gps_time (day, car_id, start_hm, end_hm, running, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(day, car_id) DO UPDATE SET
               start_hm=excluded.start_hm, end_hm=excluded.end_hm,
               running=excluded.running, updated_at=excluded.updated_at`
          ).bind(now.date, targets[i].carId, t.start, t.end, t.running, iso)
        );
      });
      await chunkBatch(env, accStmts);
      out.acc = accStmts.length;
    }

    await logSync(env, true, 'ok', JSON.stringify(out));
    return out;
  } catch (err) {
    await logSync(env, false, err.message, err.stack);
    throw err;
  }
}

/** 前端查询：GET /api/gps/mileage?month=YYYY-MM */
export async function getMileage(env, url) {
  const now = beijingNow();
  let month = url.searchParams.get('month') || now.date.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) month = now.date.slice(0, 7);

  await ensureSchema(env);

  const [carRows, monthRows, timeRows, rangeRow, monthList, syncRow, lastLog] = await Promise.all([
    env.DB.prepare('SELECT car_id, plate, model, cat FROM gps_car ORDER BY plate').all(),
    env.DB.prepare(
      'SELECT day, car_id, km FROM gps_mileage WHERE day >= ? AND day <= ? ORDER BY day'
    ).bind(`${month}-01`, `${month}-31`).all(),
    env.DB.prepare(
      'SELECT day, car_id, start_hm, end_hm, running FROM gps_time WHERE day >= ? AND day <= ?'
    ).bind(`${month}-01`, `${month}-31`).all(),
    env.DB.prepare('SELECT MIN(day) AS minDay, MAX(day) AS maxDay FROM gps_mileage').first(),
    env.DB.prepare('SELECT DISTINCT substr(day, 1, 7) AS m FROM gps_mileage ORDER BY m').all(),
    env.DB.prepare('SELECT at FROM gps_sync_log WHERE ok = 1 ORDER BY id DESC LIMIT 1').first(),
    env.DB.prepare('SELECT at, ok, message FROM gps_sync_log ORDER BY id DESC LIMIT 1').first(),
  ]);

  const days = {};
  for (const r of monthRows.results || []) {
    (days[r.day] || (days[r.day] = {}))[r.car_id] = r.km;
  }
  const times = {};
  for (const r of timeRows.results || []) {
    (times[r.day] || (times[r.day] = {}))[r.car_id] = [r.start_hm || '', r.end_hm || '', r.running];
  }

  return {
    month,
    cars: (carRows.results || []).map((c) => ({
      carId: c.car_id, plate: c.plate, model: c.model, cat: c.cat,
    })),
    days,
    times,
    months: (monthList.results || []).map((x) => x.m),
    minDay: rangeRow ? rangeRow.minDay : null,
    maxDay: rangeRow ? rangeRow.maxDay : null,
    syncedAt: syncRow ? syncRow.at : null,
    lastSync: lastLog ? { at: lastLog.at, ok: !!lastLog.ok, message: lastLog.message || '' } : null,
  };
}
