#!/usr/bin/env node
/**
 * 本地验证脚本：连通性 / 读写落库 / 异常输入 / 错误处理
 * 用法：先 npm run dev:worker，再 npm run verify
 *      或指定地址：API_BASE=http://127.0.0.1:8787 npm run verify
 */
import crypto from 'node:crypto';

const BASE = (process.env.API_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const RUN = crypto.randomBytes(3).toString('hex'); // 保证可重复运行
const NUM4 = String(Math.floor(Math.random() * 9000) + 1000); // 纯数字，用于身份证号

let passed = 0;
let failed = 0;
const failures = [];

const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  ${C.green('✓')} ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ${C.red('✗')} ${name}${detail ? C.gray(` → ${detail}`) : ''}`);
  }
}

function section(title) {
  console.log(`\n${C.cyan('▸')} ${title}`);
}

async function req(path, { method = 'GET', body, token, raw } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return { status: 0, body: { ok: false, error: { code: 'NETWORK', message: err.message } } };
  }
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body: json };
}

async function main() {
  console.log(C.cyan(`\n═══ Cloudflare Worker + D1 本地验证 ═══`));
  console.log(C.gray(`目标地址: ${BASE}   运行批次: ${RUN}\n`));

  // ---------------------------------------------------------------
  section('1. 基础连通');
  // ---------------------------------------------------------------
  const health = await req('/api/health');
  check('健康检查返回 200', health.status === 200, `status=${health.status}`);
  check('D1 连接状态为 connected', health.body?.data?.db === 'connected', JSON.stringify(health.body?.data));

  const meta = await req('/api/meta');
  check('资源元数据可用', meta.status === 200 && Array.isArray(meta.body?.data?.resources));
  check(
    '元数据包含 5 类业务资源',
    ['employees', 'vehicles', 'items', 'projects', 'records'].every((k) =>
      meta.body?.data?.resources?.some((r) => r.key === k)
    )
  );

  const notFound = await req('/api/does-not-exist');
  check('未知接口返回 404', notFound.status === 404, `status=${notFound.status}`);

  // ---------------------------------------------------------------
  section('2. 鉴权');
  // ---------------------------------------------------------------
  const badLogin = await req('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'wrong-pwd' },
  });
  check('错误密码返回 401', badLogin.status === 401, `status=${badLogin.status}`);
  check('错误码为 UNAUTHORIZED', badLogin.body?.error?.code === 'UNAUTHORIZED');

  const login = await req('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'zlg123' },
  });
  check('正确密码登录成功', login.status === 200 && !!login.body?.data?.token, JSON.stringify(login.body));
  const token = login.body?.data?.token;

  const me = await req('/api/auth/me', { token });
  check('携带 token 可获取当前用户', me.status === 200 && me.body?.data?.user?.username === 'admin');

  const noTokenWrite = await req('/api/employees', {
    method: 'POST',
    body: { name: '未授权测试' },
  });
  check('未登录写操作返回 401', noTokenWrite.status === 401, `status=${noTokenWrite.status}`);

  // ---------------------------------------------------------------
  section('3. 写入与落库（员工）');
  // ---------------------------------------------------------------
  const empName = `测试员工-${RUN}`;
  const created = await req('/api/employees', {
    method: 'POST',
    token,
    body: {
      name: empName,
      gender: '男',
      id_card: `33021119900101${NUM4}`,
      birth_date: '1990-01-01',
      age: 36,
      phone: '13805740099',
      position: '管网养护工',
      area: '庄市',
      employment_type: '劳务派遣',
      hire_date: '2024-01-15',
    },
  });
  check('新增员工返回 201', created.status === 201, `status=${created.status} ${JSON.stringify(created.body)}`);
  const empId = created.body?.data?.id;
  check('返回自增主键 id', Number.isInteger(empId), `id=${empId}`);
  check('created_at / updated_at 已生成', !!created.body?.data?.created_at && !!created.body?.data?.updated_at);
  check('deleted_at 默认为空', created.body?.data?.deleted_at === null);

  const refetch = await req(`/api/employees/${empId}`);
  check('按 id 回查数据一致', refetch.body?.data?.name === empName, JSON.stringify(refetch.body?.data));
  check('落库字段完整（片区/用工性质）', refetch.body?.data?.area === '庄市' && refetch.body?.data?.employment_type === '劳务派遣');

  // ---------------------------------------------------------------
  section('4. 查询能力');
  // ---------------------------------------------------------------
  const listRes = await req('/api/employees?limit=5&offset=0&sort=id&order=desc');
  check('列表返回分页元信息', typeof listRes.body?.meta?.total === 'number', JSON.stringify(listRes.body?.meta));
  check('最新创建的记录排在首位', listRes.body?.data?.[0]?.name === empName);

  const searchRes = await req(`/api/employees?q=${encodeURIComponent(empName)}`);
  check('关键字搜索命中', searchRes.body?.meta?.total >= 1 && searchRes.body?.data?.[0]?.name === empName);

  const filterRes = await req('/api/employees?area=骆驼&employment_type=劳务派遣');
  check('字段过滤生效（仅返回骆驼片区劳务派遣）',
    filterRes.body?.data?.every((r) => r.area === '骆驼' && r.employment_type === '劳务派遣'),
    JSON.stringify(filterRes.body?.data?.map((r) => [r.name, r.area]))
  );

  // ---------------------------------------------------------------
  section('5. 更新与软删除');
  // ---------------------------------------------------------------
  const updated = await req(`/api/employees/${empId}`, {
    method: 'PUT',
    token,
    body: { position: '班组长', age: 37 },
  });
  check('更新返回 200', updated.status === 200, `status=${updated.status}`);
  check('更新字段已生效', updated.body?.data?.position === '班组长' && updated.body?.data?.age === 37);
  check('未提交字段保持不变', updated.body?.data?.name === empName);
  check('updated_at 已刷新', updated.body?.data?.updated_at >= created.body?.data?.updated_at);

  const del = await req(`/api/employees/${empId}`, { method: 'DELETE', token });
  check('删除返回 200', del.status === 200);
  const afterDel = await req(`/api/employees/${empId}`);
  check('删除后查询返回 404（软删除生效）', afterDel.status === 404, `status=${afterDel.status}`);

  // ---------------------------------------------------------------
  section('6. 异常输入与错误处理');
  // ---------------------------------------------------------------
  const noBody = await req('/api/employees', { method: 'POST', token, raw: '' });
  check('空请求体返回 400', noBody.status === 400, `status=${noBody.status}`);

  const badJson = await req('/api/employees', { method: 'POST', token, raw: '{not-json' });
  check('非法 JSON 返回 400', badJson.status === 400);
  check('非法 JSON 错误码为 BAD_REQUEST', badJson.body?.error?.code === 'BAD_REQUEST');

  const missing = await req('/api/employees', { method: 'POST', token, body: { gender: '男' } });
  check('缺少必填项返回 400', missing.status === 400);
  check('错误详情指明缺失字段',
    missing.body?.error?.details?.some((d) => d.field === 'name'),
    JSON.stringify(missing.body?.error?.details)
  );

  const badEnum = await req('/api/employees', {
    method: 'POST', token,
    body: { name: '枚举测试', area: '火星片区' },
  });
  check('非法枚举值返回 400', badEnum.status === 400, `status=${badEnum.status}`);

  const badPhone = await req('/api/employees', {
    method: 'POST', token,
    body: { name: '手机号测试', phone: '123' },
  });
  check('手机号格式错误返回 400', badPhone.status === 400);
  check('给出具体字段错误信息',
    badPhone.body?.error?.details?.[0]?.field === 'phone',
    JSON.stringify(badPhone.body?.error?.details)
  );

  const badField = await req('/api/employees', {
    method: 'POST', token,
    body: { name: '字段测试', __hack__: 'x' },
  });
  check('未知字段被拒绝', badField.status === 400);

  const badId = await req('/api/employees/abc');
  check('非法 id 返回 400', badId.status === 400, `status=${badId.status}`);

  const ghost = await req('/api/employees/999999');
  check('不存在的记录返回 404', ghost.status === 404);

  const wrongMethod = await req('/api/employees', { method: 'PATCH', token, body: { name: 'x' } });
  check('不支持的方法返回 405', wrongMethod.status === 405, `status=${wrongMethod.status}`);

  // SQL 注入尝试：应被当作普通参数处理，不影响数据
  const injection = await req('/api/employees?limit=1&sort=id%3B%20DROP%20TABLE%20employees');
  check('注入型排序参数被安全忽略', injection.status === 200, `status=${injection.status}`);
  const stillAlive = await req('/api/employees?limit=1');
  check('注入尝试后表仍可正常读取', stillAlive.status === 200);

  // ---------------------------------------------------------------
  section('7. 唯一约束与批量写入');
  // ---------------------------------------------------------------
  const plate = `浙B${RUN.toUpperCase()}`;
  const v1 = await req('/api/vehicles', {
    method: 'POST', token,
    body: { plate_no: plate, vehicle_type: '污水车', area: '骆驼', status: 'working', mileage: 1000 },
  });
  check('新增车辆成功', v1.status === 201, JSON.stringify(v1.body));

  const dup = await req('/api/vehicles', {
    method: 'POST', token,
    body: { plate_no: plate, vehicle_type: '清扫车' },
  });
  check('重复车牌返回 409 冲突', dup.status === 409, `status=${dup.status}`);
  check('冲突错误码为 CONFLICT', dup.body?.error?.code === 'CONFLICT');

  const bulk = await req('/api/items/bulk', {
    method: 'POST', token,
    body: {
      rows: [
        { name: `批量物资A-${RUN}`, category: '井盖', quantity: 10, min_stock: 5, unit_price: 12.5 },
        { name: `批量物资B-${RUN}`, category: '管材', quantity: 20, min_stock: 5, unit_price: 8 },
      ],
    },
  });
  check('批量写入返回 201', bulk.status === 201, JSON.stringify(bulk.body));
  check('批量写入条数正确', bulk.body?.data?.inserted === 2);

  const bulkBad = await req('/api/items/bulk', {
    method: 'POST', token,
    body: { rows: [{ category: '缺名称' }] },
  });
  check('批量写入校验失败返回 400', bulkBad.status === 400);

  // ---------------------------------------------------------------
  section('8. 通用键值存储（多命名空间）');
  // ---------------------------------------------------------------
  const ns = `verify-${RUN}`;
  const put = await req(`/api/kv/${ns}/config`, {
    method: 'PUT', token,
    body: { value: { theme: 'dark', widgets: ['a', 'b'], n: 42 } },
  });
  check('写入 KV 成功', put.status === 200, JSON.stringify(put.body));

  const get = await req(`/api/kv/${ns}/config`);
  check('读取 KV 成功', get.status === 200);
  check('复杂 JSON 值往返一致',
    JSON.stringify(get.body?.data?.value) === JSON.stringify({ theme: 'dark', widgets: ['a', 'b'], n: 42 }),
    JSON.stringify(get.body?.data?.value)
  );

  const overwrite = await req(`/api/kv/${ns}/config`, {
    method: 'PUT', token,
    body: { value: { theme: 'light' } },
  });
  check('覆盖写入返回 200', overwrite.status === 200);
  const get2 = await req(`/api/kv/${ns}/config`);
  check('覆盖后值为最新', get2.body?.data?.value?.theme === 'light');

  const nsList = await req(`/api/kv/${ns}`);
  check('按命名空间列出键值', nsList.status === 200 && nsList.body?.data?.length === 1);

  const allNs = await req('/api/kv');
  check('可列出全部命名空间', allNs.status === 200 && Array.isArray(allNs.body?.data));

  const badNs = await req('/api/kv/bad%20ns%21%40%23/key');
  check('非法命名空间返回 400', badNs.status === 400, `status=${badNs.status}`);

  const missingKv = await req(`/api/kv/${ns}/nope`);
  check('不存在的键返回 404', missingKv.status === 404);

  const delKv = await req(`/api/kv/${ns}/config`, { method: 'DELETE', token });
  check('删除 KV 成功', delKv.status === 200);
  const delKvAgain = await req(`/api/kv/${ns}/config`, { method: 'DELETE', token });
  check('重复删除返回 404', delKvAgain.status === 404);

  // ---------------------------------------------------------------
  section('9. 审计日志');
  // ---------------------------------------------------------------
  const logoutRes = await req('/api/auth/logout', { method: 'POST', token });
  check('登出成功', logoutRes.status === 200);
  const afterLogout = await req('/api/employees', { method: 'POST', token, body: { name: 'x' } });
  check('登出后 token 失效返回 401', afterLogout.status === 401, `status=${afterLogout.status}`);

  // ---------------------------------------------------------------
  console.log(`\n${C.cyan('═══════════════════════════════════════')}`);
  console.log(`  通过 ${C.green(passed)} 项，失败 ${failed ? C.red(failed) : 0} 项`);
  if (failed) {
    console.log(`  ${C.red('失败项：')}`);
    failures.forEach((f) => console.log(`    - ${f}`));
  }
  console.log(`${C.cyan('═══════════════════════════════════════')}\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(C.red('\n验证脚本异常终止：'), err);
  process.exit(1);
});
