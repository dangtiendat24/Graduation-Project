import { Link } from 'react-router-dom'
import './LegalPage.css'

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-header">
        <Link to="/" className="legal-logo">
          <div className="legal-logo-dot" />
          <span className="legal-logo-name">RECRUIT<span>.AI</span></span>
        </Link>
        <Link to="/login" className="legal-back">
          <i className="ti ti-arrow-left" /> Quay lại đăng nhập
        </Link>
      </div>

      <div className="legal-card">
        <h1 className="legal-title">Điều khoản sử dụng</h1>
        <p className="legal-updated">Cập nhật lần cuối: 08/2026</p>

        <h2>1. Giới thiệu</h2>
        <p>
          RecruitAI ("chúng tôi", "nền tảng") là dịch vụ tuyển dụng trực tuyến cho phép Nhà tuyển dụng
          đăng tin tuyển dụng, quản lý ứng viên, và cho phép Ứng viên tìm việc, nộp hồ sơ (CV) và tham
          gia phỏng vấn sơ loại bằng AI. Khi tạo tài khoản và sử dụng nền tảng, bạn đồng ý với các điều
          khoản dưới đây.
        </p>

        <h2>2. Tài khoản người dùng</h2>
        <p>
          Nền tảng có 2 loại tài khoản: <strong>Nhà tuyển dụng</strong> (đăng ký bằng email và mật khẩu)
          và <strong>Ứng viên</strong> (đăng ký bằng email/mật khẩu hoặc đăng nhập bằng Google). Bạn chịu
          trách nhiệm bảo mật thông tin đăng nhập của mình và mọi hoạt động diễn ra dưới tài khoản đó.
          Thông tin đăng ký phải chính xác và trung thực.
        </p>

        <h2>3. Sử dụng AI trong quy trình tuyển dụng</h2>
        <p>
          RecruitAI sử dụng các tác vụ AI tự động trong quy trình tuyển dụng, bao gồm nhưng không giới
          hạn ở:
        </p>
        <ul>
          <li>Trích xuất và phân tích nội dung CV thành dữ liệu có cấu trúc (kỹ năng, kinh nghiệm, học vấn);</li>
          <li>Chấm điểm mức độ phù hợp giữa hồ sơ ứng viên và mô tả công việc (JD);</li>
          <li>Thực hiện phỏng vấn sơ loại bằng chatbot AI và chấm điểm câu trả lời;</li>
          <li>Đề xuất khung giờ phỏng vấn dựa trên lịch trống (nếu Nhà tuyển dụng kết nối Google Calendar);</li>
          <li>Tổng hợp báo cáo kết quả tuyển dụng cho Nhà tuyển dụng.</li>
        </ul>
        <p>
          Kết quả từ AI mang tính chất hỗ trợ ra quyết định — quyết định tuyển dụng cuối cùng luôn thuộc
          về Nhà tuyển dụng. Ứng viên có quyền yêu cầu xem lại điểm số và giải thích của AI thông qua
          trang chi tiết đơn ứng tuyển của mình.
        </p>

        <h2>4. Trách nhiệm của Nhà tuyển dụng</h2>
        <p>
          Nhà tuyển dụng cam kết đăng tin tuyển dụng chính xác, hợp pháp, không phân biệt đối xử, và chỉ
          sử dụng thông tin ứng viên (CV, kết quả chấm điểm, kết quả phỏng vấn AI) cho mục đích tuyển
          dụng của vị trí liên quan.
        </p>

        <h2>5. Trách nhiệm của Ứng viên</h2>
        <p>
          Ứng viên cam kết cung cấp thông tin CV và câu trả lời phỏng vấn trung thực. Việc cung cấp
          thông tin sai sự thật có thể dẫn đến việc đơn ứng tuyển bị từ chối hoặc tài khoản bị khoá.
        </p>

        <h2>6. Hành vi bị cấm</h2>
        <ul>
          <li>Tạo tài khoản giả mạo hoặc mạo danh người khác;</li>
          <li>Đăng tải nội dung vi phạm pháp luật, phân biệt đối xử, hoặc xâm phạm quyền riêng tư của người khác;</li>
          <li>Cố ý can thiệp, dò quét lỗ hổng hoặc phá hoại hoạt động của nền tảng;</li>
          <li>Sử dụng dữ liệu thu thập được từ nền tảng ngoài mục đích tuyển dụng hợp pháp.</li>
        </ul>

        <h2>7. Chấm dứt tài khoản</h2>
        <p>
          Chúng tôi có quyền tạm khoá hoặc chấm dứt tài khoản vi phạm các điều khoản trên. Bạn có thể
          yêu cầu xoá tài khoản và dữ liệu cá nhân bất kỳ lúc nào theo{' '}
          <Link to="/privacy-policy">Chính sách bảo mật</Link>.
        </p>

        <h2>8. Thay đổi điều khoản</h2>
        <p>
          Điều khoản có thể được cập nhật theo thời gian để phù hợp với tính năng mới của nền tảng.
          Phiên bản mới nhất luôn được đăng tại trang này.
        </p>

        <h2>9. Liên hệ</h2>
        <p>
          Nếu có thắc mắc về điều khoản sử dụng, vui lòng liên hệ qua email:{' '}
          <a href="mailto:support@recruitai.vn">support@recruitai.vn</a>.
        </p>
      </div>
    </div>
  )
}
