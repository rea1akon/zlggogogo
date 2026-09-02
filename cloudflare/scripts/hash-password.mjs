#!/usr/bin/env node
/**
 * 生成管理员口令：输出 salt 与 password_hash，以及可直接执行的更新 SQL
 * 用法：npm run hash-password -- 你的新密码
 */
import crypto from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('用法: npm run hash-password -- <新密码>');
  process.exit(1);
}
if (password.length < 8) {
  console.error('安全提示：口令长度建议不少于 8 位');
}

const salt = `zlg-${crypto.randomBytes(8).toString('hex')}`;
const hash = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');

console.log('\n生成结果：');
console.log(`  salt          = ${salt}`);
console.log(`  password_hash = ${hash}\n`);
console.log('本地更新：');
console.log(`  npx wrangler d1 execute zlg_maintenance_db --local --command "UPDATE users SET salt='${salt}', password_hash='${hash}' WHERE username='admin'"\n`);
console.log('线上更新（务必先 --remote 备份）：');
console.log(`  npx wrangler d1 execute zlg_maintenance_db --remote --command "UPDATE users SET salt='${salt}', password_hash='${hash}' WHERE username='admin'"\n`);
