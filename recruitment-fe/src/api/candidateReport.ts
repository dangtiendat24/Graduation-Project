import { apiClient } from './client'

export interface CandidateReportPdfResponse {
  url: string
}

export async function getCandidateReportPdfUrl(
  applicationId: string,
): Promise<CandidateReportPdfResponse> {
  const { data } = await apiClient.get<CandidateReportPdfResponse>(
    `/reports/${applicationId}/pdf`,
  )
  return data
}
