// 按角色的敏感信息脱敏（后端兜底）
//
// 背景：前端 v7.6 的展示层脱敏只能防住"肉眼查看"，懂技术的人直接抓 /api 的响应
// 仍能拿到原始 JSON。因此把脱敏下沉到服务端：非管理员（访客/未登录）发起的读取，
// 由 Worker 在返回前递归打码，敏感明文不再下发到浏览器。
//
// 设计原则：
//   1. 只在读取出口打码，数据库里的原始值一个字节都不改（仅在内存中的副本上处理）
//   2. 规则保守：优先按"数据形态"识别（身份证/手机号），再按"字段名"兜底
//   3. 单次处理保证结果稳定（同一份数据连续处理两次，第二次不再产生变化）

// ---------- 数据形态识别 ----------

// 18 位身份证：6 位地区码 + 4 位出生年 + 合法月/日 + 3 位顺序码 + 校验位
const ID18_RE = /(^|[^0-9a-zA-Z*])(\d{6})(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(\d{3}[0-9Xx])(?![0-9a-zA-Z*])/g;
// 15 位老身份证：6 位地区码 + 2 位出生年 + 合法月/日 + 3 位顺序码
const ID15_RE = /(^|[^0-9a-zA-Z*])(\d{6})(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(\d{3})(?![0-9a-zA-Z*])/g;
// 大陆手机号
const PHONE_RE = /(^|[^0-9a-zA-Z*])(1[3-9]\d)(\d{4})(\d{4})(?![0-9a-zA-Z*])/g;

// ---------- 字段名识别（形态识别不到时的兜底）----------
// 注意：不要把单独的 id / no / code 这类通用名放进来，否则会误伤主键与业务编号
const SENSITIVE_KEY_RE =
  /(身份证|身份号|证件号|证件号码|id[_ -]?card|idcard|identity[_ -]?no|社保|银行卡|银行账号|bankcard|bank[_ -]?account)/i;

const NESTED_JSON_MAX = 200 * 1024; // 超过该长度的字符串不做二次 JSON 解析，避免拖慢请求

/** 按数据形态打码 */
export function maskText(text) {
  if (typeof text !== 'string' || !text) return text;
  if (text.length < 11) return text; // 手机号最短 11 位，更短的不可能命中
  return text
    .replace(ID18_RE, '$1$2********$6')
    .replace(ID15_RE, '$1$2******$6')
    .replace(PHONE_RE, '$1$2****$4');
}

/** 字段名敏感时：把字符串里的所有数字打码（覆盖带分隔符的银行卡号、被拆分的证件号等） */
function maskDigitsIfSensitive(str, keyName) {
  if (!keyName || typeof keyName !== 'string') return str;
  if (!SENSITIVE_KEY_RE.test(keyName)) return str;
  // 按"去掉分隔符后的数字位数"判断，避免 "6222 0212 3456 7890" 这类分组写法漏网
  const digits = str.replace(/\D/g, '');
  if (digits.length < 8) return str;
  return str.replace(/\d/g, '*');
}

/** 处理可能被二次 JSON 编码的字符串（历史数据里存在字符串套 JSON 的情况） */
function tryNestedJson(str, keyName) {
  if (typeof str !== 'string' || str.length > NESTED_JSON_MAX) return str;
  const ch = str.trim()[0];
  if (ch !== '{' && ch !== '[') return str;
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed !== 'object' || parsed === null) return str;
    return JSON.stringify(walk(parsed, keyName));
  } catch {
    return str; // 不是合法 JSON 就按普通字符串处理
  }
}

function walk(value, keyName) {
  if (typeof value === 'string') {
    const masked = maskText(value);
    return tryNestedJson(maskDigitsIfSensitive(masked, keyName), keyName);
  }
  if (Array.isArray(value)) return value.map((item) => walk(item, keyName));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, k);
    return out;
  }
  return value; // number / boolean / null 原样保留
}

/**
 * 对任意结构化数据做递归脱敏，返回新的副本（不修改入参）
 * 用于访客/未登录请求的读取出口。
 */
export function redact(value) {
  return walk(value, null);
}

/** 是否需要脱敏：只有管理员角色才能看到明文 */
export function needRedact(user) {
  return !user || user.role !== 'admin';
}
