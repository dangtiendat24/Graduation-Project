import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getJob } from '../../api/jobs'
import { getRecruiterCandidates } from '../../api/candidates'
import { getJobApplications, updateApplicationStatus, getScoreBand } from '../../api/rankings'
import type { GetJobApplicationsResponse } from '../../api/rankings'
import ScoreBandFilter, { type BandFilterValue } from './ScoreBandFilter'
import RankingTable, { type RankedRow } from './RankingTable'
import ConfirmActionModal from './ConfirmActionModal'
import CandidateDetailDrawer from './CandidateDetailDrawer'
import Top3Podium, { type PodiumItem } from './Top3Podium'
import ScoreSummaryCard from './ScoreSummaryCard'
import './RankedCandidatesPage.css'

const PAGE_LIMIT = 20
// Giới hạn tối đa của GET /recruiter/candidates (dùng để lấy kỹ năng đã trích
// xuất + thống kê điểm). Job có nhiều hơn 100 ứng viên sẽ bị thống kê thiếu —
// bảng xếp hạng chính vẫn phân trang chính xác qua /jobs/:jobId/applications.
const STATS_SAMPLE_LIMIT = 100

interface PendingConfirm {
  row: RankedRow
  action: 'interviewed' | 'rejected'
}

// Lỗi 4xx (403 không có quyền, 404 không tồn tại...) sẽ không đổi kết quả dù
// retry — tránh giữ UI ở trạng thái loading thêm nhiều giây vô ích.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error) && error.response && error.response.status < 500) return false
  return failureCount < 2
}

interface Toast {
  type: 'success' | 'error'
  message: string
}

