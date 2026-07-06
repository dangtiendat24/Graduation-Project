import { useState } from 'react'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import './RecruiterCandidatesPage.css'

// Mock Data cho danh sách ứng viên (bao gồm thông tin trích xuất)
const MOCK_CANDIDATES = [
  {
    id: 'c1',
    name: 'Nguyễn Hoàng',
    email: 'hoang.ng@email.com',
    appliedJob: 'Senior Backend Engineer',
    score: 87,
    status: 'interviewed',
    appliedAt: '2024-03-12',
    extractedSkills: ['Node.js', 'PostgreSQL', 'Microservices', 'Redis', 'Docker'],
    experience: '5 năm',
  },
  {
    id: 'c2',
    name: 'Trần Lan Anh',
    email: 'lananh.tran@email.com',
    appliedJob: 'UI/UX Designer',
    score: 81,
    status: 'schedule',
    appliedAt: '2024-03-11',
    extractedSkills: ['Figma', 'Prototyping', 'User Research', 'Design System'],
    experience: '3 năm',
  },
  {
    id: 'c3',
    name: 'Phạm Văn Đức',
    email: 'duc.pham@email.com',
    appliedJob: 'Data Analyst',
    score: 62,
    status: 'matched',
    appliedAt: '2024-03-14',
    extractedSkills: ['Python', 'SQL', 'Tableau', 'Data Cleaning'],
    experience: '2 năm',
  },
  {
    id: 'c4',
    name: 'Lê Minh Khôi',
    email: 'khoi.lm@email.com',
    appliedJob: 'DevOps Engineer',
    score: 34,
    status: 'rejected',
    appliedAt: '2024-03-15',
    extractedSkills: ['Linux', 'Bash', 'Jenkins', 'Networking'],
    experience: '1 năm',
  },
  {
    id: 'c5',
    name: 'Vũ Thu Trang',
    email: 'trang.vu@email.com',
    appliedJob: 'Frontend Engineer',
    score: 93,
    status: 'hired',
    appliedAt: '2024-03-01',
    extractedSkills: ['React', 'TypeScript', 'Tailwind', 'Next.js', 'Framer Motion'],
    experience: '4 năm',
  },
  {
    id: 'c6',
    name: 'Bùi Tuấn Anh',
    email: 'tuananh.bui@email.com',
    appliedJob: 'Senior Backend Engineer',
    score: 75,
    status: 'matched',
    appliedAt: '2024-03-15',
    extractedSkills: ['Java', 'Spring Boot', 'MySQL', 'AWS'],
    experience: '4.5 năm',
  },
  {
    id: 'c7',
    name: 'Đặng Mai Phương',
    email: 'phuong.dm@email.com',
    appliedJob: 'Frontend Engineer',
    score: 45,
    status: 'pending',
    appliedAt: '2024-03-16',
    extractedSkills: ['HTML', 'CSS', 'JavaScript', 'jQuery'],
    experience: 'Fresher',
  }
]

// Hàm phụ trợ để lấy màu điểm
function getScoreClass(score: number) {
  if (score >= 70) return 'score-high'
  if (score >= 40) return 'score-mid'
  return 'score-low'
}

// Từ điển hiển thị trạng thái
const STATUS_LABELS: Record<string, string> = {
  pending: 'Vừa nộp đơn',
  matched: 'Đã chấm điểm',
  interviewed: 'Đã phỏng vấn AI',
  schedule: 'Chờ chọn lịch',
  scheduled: 'Đã hẹn lịch',
  completed: 'AI báo cáo',
  hired: 'Đã tuyển',
  rejected: 'Từ chối',
}

// Lấy 2 chữ cái đầu để làm Avatar
function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function RecruiterCandidatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Lọc dữ liệu
  const filteredCandidates = MOCK_CANDIDATES.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        c.appliedJob.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <DashboardLayout>
      <div className="rcp-page">
        {/* Header Section */}
        <div className="rcp-header">
          <div>
            <h1 className="rcp-title">Hồ sơ ứng viên</h1>
            <p className="rcp-sub">
              Quản lý danh sách ứng viên đã nộp đơn. Thông tin kỹ năng đã được AI tự động trích xuất từ CV.
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="rcp-filters-card">
          <div className="rcp-search-box">
            <i className="ti ti-search" />
            <input 
              type="text" 
              placeholder="Tìm kiếm ứng viên, vị trí..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="rcp-filter-select">
            <i className="ti ti-filter" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Candidates List / Table */}
        <div className="rcp-table-container">
          <table className="rcp-table">
            <thead>
              <tr>
                <th>Ứng viên</th>
                <th>Vị trí ứng tuyển</th>
                <th style={{ width: '30%' }}>Kỹ năng trích xuất (AI)</th>
                <th>Điểm số</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="rcp-cand-info">
                        <div className="rcp-cand-avatar">{getInitials(c.name)}</div>
                        <div>
                          <div className="rcp-cand-name">{c.name}</div>
                          <div className="rcp-cand-meta">
                            <i className="ti ti-mail" /> {c.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="rcp-job-role">{c.appliedJob}</div>
                      <div className="rcp-cand-meta">
                        <i className="ti ti-calendar" /> {new Date(c.appliedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td>
                      <div className="rcp-skills-wrap">
                        {c.extractedSkills.slice(0, 3).map((skill, i) => (
                          <span key={i} className="rcp-skill-tag">{skill}</span>
                        ))}
                        {c.extractedSkills.length > 3 && (
                          <span className="rcp-skill-tag more">+{c.extractedSkills.length - 3}</span>
                        )}
                      </div>
                      <div className="rcp-exp-hint">
                        <i className="ti ti-briefcase" /> KN: {c.experience}
                      </div>
                    </td>
                    <td>
                      <span className={`rcp-score-pill ${getScoreClass(c.score)}`}>
                        {c.score}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${c.status}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td>
                      <button className="rcp-btn-view" title="Xem chi tiết CV & Báo cáo">
                        <i className="ti ti-chevron-right" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="rcp-empty-state">
                      <div className="rcp-empty-icon"><i className="ti ti-user-x" /></div>
                      <div>Không tìm thấy ứng viên nào phù hợp</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </DashboardLayout>
  )
}
