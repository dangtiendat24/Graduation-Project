import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { getSavedJobs, unsaveJob } from '../../api/savedJobs'
import JobCard from '../../components/JobCard/JobCard'
import './CandidateSavedJobsPage.css'

export default function CandidateSavedJobsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: savedJobs = [], isLoading, isError } = useQuery({
    queryKey: ['saved-jobs', 'list'],
    queryFn: getSavedJobs,
  })

  const unsaveMutation = useMutation({
    mutationFn: (jobId: string) => unsaveJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
    },
  })

  return (
    <CandidateLayout>
      <div className="csj-header">
        <h1 className="csj-title">Việc làm đã lưu</h1>
        <p className="csj-sub">Các tin tuyển dụng bạn đã bấm "Lưu tin" để xem lại sau.</p>
      </div>

      {isLoading && <div className="csj-state-msg">Đang tải danh sách đã lưu...</div>}

      {!isLoading && isError && (
        <div className="csj-state-msg csj-state-error">Không tải được danh sách việc làm đã lưu.</div>
      )}

      {!isLoading && !isError && savedJobs.length === 0 && (
        <div className="csj-empty">
          <i className="ti ti-heart" />
          <p>Bạn chưa lưu tin tuyển dụng nào.</p>
          <button className="csj-btn-browse" onClick={() => navigate('/candidate/jobs')}>
            Tìm việc làm ngay
          </button>
        </div>
      )}

      {!isLoading && !isError && savedJobs.length > 0 && (
        <div className="csj-list">
          {savedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved
              saveDisabled={unsaveMutation.isPending && unsaveMutation.variables === job.id}
              onOpen={() => navigate(`/candidate/jobs/${job.id}`)}
              onOpenCompany={() => job.company?.id && navigate(`/candidate/companies/${job.company.id}`)}
              onToggleSave={() => unsaveMutation.mutate(job.id)}
            />
          ))}
        </div>
      )}
    </CandidateLayout>
  )
}
