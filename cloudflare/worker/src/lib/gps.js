// GPS 平台对接：登录 + 逐车逐日里程 + ACC 出车时间
// 平台：http://www.nbysgps.com:9999/gps-web/api（灰云自有服务器，Worker 可直连任意端口）

const BASE = 'http://www.nbysgps.com:9999/gps-web/api';
const TEAM = '庄骆贵片区';

function decode(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('gbk').decode(buf);
  }
}

async function api(path, params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { 'User-Agent': 'zlg-maintenance-worker/1.0' },
  });
  if (!res.ok) throw new Error(`GPS ${path} HTTP ${res.status}`);
  const text = decode(await res.arrayBuffer());
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GPS ${path} 返回非 JSON：${text.slice(0, 120)}`);
  }
}

/** 登录拿 sessionId（文档：只要不改密码，一直有效） */
export async function login(env) {
  const user = env.GPS_USER;
  const pass = env.GPS_PASS;
  if (!user || !pass) throw new Error('缺少 GPS_USER / GPS_PASS 密钥');
  const d = await api('/login.jsp', { userId: user, password: pass, loginType: 'user' });
  if (!d.sessionId) throw new Error(`GPS 登录失败：${d.rspDesc || '无 sessionId'}`);
  return d.sessionId;
}

/** 取庄骆贵片区车辆档案 */
export async function fetchCars(sid) {
  const d = await api('/get_car_list.jsp', { sessionId: sid });
  const list = d.list || [];
  return list
    .filter((c) => String(c.teamName || '').trim() === TEAM)
    .map((c) => {
      const model = String(c.carName || '').trim();
      const assess = model.includes('皮卡') || model.includes('面包车');
      return {
        carId: String(c.carId),
        plate: c.carPlate || '',
        model,
        cat: assess ? 'assess' : 'work',
        team: TEAM,
      };
    })
    .sort((a, b) => a.plate.localeCompare(b.plate, 'zh-CN'));
}

/** 区间逐车逐日里程：一次请求拿整段（月为单位最划算），返回 [{day, carId, km}] */
export async function fetchMileage(sid, carIds, startDate, endDate) {
  const d = await api('/get_gps_mile_day_ext.jsp', {
    carIds: carIds.join(','),
    startDate,
    endDate,
    sessionId: sid,
  });
  const rows = [];
  for (const item of d.list || []) {
    const carId = String(item.carId);
    for (const dm of item.dayMileList || []) {
      const km = Number(dm.mile) || 0;
      if (km > 0) rows.push({ day: dm.name, carId, km: Math.round(km * 10) / 10 });
    }
  }
  return rows;
}

/** 单车当日 ACC 明细 → 出车/收车时间 */
export async function fetchAccTime(sid, carId, day) {
  const d = await api('/rpt_acc_stat.jsp', {
    carId,
    startTime: `${day}000000`,
    endTime: `${day}235959`,
    sessionId: sid,
  });
  const seg = (d.data && d.data.details) || [];
  if (!seg.length) return null;
  seg.sort((a, b) => String(a.stime || '').localeCompare(String(b.stime || '')));
  const start = String(seg[0].stime || '').slice(11, 16);
  const closed = seg.filter((x) => x.ison === false);
  if (closed.length) {
    return { start, end: String(closed[closed.length - 1].etime || '').slice(11, 16), running: 0 };
  }
  return { start, end: '', running: 1 };
}

/** 北京时间（UTC+8）的日期与小时 */
export function beijingNow() {
  const t = new Date(Date.now() + 8 * 3600 * 1000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, '0');
  const d = String(t.getUTCDate()).padStart(2, '0');
  return {
    date: `${y}-${m}-${d}`,
    ymd: `${y}${m}${d}`,
    hour: t.getUTCHours(),
    min: t.getUTCMinutes(),
    iso: t.toISOString().replace('Z', '+08:00'),
  };
}

/** 昨天 / N 天前（北京时间） */
export function shiftDay(ymd, delta) {
  const y = +ymd.slice(0, 4), m = +ymd.slice(4, 6), d = +ymd.slice(6, 8);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return (
    t.getUTCFullYear() +
    String(t.getUTCMonth() + 1).padStart(2, '0') +
    String(t.getUTCDate()).padStart(2, '0')
  );
}

export function dash(ymd) {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}
