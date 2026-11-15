import axios from 'axios'

type ProblemDetails = {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
  code?: string
}

/** One user-facing error vocabulary across all Member pages. */
export function getApiErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  if (!axios.isAxiosError<ProblemDetails>(error)) return fallback

  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'Kết nối đã hết thời gian chờ. Vui lòng kiểm tra mạng và thử lại.'
    }
    return 'Không thể kết nối đến hệ thống. Vui lòng kiểm tra mạng và thử lại.'
  }

  const { status, data } = error.response
  // Only these explicitly modeled, safe Planner-precondition codes are actionable.
  // All other 5xx errors remain generic to avoid leaking exception details.
  if (status === 503) {
    switch (data?.code) {
      case 'planning_rules_unavailable':
        return 'Chưa có bộ quy tắc đang hoạt động. Hãy nhờ quản trị viên kiểm tra và kích hoạt bộ quy tắc đã công bố.'
      case 'planning_rules_not_effective':
        return 'Bộ quy tắc chưa tới ngày có hiệu lực. Hãy liên hệ quản trị viên.'
      case 'planning_rules_invalid':
        return 'Bộ quy tắc chưa hợp lệ để tạo thực đơn. Hãy liên hệ quản trị viên kiểm tra phiên bản đã công bố.'
      case 'planning_catalog_empty':
        return 'Danh mục chưa có công thức đủ thông tin. Hãy nhờ quản trị viên cập nhật công thức và nguyên liệu trước khi tạo thực đơn.'
    }
  }
  // Never expose internal exception details or stack traces to end users.
  if (status >= 500) return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
  if (status === 429) return 'Bạn thao tác quá nhanh. Vui lòng đợi một chút rồi thử lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (status === 404) return 'Không tìm thấy dữ liệu được yêu cầu.'
  if (status === 408) return 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.'
  if (status === 401) return fallback

  const validationMessage = data?.errors
    ? Object.values(data.errors).flat().find((value) => typeof value === 'string' && value.trim().length > 0)
    : undefined

  const sourceMessage = validationMessage ??
    (typeof data?.detail === 'string' && data.detail.trim() ? data.detail : undefined) ??
    (typeof data?.title === 'string' && data.title.trim() ? data.title : undefined)

  // API errors can come from English framework defaults or upstream services.
  // Never show untranslated framework messages or raw exception content.
  if (sourceMessage && /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(sourceMessage)) {
    return sourceMessage
  }
  if (status === 400 || status === 422) {
    return 'Dữ liệu hoặc điều kiện an toàn chưa hợp lệ. Hãy kiểm tra các trường đã nhập, dị ứng và các hướng dẫn trên màn hình.'
  }
  if (status === 409) {
    return 'Dữ liệu đã thay đổi hoặc thao tác bị xung đột. Vui lòng làm mới trang rồi thử lại.'
  }
  return fallback
}
