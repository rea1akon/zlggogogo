// 操作日志：写操作统一落库，便于审计

export async function logOperation(env, request, { actor, action, targetType, targetId, detail }) {
  try {
    await env.DB.prepare(
      `INSERT INTO operation_logs (actor, action, target_type, target_id, detail, ip)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        actor || 'anonymous',
        action,
        targetType || null,
        targetId === undefined || targetId === null ? null : String(targetId),
        detail ? JSON.stringify(detail).slice(0, 4000) : null,
        request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null
      )
      .run();
  } catch {
    // 日志失败不影响主流程
  }
}
