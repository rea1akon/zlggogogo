// 入参校验：类型、长度、枚举、必填，全部走字段白名单

import { badRequest, payloadTooLarge } from './errors.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/;

function isBlank(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function coerce(spec, value, field) {
  const { type } = spec;

  if (type === 'text') {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return { error: '应为文本' };
    }
    const s = String(value).trim();
    if (spec.max && s.length > spec.max) return { error: `长度不能超过 ${spec.max} 个字符` };
    if (spec.pattern && s && !spec.pattern.test(s)) return { error: spec.patternMsg || '格式不正确' };
    return { value: s };
  }

  if (type === 'integer') {
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { error: '应为整数' };
    if (spec.minValue !== undefined && n < spec.minValue) return { error: `不能小于 ${spec.minValue}` };
    if (spec.maxValue !== undefined && n > spec.maxValue) return { error: `不能大于 ${spec.maxValue}` };
    return { value: n };
  }

  if (type === 'real') {
    const n = Number(value);
    if (!Number.isFinite(n)) return { error: '应为数字' };
    if (spec.minValue !== undefined && n < spec.minValue) return { error: `不能小于 ${spec.minValue}` };
    if (spec.maxValue !== undefined && n > spec.maxValue) return { error: `不能大于 ${spec.maxValue}` };
    return { value: n };
  }

  if (type === 'date') {
    const s = String(value).trim();
    if (!DATE_RE.test(s) && !DATETIME_RE.test(s)) return { error: '日期格式应为 YYYY-MM-DD' };
    return { value: s };
  }

  if (type === 'enum') {
    const s = String(value).trim();
    if (!spec.values.includes(s)) return { error: `只能是：${spec.values.join(' / ')}` };
    return { value: s };
  }

  return { error: `字段 ${field} 的类型定义有误` };
}

/**
 * @param {object} resource 资源定义
 * @param {object} body     请求体
 * @param {boolean} partial true 表示更新场景，只处理传入字段
 * @returns {object} 清洗后的字段对象
 */
export function validateFields(resource, body, { partial = false } = {}) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('请求体必须是一个 JSON 对象');
  }

  const keys = Object.keys(body);
  if (keys.length > 60) throw payloadTooLarge('字段数量过多');

  const errors = [];
  const clean = {};
  const fields = resource.fields;

  for (const key of keys) {
    if (!(key in fields)) {
      errors.push({ field: key, message: '该字段不存在或不允许修改' });
      continue;
    }
    const value = body[key];
    if (isBlank(value)) {
      // 显式传 null 视为清空；未定义则忽略
      if (value === null) clean[key] = null;
      continue;
    }
    const r = coerce(fields[key], value, key);
    if (r.error) errors.push({ field: key, message: r.error });
    else clean[key] = r.value;
  }

  if (!partial) {
    for (const [name, spec] of Object.entries(fields)) {
      if (spec.required && !(name in clean)) {
        errors.push({ field: name, message: '必填项不能为空' });
      }
      if (!(name in clean) && spec.defaultValue !== undefined) {
        clean[name] = spec.defaultValue;
      }
    }
  }

  if (Object.keys(clean).length === 0 && errors.length === 0) {
    throw badRequest('没有可写入的有效字段');
  }
  if (errors.length) throw badRequest('字段校验未通过', errors);

  return clean;
}

/** 解析分页参数 */
export function parsePaging(url, env) {
  const maxSize = Number(env.MAX_PAGE_SIZE || 200);
  const defSize = Number(env.DEFAULT_PAGE_SIZE || 20);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit'), 10) || defSize, 1), maxSize);
  const offset = Math.max(parseInt(url.searchParams.get('offset'), 10) || 0, 0);
  return { limit, offset };
}

/** 解析 id，必须为合法正整数 */
export function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('id 必须为正整数');
    err.status = 400;
    err.code = 'INVALID_ID';
    throw err;
  }
  return id;
}
