/**
 * Vietnamese status text, shared by the exception filter (client-facing error
 * messages for framework-thrown HttpExceptions) and the request logger
 * (friendly access-log labels).
 */

/**
 * Full, user-facing Vietnamese message per HTTP status. Used as the fallback
 * message for framework-thrown HttpExceptions (404 unknown route, 401, 429…)
 * whose default message is English.
 */
export const VI_HTTP_MESSAGE: Record<number, string> = {
  400: 'Yêu cầu không hợp lệ',
  401: 'Bạn cần đăng nhập để tiếp tục',
  403: 'Bạn không có quyền thực hiện thao tác này',
  404: 'Không tìm thấy tài nguyên yêu cầu',
  405: 'Phương thức không được hỗ trợ',
  409: 'Dữ liệu bị xung đột',
  413: 'Dữ liệu tải lên quá lớn',
  415: 'Định dạng không được hỗ trợ',
  422: 'Dữ liệu không hợp lệ',
  429: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau',
  500: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau',
  502: 'Máy chủ trung gian gặp sự cố',
  503: 'Dịch vụ tạm thời không khả dụng',
};

/**
 * English reason phrases NestJS/Express use as the DEFAULT message for a
 * framework-thrown HttpException (e.g. `new ForbiddenException()` → "Forbidden").
 * These should be replaced with Vietnamese; a caller-supplied custom message
 * (e.g. `new ForbiddenException('No access')`) must be preserved.
 */
const FRAMEWORK_DEFAULT_MESSAGES = new Set<string>([
  'Bad Request',
  'Unauthorized',
  'Payment Required',
  'Forbidden',
  'Forbidden resource',
  'Not Found',
  'Method Not Allowed',
  'Not Acceptable',
  'Request Timeout',
  'Conflict',
  'Gone',
  'Payload Too Large',
  'Unsupported Media Type',
  'Unprocessable Entity',
  'Too Many Requests',
  'Internal Server Error',
  'Not Implemented',
  'Bad Gateway',
  'Service Unavailable',
  'Gateway Timeout',
]);

/**
 * True when an HttpException message is a generic framework default (or the
 * Express "Cannot GET /path" unknown-route message, or absent) and so may be
 * safely swapped for a Vietnamese status message. A custom, meaningful message
 * returns false and is preserved as-is.
 */
export function isGenericHttpMessage(message: string | undefined): boolean {
  if (message === undefined || message === '') {
    return true;
  }
  if (FRAMEWORK_DEFAULT_MESSAGES.has(message)) {
    return true;
  }
  return /^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /.test(message);
}

/** Short friendly label per status, for one-line access logs. */
const VI_STATUS_LABEL: Record<number, string> = {
  200: 'Thành công',
  201: 'Đã tạo',
  202: 'Đã tiếp nhận',
  204: 'Thành công (không nội dung)',
  301: 'Chuyển hướng vĩnh viễn',
  302: 'Chuyển hướng',
  304: 'Không thay đổi',
  400: 'Yêu cầu không hợp lệ',
  401: 'Chưa xác thực',
  403: 'Không có quyền',
  404: 'Không tìm thấy',
  405: 'Phương thức không hỗ trợ',
  409: 'Xung đột dữ liệu',
  413: 'Dữ liệu quá lớn',
  415: 'Sai định dạng',
  422: 'Dữ liệu không hợp lệ',
  429: 'Quá nhiều yêu cầu',
  500: 'Lỗi hệ thống',
  502: 'Lỗi gateway',
  503: 'Dịch vụ không khả dụng',
};

/**
 * Friendly Vietnamese label for a status code, with a sensible fallback by
 * status class (2xx/3xx/4xx/5xx) for codes not in the table.
 */
export function statusLabelVi(status: number): string {
  const exact = VI_STATUS_LABEL[status];
  if (exact) {
    return exact;
  }

  if (status >= 500) return 'Lỗi hệ thống';
  if (status >= 400) return 'Lỗi yêu cầu';
  if (status >= 300) return 'Chuyển hướng';
  if (status >= 200) return 'Thành công';
  return 'Không xác định';
}