export default function RankedCandidatesPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [bandFilter, setBandFilter] = useState<BandFilterValue>('all')
  const [page, setPage] = useState(1)
  const [selectedRow, setSelectedRow] = useState<RankedRow | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  function handleBandChange(value: BandFilterValue) {
    setBandFilter(value)
    setPage(1)
  }

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
    retry: shouldRetry,
  })

  const rankingsQuery = useQuery({
    queryKey: ['job-rankings', jobId, bandFilter, page],
    queryFn: () =>
      getJobApplications(jobId!, {
        sort: 'score',
        scoreBand: bandFilter === 'all' ? undefined : bandFilter,
        page,
        limit: PAGE_LIMIT,
      }),
    enabled: !!jobId,
    placeholderData: keepPreviousData,
    retry: shouldRetry,
  })

  // Nguồn phụ: dùng để lấy kỹ năng CV đã trích xuất (không có trong response
  // của /jobs/:jobId/applications) và tính thống kê điểm / top 3 toàn job
  // (không phụ thuộc filter/trang hiện tại của bảng chính).
  const statsQuery = useQuery({
    queryKey: ['job-candidates-stats', jobId],
    queryFn: () => getRecruiterCandidates({ jobId: jobId!, limit: STATS_SAMPLE_LIMIT }),
    enabled: !!jobId,
    retry: shouldRetry,
  })

  const skillsMap = useMemo(() => {
    const map = new Map<string, string[]>()
    statsQuery.data?.data.forEach((c) => {
      map.set(c.applicationId, c.parsedData?.skills ?? [])
    })
    return map
  }, [statsQuery.data])

  const bandCounts = useMemo(() => {
    const counts = { all: statsQuery.data?.meta.total ?? 0, high: 0, medium: 0, low: 0 }
    statsQuery.data?.data.forEach((c) => {
      const band = getScoreBand(c.matching?.overallScore ?? null)
      if (band) counts[band] += 1
    })
    return counts
  }, [statsQuery.data])

  const scoreStats = useMemo(() => {
    const scored = (statsQuery.data?.data ?? []).filter((c) => c.matching?.overallScore != null)
    const scores = scored.map((c) => c.matching!.overallScore)
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    const max = scores.length > 0 ? Math.max(...scores) : null
    const unscored = (statsQuery.data?.meta.total ?? 0) - scored.length
    return {
      avg,
      max,
      distribution: {
        high: bandCounts.high,
        medium: bandCounts.medium,
        low: bandCounts.low,
        unscored: Math.max(unscored, 0),
      },
    }
  }, [statsQuery.data, bandCounts])

  const top3: PodiumItem[] = useMemo(() => {
    return (statsQuery.data?.data ?? [])
      .filter((c) => c.matching?.overallScore != null)
      .sort((a, b) => b.matching!.overallScore - a.matching!.overallScore)
      .slice(0, 3)
      .map((c) => ({
        applicationId: c.applicationId,
        fullName: c.candidate.fullName,
        avatarUrl: c.candidate.avatarUrl,
        overallScore: c.matching!.overallScore,
        scoreBand: getScoreBand(c.matching!.overallScore),
      }))
  }, [statsQuery.data])

  const rows: RankedRow[] = useMemo(() => {
    const list = rankingsQuery.data?.data ?? []
    return list.map((item, i) => ({
      ...item,
      rank: (page - 1) * PAGE_LIMIT + i + 1,
      skills: skillsMap.get(item.applicationId) ?? [],
      scoreBand: getScoreBand(item.matching?.overallScore ?? null),
    }))
  }, [rankingsQuery.data, page, skillsMap])

  const statusMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: 'interviewed' | 'rejected' }) =>
      updateApplicationStatus(jobId!, applicationId, status),
    onMutate: async ({ applicationId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['job-rankings', jobId] })
      const previous = queryClient.getQueriesData<GetJobApplicationsResponse>({
        queryKey: ['job-rankings', jobId],
      })
      queryClient.setQueriesData<GetJobApplicationsResponse>(
        { queryKey: ['job-rankings', jobId] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((a) => (a.applicationId === applicationId ? { ...a, status } : a)),
          }
        },
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data))
      setToast({ type: 'error', message: 'Cập nhật trạng thái thất bại. Vui lòng thử lại.' })
    },
    onSuccess: (_data, vars) => {
      setToast({
        type: 'success',
        message:
          vars.status === 'interviewed'
            ? 'Đã gửi lời mời phỏng vấn cho ứng viên.'
            : 'Đã từ chối ứng viên, email thông báo đã được gửi.',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['job-rankings', jobId] })
    },
  })

  function handleAction(row: RankedRow, action: 'interviewed' | 'rejected') {
    setPendingConfirm({ row, action })
  }

  function confirmAction() {
    if (!pendingConfirm) return
    statusMutation.mutate(
      { applicationId: pendingConfirm.row.applicationId, status: pendingConfirm.action },
      { onSettled: () => setPendingConfirm(null) },
    )
  }

  const meta = rankingsQuery.data?.meta

  return (
    <DashboardLayout>
      <div className="rk-page">
        <div className="rk-breadcrumb">
          <span className="rk-bc-link" onClick={() => navigate('/recruiter/jobs')}>Tin tuyển dụng</span>
          <i className="ti ti-chevron-right" />
          <span className="rk-bc-link" onClick={() => navigate(`/recruiter/jobs/${jobId}/edit`)}>
            {job?.title ?? '...'}
          </span>
          <i className="ti ti-chevron-right" />
          <span className="rk-bc-current">Xếp hạng ứng viên</span>
        </div>

        <div className="rk-header">
          <h1 className="rk-title">Xếp hạng ứng viên theo điểm phù hợp</h1>
          <p className="rk-sub">
            Danh sách ứng viên đã nộp đơn{job?.title ? <> cho <strong>{job.title}</strong></> : ''}, sắp xếp theo điểm phù hợp AI chấm để bạn ưu tiên xem xét.
          </p>
        </div>

        <div className="rk-layout">
          <div className="rk-main">
            <ScoreBandFilter value={bandFilter} counts={bandCounts} onChange={handleBandChange} />

            <RankingTable
              rows={rows}
              requiredSkills={job?.requiredSkills ?? []}
              isLoading={rankingsQuery.isLoading}
              isError={rankingsQuery.isError}
              pendingApplicationId={statusMutation.isPending ? pendingConfirm?.row.applicationId ?? null : null}
              onSelectRow={setSelectedRow}
              onAction={handleAction}
            />

            {meta && meta.totalPages > 1 && (
              <div className="rk-pagination">
                <button
                  className="rk-page-btn"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <i className="ti ti-chevron-left" /> Trước
                </button>
                <span className="rk-page-info">Trang {meta.page} / {meta.totalPages} · {meta.total} ứng viên</span>
                <button
                  className="rk-page-btn"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  Sau <i className="ti ti-chevron-right" />
                </button>
              </div>
            )}
          </div>

          <div className="rk-side">
            <Top3Podium items={top3} isLoading={statsQuery.isLoading} />
            <ScoreSummaryCard avgScore={scoreStats.avg} maxScore={scoreStats.max} distribution={scoreStats.distribution} />
          </div>
        </div>
      </div>

      {pendingConfirm && (
        <ConfirmActionModal
          candidateName={pendingConfirm.row.candidate.fullName}
          jobTitle={job?.title ?? ''}
          action={pendingConfirm.action}
          isPending={statusMutation.isPending}
          onConfirm={confirmAction}
          onCancel={() => setPendingConfirm(null)}
        />
      )}

      {selectedRow && (
        <CandidateDetailDrawer
          row={selectedRow}
          requiredSkills={job?.requiredSkills ?? []}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {toast && (
        <div className={`rk-toast rk-toast--${toast.type}`} role="status" aria-live="polite">
          <i className={`ti ${toast.type === 'success' ? 'ti-circle-check' : 'ti-alert-circle'}`} />
          <span>{toast.message}</span>
        </div>
      )}
    </DashboardLayout>
  )
}
