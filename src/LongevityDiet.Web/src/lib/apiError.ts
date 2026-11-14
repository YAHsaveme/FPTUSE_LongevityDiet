import axios from 'axios'

type ProblemDetails = {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
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
