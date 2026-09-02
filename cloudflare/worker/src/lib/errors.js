// 可预期的业务异常，直接转成对应的 HTTP 状态码

export class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new ApiError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = '未登录或登录已失效') => new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = '没有操作权限') => new ApiError(403, 'FORBIDDEN', message);
export const notFound = (message = '资源不存在', details = null) =>
  new ApiError(404, 'NOT_FOUND', message, details);
export const conflict = (message, details) => new ApiError(409, 'CONFLICT', message, details);
export const payloadTooLarge = (message = '请求体过大') => new ApiError(413, 'PAYLOAD_TOO_LARGE', message);
export const tooManyFields = (message) => new ApiError(422, 'UNPROCESSABLE', message);
