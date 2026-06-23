import { apiClient } from './client'

export interface CompanyData {
  id?: string
  name: string
  shortName?: string | null
  tagline?: string | null
  industry?: string | null
  companyType?: string | null
  sizeRange?: string | null
  foundedYear?: number | null
  shortDesc?: string | null
  fullDesc?: string | null
  techStack?: string[] | null
  perks?: string[] | null
  workModel?: string | null
  workLanguage?: string | null
  address?: string | null
  city?: string | null
  website?: string | null
  linkedinUrl?: string | null
  facebookUrl?: string | null
  logoUrl?: string | null
  coverUrl?: string | null
  isPublished?: boolean
}

export async function getMyCompany(): Promise<CompanyData | null> {
  const { data } = await apiClient.get<CompanyData | null>('/companies/my')
  return data
}

export async function upsertCompany(payload: CompanyData): Promise<CompanyData> {
  const { data } = await apiClient.put<CompanyData>('/companies/my', payload)
  return data
}
