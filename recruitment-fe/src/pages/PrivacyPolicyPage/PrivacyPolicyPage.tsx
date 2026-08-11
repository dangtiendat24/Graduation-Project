import { Link } from 'react-router-dom'
import './LegalPage.css'

export default function PrivacyPolicyPage() {
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
        <h1 className="legal-title">Chính sách bảo mật</h1>
        <p className="legal-updated">Cập nhật lần cuối: 08/2026</p>

        <h2>1. Thông tin chúng tôi thu thập</h2>
        <ul>
          <li>Thông tin tài khoản: họ tên, email, số điện thoại, ảnh đại diện;</li>
          <li>Đối với Ứng viên: CV đã tải lên và nội dung được AI trích xuất từ CV (kỹ năng, kinh nghiệm, học vấn), thành phố, LinkedIn, GitHub/portfolio, câu trả lời trong buổi phỏng vấn AI;</li>
          <li>Đối với Nhà tuyển dụng: thông tin công ty (tên, logo, ảnh bìa, mô tả, địa chỉ), nội dung tin tuyển dụng;</li>
          <li>Dữ liệu lịch (Google Calendar) — chỉ khi Nhà tuyển dụng chủ động kết nối để xếp lịch phỏng vấn;</li>
          <li>Nhật ký kỹ thuật cần thiết để vận hành hệ thống (thời điểm đăng nhập, log xử lý của các AI Agent).</li>
        </ul>

        <h2>2. Mục đích sử dụng dữ liệu</h2>
        <p>Dữ liệu được thu thập chỉ nhằm phục vụ các chức năng cốt lõi của nền tảng:</p>
        <ul>
          <li>Phân tích CV và chấm điểm mức độ phù hợp với tin tuyển dụng;</li>
          <li>Thực hiện và chấm điểm phỏng vấn sơ loại bằng AI;</li>
          <li>Đề xuất và xác nhận lịch phỏng vấn;</li>
          <li>Tạo báo cáo tuyển dụng cho Nhà tuyển dụng;</li>
          <li>Gửi email thông báo liên quan đến quá trình ứng tuyển (theo tuỳ chọn thông báo bạn đã bật trong Cài đặt).</li>
        </ul>

        <h2>3. Chia sẻ dữ liệu</h2>
        <p>
          Hồ sơ và kết quả chấm điểm của Ứng viên chỉ được chia sẻ với Nhà tuyển dụng của (các) tin
          tuyển dụng mà Ứng viên đã chủ động nộp đơn. Chúng tôi <strong>không bán</strong> dữ liệu cá
          nhân cho bên thứ ba. Dữ liệu chỉ được xử lý bởi các dịch vụ hạ tầng cần thiết để vận hành nền
          tảng (lưu trữ file, cơ sở dữ liệu, mô hình AI xử lý CV/phỏng vấn).
        </p>

        <h2>4. Lưu trữ và bảo mật</h2>
        <p>
          Dữ liệu văn bản được lưu trong cơ sở dữ liệu có kiểm soát truy cập. File CV, logo, ảnh đại
          diện được lưu trong kho lưu trữ riêng tư, chỉ truy cập được qua đường dẫn có chữ ký thời hạn.
          Mật khẩu được mã hoá một chiều (hash), chúng tôi không lưu trữ mật khẩu dạng văn bản thường ở
          bất kỳ đâu.
        </p>

        <h2>5. Đăng nhập bằng Google</h2>
        <p>
          Nếu bạn chọn đăng nhập bằng Google (chỉ áp dụng cho tài khoản Ứng viên), chúng tôi chỉ nhận và
          lưu trữ email, họ tên và ảnh đại diện công khai từ Google — không truy cập các dữ liệu Google
          khác của bạn. Nếu Nhà tuyển dụng kết nối Google Calendar để xếp lịch, chúng tôi chỉ đọc thông
          tin khung giờ trống, không đọc nội dung sự kiện.
        </p>

        <h2>6. Quyền của bạn</h2>
        <p>Bạn có quyền:</p>
        <ul>
          <li>Xem, chỉnh sửa thông tin cá nhân bất kỳ lúc nào trong trang Hồ sơ/Cài đặt tài khoản;</li>
          <li>Xoá hoặc thay thế CV, ảnh đại diện đã tải lên;</li>
          <li>Đổi mật khẩu (đối với tài khoản đăng ký bằng email) hoặc yêu cầu đặt lại mật khẩu qua email;</li>
          <li>Yêu cầu xoá tài khoản và toàn bộ dữ liệu cá nhân liên quan.</li>
        </ul>

        <h2>7. Phiên đăng nhập</h2>
        <p>
          Nền tảng sử dụng JSON Web Token (JWT) lưu trên trình duyệt của bạn để duy trì phiên đăng nhập,
          có hiệu lực tối đa 7 ngày. Không dùng cookie theo dõi quảng cáo của bên thứ ba.
        </p>

        <h2>8. Thay đổi chính sách</h2>
        <p>
          Chính sách bảo mật có thể được cập nhật để phản ánh đúng các tính năng hiện có của nền tảng.
          Phiên bản mới nhất luôn được đăng tại trang này.
        </p>

        <h2>9. Liên hệ</h2>
        <p>
          Mọi câu hỏi liên quan đến quyền riêng tư và dữ liệu cá nhân, vui lòng liên hệ:{' '}
          <a href="mailto:support@recruitai.vn">support@recruitai.vn</a>.
        </p>
      </div>
    </div>
  )
}
