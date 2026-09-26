import axios from 'axios'

type ProblemDetails = {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

export function getApiErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  if (!axios.isAxiosError<ProblemDetails>(error)) {
    return fallback
  }

  const data = error.response?.data
  const validationMessage = data?.errors
    ? Object.values(data.errors).flat().at(0)
    : undefined

  return validationMessage ?? data?.detail ?? fallback
}
