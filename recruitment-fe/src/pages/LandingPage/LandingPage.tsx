import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      const nav = document.querySelector<HTMLElement>('.nav')
      if (!nav) return
      nav.style.background =
        window.scrollY > 40 ? 'rgba(15,23,42,0.97)' : 'rgba(15,23,42,0.92)'
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const goToAuth = () => navigate('/login')

  return (
    <>
      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-inner">
          <a className="nav-logo" href="#">
            <div className="logo-dot" />
            <span className="logo-text">RECRUIT<span>.AI</span></span>
          </a>
          <div className="nav-links">
            <a className="nav-link" href="#how">Cách hoạt động</a>
            <a className="nav-link" href="#agents">AI Agent</a>
            <a className="nav-link" href="#numbers">Thành tích</a>
            <a className="nav-link" href="#reviews">Đánh giá</a>
          </div>
          <div className="nav-actions">
            <button className="btn-ghost-nav" onClick={goToAuth}>Đăng nhập</button>
            <button className="btn-cta-nav"   onClick={goToAuth}>Dùng miễn phí →</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero" id="hero">
        <div className="hero-badge">
          <i className="ti ti-sparkles" />
          Được tin dùng bởi 500+ công ty tại Việt Nam
        </div>

        <h1 className="hero-title">
          Tuyển đúng người,<br />
          <span className="hl">nhanh gấp 10 lần</span><br />
          với <span className="hl2">5 AI Agent</span>
        </h1>

        <p className="hero-sub">
          Nền tảng tuyển dụng thông minh tự động phân tích CV, phỏng vấn, và lên lịch — giúp HR tập trung vào những quyết định thực sự quan trọng.
        </p>

        <div className="hero-actions">
          <button className="btn-hero-primary" onClick={goToAuth}>
            <i className="ti ti-rocket" style={{ fontSize: 18 }} />
            Bắt đầu miễn phí
          </button>
          <button className="btn-hero-ghost">
            <i className="ti ti-player-play" style={{ fontSize: 18 }} />
            Xem demo 2 phút
          </button>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">10<span>×</span></div>
            <div className="hero-stat-lbl">Nhanh hơn tuyển thủ công</div>
          </div>
          <div className="stat-divider" />
          <div className="hero-stat">
            <div className="hero-stat-num">95<span>%</span></div>
            <div className="hero-stat-lbl">Độ chính xác phân tích CV</div>
          </div>
          <div className="stat-divider" />
          <div className="hero-stat">
            <div className="hero-stat-num">4.2<span>ph</span></div>
            <div className="hero-stat-lbl">Thời gian xử lý mỗi ứng viên</div>
          </div>
          <div className="stat-divider" />
          <div className="hero-stat">
            <div className="hero-stat-num"><span>+</span>500</div>
            <div className="hero-stat-lbl">Doanh nghiệp tin dùng</div>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="hero-mockup">
          <div className="mockup-browser">
            <div className="mockup-bar">
              <div className="mockup-dot" style={{ background: '#FF5F57' }} />
              <div className="mockup-dot" style={{ background: '#FEBC2E' }} />
              <div className="mockup-dot" style={{ background: '#28C840' }} />
              <div className="mockup-url">app.recruit.ai/recruiter/dashboard</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-sidebar">
                <div className="ms-logo">
                  <div className="ms-logo-dot" />
                  <span className="ms-logo-txt">RECRUIT<span>.AI</span></span>
                </div>
                <div className="ms-item on"><i className="ti ti-layout-dashboard" /> Dashboard</div>
                <div className="ms-item"><i className="ti ti-briefcase" /> Tin đăng</div>
                <div className="ms-item"><i className="ti ti-users" /> Ứng viên</div>
                <div className="ms-item"><i className="ti ti-calendar" /> Lịch</div>
                <div className="ms-item"><i className="ti ti-chart-bar" /> Báo cáo</div>
              </div>
              <div className="mockup-content">
                <div className="mc-cards">
                  <div className="mc-card">
                    <div className="mc-card-ico" style={{ color: '#5EEAD4' }}>👥</div>
                    <div className="mc-card-num">48</div>
                    <div className="mc-card-lbl">Tổng ứng viên</div>
                  </div>
                  <div className="mc-card">
                    <div className="mc-card-ico" style={{ color: '#5EEAD4' }}>✅</div>
                    <div className="mc-card-num">31%</div>
                    <div className="mc-card-lbl">Tỷ lệ đậu</div>
                  </div>
                  <div className="mc-card">
                    <div className="mc-card-ico" style={{ color: '#A5B4FC' }}>⚡</div>
                    <div className="mc-card-num">4.2ph</div>
                    <div className="mc-card-lbl">Thời gian TB</div>
                  </div>
                  <div className="mc-card">
                    <div className="mc-card-ico" style={{ color: '#86EFAC' }}>🏆</div>
                    <div className="mc-card-num" style={{ color: '#5EEAD4' }}>6</div>
                    <div className="mc-card-lbl">Đã tuyển</div>
                  </div>
                </div>
                <div className="mc-row">
                  <div className="mc-chart">
                    <div className="mc-chart-title">Ứng viên theo vị trí</div>
                    <div className="mc-bars">
                      <div className="mc-bar" style={{ height: '70%', background: '#0D9488' }} />
                      <div className="mc-bar" style={{ height: '55%', background: '#4338CA' }} />
                      <div className="mc-bar" style={{ height: '80%', background: '#0D9488' }} />
                      <div className="mc-bar" style={{ height: '45%', background: '#4338CA' }} />
                      <div className="mc-bar" style={{ height: '65%', background: '#0D9488' }} />
                    </div>
                  </div>
                  <div className="mc-table">
                    <div className="mc-table-title">Ứng viên gần đây</div>
                    <div className="mc-tr">
                      <div className="mc-avatar">TK</div>
                      <div className="mc-name">Trần M. Khoa</div>
                      <div className="mc-badge" style={{ background: '#FEF3C7', color: '#D97706' }}>Chờ lịch</div>
                    </div>
                    <div className="mc-tr">
                      <div className="mc-avatar" style={{ background: 'rgba(13,148,136,0.4)' }}>LH</div>
                      <div className="mc-name">Lê Thị Hà</div>
                      <div className="mc-badge" style={{ background: '#DCFCE7', color: '#16A34A' }}>Đã tuyển</div>
                    </div>
                    <div className="mc-tr">
                      <div className="mc-avatar" style={{ background: 'rgba(124,58,237,0.4)' }}>PD</div>
                      <div className="mc-name">Phạm V. Đức</div>
                      <div className="mc-badge" style={{ background: '#EEF2FF', color: '#4338CA' }}>PV AI</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section how-section" id="how">
        <div className="section-inner">
          <div style={{ textAlign: 'center' }}>
            <div className="section-tag">
              <i className="ti ti-route" style={{ fontSize: 14 }} /> Quy trình
            </div>
            <div className="section-title">5 bước tuyển dụng tự động</div>
            <p className="section-sub" style={{ margin: '0 auto' }}>
              Từ khi nhận CV đến khi xác nhận lịch phỏng vấn — không cần HR can thiệp thủ công.
            </p>
          </div>

          <div className="how-steps">
            <div className="how-step">
              <div className="how-icon-wrap" style={{ background: 'linear-gradient(135deg,#0D9488,#0F766E)' }}>
                <i className="ti ti-file-cv" style={{ color: '#fff' }} />
              </div>
              <div className="how-name">Nhận hồ sơ</div>
              <div className="how-desc">Ứng viên nộp CV qua portal hoặc email. Hệ thống nhận tự động 24/7.</div>
            </div>
            <div className="how-step">
              <div className="how-icon-wrap" style={{ background: 'linear-gradient(135deg,#4338CA,#3730A3)' }}>
                <i className="ti ti-cpu" style={{ color: '#fff' }} />
              </div>
              <div className="how-name">Phân tích CV</div>
              <div className="how-desc">AI trích xuất kỹ năng, kinh nghiệm và cho điểm phù hợp với JD.</div>
            </div>
            <div className="how-step">
              <div className="how-icon-wrap" style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}>
                <i className="ti ti-message-chatbot" style={{ color: '#fff' }} />
              </div>
              <div className="how-name">Phỏng vấn AI</div>
              <div className="how-desc">Chatbot phỏng vấn tự động, đánh giá năng lực theo từng vị trí.</div>
            </div>
            <div className="how-step">
              <div className="how-icon-wrap" style={{ background: 'linear-gradient(135deg,#D97706,#B45309)' }}>
                <i className="ti ti-calendar-event" style={{ color: '#fff' }} />
              </div>
              <div className="how-name">Lên lịch</div>
              <div className="how-desc">Hệ thống tự đề xuất khung giờ, ứng viên chọn và xác nhận.</div>
            </div>
            <div className="how-step">
              <div className="how-icon-wrap" style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)' }}>
                <i className="ti ti-trophy" style={{ color: '#fff' }} />
              </div>
              <div className="how-name">Quyết định</div>
              <div className="how-desc">HR nhận báo cáo tổng hợp và ra quyết định tuyển dụng cuối cùng.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AGENTS ── */}
      <section className="lp-section agents-section" id="agents">
        <div className="section-inner">
          <div className="section-tag">
            <i className="ti ti-robot" style={{ fontSize: 14 }} /> AI Agent
          </div>
          <div className="section-title">5 AI Agent làm việc song song</div>
          <p className="section-sub">
            Mỗi agent chuyên biệt một nhiệm vụ, phối hợp liền mạch để cho kết quả chính xác nhất.
          </p>

          <div className="agents-grid">
            <div className="agent-card ac1">
              <div className="agent-icon ai1"><i className="ti ti-file-search" /></div>
              <div className="agent-name">Parse CV Agent</div>
              <div className="agent-desc">Đọc và phân tích CV bằng NLP, trích xuất tên, kỹ năng, kinh nghiệm, học vấn thành dữ liệu có cấu trúc. Hỗ trợ PDF, DOCX, và các định dạng phổ biến.</div>
              <span className="agent-tag at1"><i className="ti ti-check" style={{ fontSize: 10 }} /> NLP · Trích xuất thông tin</span>
            </div>

            <div className="agent-card ac2">
              <div className="agent-icon ai2"><i className="ti ti-target-arrow" /></div>
              <div className="agent-name">Match JD Agent</div>
              <div className="agent-desc">So khớp profile ứng viên với mô tả công việc, tính điểm tương đồng. Tự động loại ứng viên dưới ngưỡng 30/100 để tiết kiệm thời gian HR.</div>
              <span className="agent-tag at2"><i className="ti ti-check" style={{ fontSize: 10 }} /> Scoring · Auto-reject &lt; 30</span>
            </div>

            <div className="agent-card ac3">
              <div className="agent-icon ai3"><i className="ti ti-message-chatbot" /></div>
              <div className="agent-name">Interview AI Agent</div>
              <div className="agent-desc">Thực hiện vòng phỏng vấn sơ khảo qua chatbot thông minh. Đặt câu hỏi theo vị trí, đánh giá câu trả lời, và tổng hợp nhận xét chi tiết.</div>
              <span className="agent-tag at3"><i className="ti ti-check" style={{ fontSize: 10 }} /> Chatbot · Đánh giá năng lực</span>
            </div>

            <div className="agent-card ac4">
              <div className="agent-icon ai4"><i className="ti ti-calendar-plus" /></div>
              <div className="agent-name">Schedule Agent</div>
              <div className="agent-desc">Tự động kiểm tra lịch trống của HR và ứng viên, đề xuất khung giờ phù hợp, gửi email xác nhận và nhắc nhở trước buổi phỏng vấn.</div>
              <span className="agent-tag at4"><i className="ti ti-check" style={{ fontSize: 10 }} /> Calendar sync · Email tự động</span>
            </div>

            <div className="agent-card ac5">
              <div className="agent-icon ai5"><i className="ti ti-chart-bar" /></div>
              <div className="agent-name">Report Agent</div>
              <div className="agent-desc">Tổng hợp toàn bộ dữ liệu quy trình thành báo cáo trực quan — điểm số, nhận xét, so sánh giữa các ứng viên — giúp HR quyết định nhanh hơn.</div>
              <span className="agent-tag at5"><i className="ti ti-check" style={{ fontSize: 10 }} /> Analytics · So sánh ứng viên</span>
            </div>

            <div className="agent-card agent-cta-card">
              <div className="agent-cta-icon">
                <i className="ti ti-sparkles" />
              </div>
              <div className="agent-cta-title">Trải nghiệm ngay</div>
              <div className="agent-cta-desc">5 AI Agent sẵn sàng xử lý hồ sơ cho bạn ngay hôm nay.</div>
              <button className="btn-cta-nav" onClick={goToAuth}>
                Bắt đầu miễn phí →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── NUMBERS ── */}
      <section className="numbers-section" id="numbers">
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div className="section-tag" style={{
            background: 'rgba(94,234,212,0.12)',
            color: 'var(--color-teal-light)',
            border: '1px solid rgba(94,234,212,0.2)',
          }}>
            <i className="ti ti-chart-line" style={{ fontSize: 14 }} /> Con số thực tế
          </div>
          <div className="section-title" style={{ color: 'var(--bg-surface)' }}>Kết quả đã được chứng minh</div>
          <p className="section-sub" style={{ color: 'rgba(255,255,255,0.5)', margin: '0 auto 0' }}>
            Số liệu từ 500+ công ty đang sử dụng RecruitAI.
          </p>
          <div className="numbers-grid">
            <div className="number-item">
              <div className="number-val">10<span>×</span></div>
              <div className="number-lbl">Tốc độ xử lý hồ sơ tăng</div>
            </div>
            <div className="number-item">
              <div className="number-val">95<span>%</span></div>
              <div className="number-lbl">Độ chính xác phân tích CV</div>
            </div>
            <div className="number-item">
              <div className="number-val">72<span>%</span></div>
              <div className="number-lbl">Giảm thời gian HR thủ công</div>
            </div>
            <div className="number-item">
              <div className="number-val">4.8<span>★</span></div>
              <div className="number-lbl">Đánh giá từ người dùng</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="lp-section testimonials-section" id="reviews">
        <div className="section-inner">
          <div className="section-tag">
            <i className="ti ti-quote" style={{ fontSize: 14 }} /> Đánh giá
          </div>
          <div className="section-title">HR nói gì về RecruitAI?</div>
          <div className="testi-grid">
            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">"Trước đây mất 3 tuần để sàng lọc 200 hồ sơ. Với RecruitAI, chúng tôi hoàn thành trong 2 ngày với chất lượng ứng viên vào vòng tiếp theo tốt hơn hẳn."</div>
              <div className="testi-author">
                <div className="testi-avatar ta1">NH</div>
                <div>
                  <div className="testi-name">Nguyễn Hải Yến</div>
                  <div className="testi-role">HR Manager · FPT Software</div>
                </div>
              </div>
            </div>
            <div className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <div className="testi-text">"Phần phỏng vấn AI thực sự ấn tượng. Ứng viên không phân biệt được với nhân viên thật và chất lượng câu hỏi rất chuyên sâu theo từng vị trí."</div>
              <div className="testi-author">
                <div className="testi-avatar ta2">TM</div>
                <div>
                  <div className="testi-name">Trần Minh Trí</div>
                  <div className="testi-role">Talent Acquisition · VNG</div>
                </div>
              </div>
            </div>
            <div className="testi-card">
              <div className="testi-stars">★★★★☆</div>
              <div className="testi-text">"Schedule Agent tiết kiệm cho chúng tôi cả trăm email mỗi tháng. Giờ lịch phỏng vấn được tổ chức gọn ghẽ, hiếm khi bị trùng hay hủy phút chót."</div>
              <div className="testi-author">
                <div className="testi-avatar ta3">LT</div>
                <div>
                  <div className="testi-name">Lê Thị Phương</div>
                  <div className="testi-role">HR Director · Tiki</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="section-inner">
          <div className="cta-title">Sẵn sàng tuyển dụng thông minh hơn?</div>
          <p className="cta-sub">Tạo tài khoản miễn phí và xử lý 50 hồ sơ đầu tiên không mất phí. Không cần thẻ tín dụng.</p>
          <div className="cta-actions">
            <button className="btn-cta-white" onClick={goToAuth}>
              <i className="ti ti-rocket" style={{ fontSize: 18 }} />
              Tạo tài khoản miễn phí
            </button>
            <button className="btn-cta-outline">
              <i className="ti ti-phone" style={{ fontSize: 18 }} />
              Liên hệ tư vấn
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-logo">
                <div className="logo-dot" />
                <span className="logo-text">RECRUIT<span>.AI</span></span>
              </div>
              <p className="footer-tagline">
                Nền tảng tuyển dụng thông minh — 5 AI Agent phối hợp liền mạch để tìm đúng người trong thời gian ngắn nhất.
              </p>
              <div className="footer-socials">
                <div className="social-btn"><i className="ti ti-brand-facebook" /></div>
                <div className="social-btn"><i className="ti ti-brand-linkedin" /></div>
                <div className="social-btn"><i className="ti ti-brand-twitter" /></div>
                <div className="social-btn"><i className="ti ti-brand-youtube" /></div>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Sản phẩm</div>
              <div className="footer-links">
                <a className="footer-link" href="#">Tính năng</a>
                <a className="footer-link" href="#">Bảng giá</a>
                <a className="footer-link" href="#">AI Agent</a>
                <a className="footer-link" href="#">Tích hợp API</a>
                <a className="footer-link" href="#">Changelog</a>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Tài nguyên</div>
              <div className="footer-links">
                <a className="footer-link" href="#">Tài liệu</a>
                <a className="footer-link" href="#">Blog HR</a>
                <a className="footer-link" href="#">Case Study</a>
                <a className="footer-link" href="#">Hỗ trợ</a>
                <a className="footer-link" href="#">Cộng đồng</a>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Công ty</div>
              <div className="footer-links">
                <a className="footer-link" href="#">Về chúng tôi</a>
                <a className="footer-link" href="#">Tuyển dụng</a>
                <a className="footer-link" href="#">Đối tác</a>
                <a className="footer-link" href="#">Liên hệ</a>
                <a className="footer-link" href="#">Bảo mật</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="footer-copy">© 2026 RecruitAI. Bảo lưu mọi quyền.</span>
            <span className="footer-copy">Được xây dựng với ❤️ tại Việt Nam</span>
          </div>
        </div>
      </footer>
    </>
  )
}
