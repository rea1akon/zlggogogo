// Worker 端按角色脱敏单测（Node 运行，不依赖 Cloudflare 环境）
// 用法：node cloudflare/tools/test-server-redact.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'worker', 'src', 'lib', 'redact.js');
const code = readFileSync(SRC, 'utf8');

// 用 data URL 动态导入 ES 模块源码
const mod = await import('data:text/javascript;base64,' + Buffer.from(code, 'utf8').toString('base64'));
const { redact, maskText, needRedact } = mod;

let fail = 0;
function check(name, got, expect) {
  const g = typeof got === 'string' ? got : JSON.stringify(got);
  const e = typeof expect === 'string' ? expect : JSON.stringify(expect);
  const ok = g === e;
  if (!ok) fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`);
  if (!ok) console.log(`       期望: ${e}\n       实际: ${g}`);
}

// ---- 字符串形态掩码 ----
check('18位身份证', maskText('412902197808303541'), '412902********3541');
check('18位身份证X结尾', maskText('41290219780830354X'), '412902********354X');
check('15位老身份证', maskText('412902780830354'), '412902******354');
check('手机号', maskText('13812345678'), '138****5678');
check('日期不误伤', maskText('2026/09/10'), '2026/09/10');
check('13位编号不误伤', maskText('订单号 9876543210123'), '订单号 9876543210123');
check('幂等(已掩码身份证)', maskText('412902********3541'), '412902********3541');

// ---- 嵌套对象/数组 ----
const employee = {
  name: '张三',
  idCard: '412902197808303541',
  contact: { phone: '13812345678', address: '人民路 12 号' },
  records: [
    { type: '入职', note: '身份证412902197808303541已核验' },
    { type: '调岗', note: '无' }
  ]
};
const r1 = redact(employee);
// 嵌套结构里的 idCard 字段
check('嵌套对象-身份证(形态识别)', r1.idCard, '******************');
check('嵌套对象-电话', r1.contact.phone, '138****5678');
check('数组内文本', r1.records[0].note, '身份证412902********3541已核验');
check('普通字段不受影响', r1.name, '张三');
check('普通地址不受影响', r1.contact.address, '人民路 12 号');
check('入参未被修改（返回副本）', employee.idCard, '412902197808303541');

// 明确命名为敏感字段（idCard/银行卡等）走字段名兜底：整串数字全打码，比形态识别更严
check('字段名兜底-idCard全打码', r1.idCard, '******************');
const r2 = redact({ 银行卡: '6222 0212 3456 7890 123', note: '工资卡' });
check('字段名兜底-银行卡(带空格)', r2.银行卡, '**** **** **** **** ***');
check('字段名兜底-银行卡泄漏残值', /\d{4,}/.test(r2.银行卡), false);
check('字段名兜底-普通字段不受影响', r2.note, '工资卡');

// ---- 二次编码的 JSON 字符串 ----
const nested = JSON.stringify({ staff: [{ idCard: '412902197808303541', name: '李四' }] });
const r3 = redact({ employeesRaw: nested });
check('二次编码JSON内部脱敏', JSON.parse(r3.employeesRaw).staff[0].idCard, '******************');

// ---- 非字符串类型保持 ----
const r4 = redact({ age: 48, active: true, remark: null, salary: 8500.5 });
check('数字保持', r4.age, 48);
check('布尔保持', r4.active, true);
check('null保持', r4.remark, null);
check('小数保持', r4.salary, 8500.5);

// ---- 幂等：二次脱敏结果不变 ----
check('整体幂等', JSON.stringify(redact(r1)), JSON.stringify(redact(redact(r1))));

// ---- 角色判定 ----
check('未登录需脱敏', needRedact(null), true);
check('viewer需脱敏', needRedact({ role: 'viewer' }), true);
check('admin不需脱敏', needRedact({ role: 'admin' }), false);

console.log(fail === 0 ? '\n全部通过' : `\n有 ${fail} 例失败`);
process.exit(fail === 0 ? 0 : 1);
