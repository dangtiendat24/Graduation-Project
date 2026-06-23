-- =============================================================================
-- AI Multi-Agent Recruitment Platform
-- schema.sql — Database Initialization Script
-- =============================================================================
-- Version:     1.2 (đồng bộ users với entity thực tế)
-- Date:        2026-06-22
-- Target DB:   PostgreSQL 16+ (yêu cầu gen_random_uuid native, không cần extension)
-- Author:      Cường · Đạt · Nhung · Hiền
--
-- CHANGELOG v1.2:
--   [~] §1  TABLE users           — password_hash nullable (Google OAuth không có password)
--   [~] §1  TABLE users           — is_active DEFAULT FALSE (email verification flow)
--   [~] §1  TABLE users           — full_name VARCHAR(100) khớp entity
--   [+] §1  TABLE users           — thêm google_id, email_verify_token, email_verify_expires
--
-- CHANGELOG v1.1:
--   [+] §2  TABLE companies       — Hồ sơ công ty của Recruiter (MỚI)
--   [~] §3  TABLE jobs            — Thêm cột company_id FK → companies (nullable)
--   [~] §0  RESET MODE            — Thêm DROP companies, cập nhật thứ tự drop
--   [~] §13 VERIFY                — Cập nhật kỳ vọng: tables 10→11, FK 9→11
--
-- HƯỚNG DẪN SỬ DỤNG:
--   1. Tạo database trước:
--        psql -U postgres -c "CREATE DATABASE recruitment;"
--   2. Chạy script:
--        psql -U postgres -d recruitment -f schema.sql
--   3. Verify:
--        psql -U postgres -d recruitment -c "\dt"     -- list tables
--        psql -U postgres -d recruitment -c "\dv"     -- list views
--        psql -U postgres -d recruitment -c "\di"     -- list indexes
--
-- LƯU Ý:
--   - Script này GIẢ ĐỊNH database trống. Nếu chạy lại trên DB đã có schema sẽ FAIL.
--   - Để reset hoàn toàn: uncomment khối DROP ở §0 phía dưới, chạy 1 lần, rồi comment lại.
--   - KHÔNG dùng cho production migration. Production dùng TypeORM migrations.
--   - Toàn bộ rule transition trạng thái application enforce ở APP LAYER (NestJS),
--     không phải SQL trigger. Xem ADR-007 và ERD v4.0 §5.
-- =============================================================================


-- =============================================================================
-- §0. RESET MODE (uncomment khi muốn drop hết và init lại từ zero)
-- =============================================================================
-- WARNING: Chạy block này sẽ XOÁ TOÀN BỘ DỮ LIỆU. Không có undo.
-- Thứ tự DROP phải ngược FK dependency: leaf tables trước, parent tables sau.
--
-- DROP VIEW  IF EXISTS vw_recruiter_dashboard       CASCADE;
-- DROP TABLE IF EXISTS candidate_reports            CASCADE;
-- DROP TABLE IF EXISTS schedules                    CASCADE;
-- DROP TABLE IF EXISTS interview_sessions           CASCADE;
-- DROP TABLE IF EXISTS matching_results             CASCADE;
-- DROP TABLE IF EXISTS application_status_history   CASCADE;
-- DROP TABLE IF EXISTS applications                 CASCADE;
-- DROP TABLE IF EXISTS user_oauth_tokens            CASCADE;
-- DROP TABLE IF EXISTS candidate_profiles           CASCADE;
-- DROP TABLE IF EXISTS jobs                         CASCADE;  -- FK → companies
-- DROP TABLE IF EXISTS companies                    CASCADE;  -- [v1.1] DROP sau jobs
-- DROP TABLE IF EXISTS users                        CASCADE;


-- =============================================================================
-- §1. TABLE: users — Tài khoản (Recruiter + Candidate)
-- =============================================================================

CREATE TABLE users (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email                VARCHAR(255) NOT NULL,
    password_hash        VARCHAR(60),
    role                 VARCHAR(20)  NOT NULL,
    full_name            VARCHAR(100) NOT NULL,
    phone                VARCHAR(20),
    avatar_url           VARCHAR(500),
    google_id            VARCHAR(255),
    is_active            BOOLEAN      NOT NULL DEFAULT FALSE,
    email_verify_token   VARCHAR(255),
    email_verify_expires TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email              UNIQUE (email),
    CONSTRAINT uq_users_google_id          UNIQUE (google_id),
    CONSTRAINT uq_users_email_verify_token UNIQUE (email_verify_token),
    CONSTRAINT chk_users_role   CHECK (role IN ('recruiter', 'candidate'))
);

CREATE INDEX idx_users_role ON users(role);

COMMENT ON TABLE  users                IS 'Tài khoản người dùng: Recruiter và Candidate. Bảng trung tâm.';
COMMENT ON COLUMN users.password_hash        IS 'bcrypt cost 10 output (60 ký tự). NULL khi đăng ký bằng Google OAuth';
COMMENT ON COLUMN users.role                 IS 'Phân quyền: recruiter hoặc candidate. Enforce qua CHECK constraint';
COMMENT ON COLUMN users.google_id            IS 'Google sub claim. NULL với tài khoản đăng ký thường. UNIQUE để tránh duplicate';
COMMENT ON COLUMN users.is_active            IS 'FALSE (default) = chờ verify email. TRUE = đã active. Soft-disable: set FALSE, không xóa data';
COMMENT ON COLUMN users.email_verify_token   IS 'Token gửi qua email để xác thực. NULL sau khi đã verify hoặc dùng Google OAuth';
COMMENT ON COLUMN users.email_verify_expires IS 'Thời hạn hiệu lực của email_verify_token. NULL nếu không có token';


-- =============================================================================
-- §2. TABLE: companies — Hồ sơ công ty của Recruiter          [MỚI — v1.1]
-- =============================================================================
-- Thiết kế: 1 Recruiter = 1 Company (UNIQUE recruiter_id).
-- Không phải multi-tenant — mỗi recruiter tự quản lý trang công ty của mình.
-- is_published = FALSE → draft, chỉ recruiter thấy.
-- is_published = TRUE  → công khai, ứng viên tìm kiếm thấy trên /candidate/jobs.
--
-- Mapping với UI màn hình /recruiter/company:
--   Tab "Thông tin cơ bản"       → name, short_name, tagline, industry,
--                                   company_type, size_range, founded_year
--   Tab "Giới thiệu & văn hoá"   → short_desc, full_desc, work_model,
--                                   work_language, tech_stack, perks
--   Tab "Liên hệ & MXH"          → address, city, website,
--                                   linkedin_url, facebook_url
--   Tab "Hình ảnh & thương hiệu" → logo_url, cover_url
-- =============================================================================

CREATE TABLE companies (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id      UUID         NOT NULL,

    -- ── Thông tin cơ bản ──────────────────────────────────────────────────────
    name              VARCHAR(255) NOT NULL,
    short_name        VARCHAR(100),
    tagline           VARCHAR(255),
    logo_url          VARCHAR(500),
    cover_url         VARCHAR(500),

    -- ── Phân loại ─────────────────────────────────────────────────────────────
    industry          VARCHAR(100),
    company_type      VARCHAR(20),
    size_range        VARCHAR(20),
    founded_year      SMALLINT,

    -- ── Mô tả ─────────────────────────────────────────────────────────────────
    short_desc        VARCHAR(500),
    full_desc         TEXT,
    work_model        VARCHAR(10),
    work_language     VARCHAR(50),

    -- ── Danh sách động (JSONB array of strings) ───────────────────────────────
    tech_stack        JSONB,
    perks             JSONB,

    -- ── Liên hệ & mạng xã hội ────────────────────────────────────────────────
    address           TEXT,
    city              VARCHAR(100),
    website           VARCHAR(500),
    linkedin_url      VARCHAR(500),
    facebook_url      VARCHAR(500),

    -- ── Trạng thái xuất bản ───────────────────────────────────────────────────
    is_published      BOOLEAN      NOT NULL DEFAULT FALSE,

    -- ── Audit ─────────────────────────────────────────────────────────────────
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT uq_companies_recruiter_id
        UNIQUE (recruiter_id),

    CONSTRAINT fk_companies_recruiter_id
        FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_companies_company_type
        CHECK (company_type IS NULL OR company_type IN (
            'startup', 'tnhh', 'co_phan', 'fdi', 'tap_doan'
        )),

    CONSTRAINT chk_companies_size_range
        CHECK (size_range IS NULL OR size_range IN (
            '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
        )),

    CONSTRAINT chk_companies_work_model
        CHECK (work_model IS NULL OR work_model IN (
            'onsite', 'hybrid', 'remote'
        )),

    CONSTRAINT chk_companies_founded_year
        CHECK (founded_year IS NULL OR (founded_year >= 1900 AND founded_year <= 2100))
);

CREATE INDEX idx_companies_industry    ON companies(industry);
CREATE INDEX idx_companies_city        ON companies(city);
-- Partial index: chỉ index các company đã xuất bản, dùng cho trang tìm kiếm ứng viên
CREATE INDEX idx_companies_published   ON companies(recruiter_id) WHERE is_published = TRUE;

COMMENT ON TABLE  companies                  IS '[v1.1] Hồ sơ công ty của Recruiter. 1 Recruiter = 1 Company (UNIQUE recruiter_id). is_published=TRUE mới hiển thị với ứng viên.';
COMMENT ON COLUMN companies.recruiter_id     IS 'FK → users.id. UNIQUE: mỗi recruiter chỉ có 1 trang công ty';
COMMENT ON COLUMN companies.logo_url         IS 'S3 KEY (không phải signed URL). Sign khi cần với expiry 1 giờ. PNG/JPG vuông, tối thiểu 200×200px';
COMMENT ON COLUMN companies.cover_url        IS 'S3 KEY. Ảnh bìa tỉ lệ 16:9, khuyến nghị 1200×400px';
COMMENT ON COLUMN companies.company_type     IS 'Enum: startup / tnhh / co_phan / fdi / tap_doan';
COMMENT ON COLUMN companies.size_range       IS 'Enum: 1-10 / 11-50 / 51-200 / 201-500 / 501-1000 / 1000+';
COMMENT ON COLUMN companies.work_model       IS 'Enum: onsite / hybrid / remote';
COMMENT ON COLUMN companies.tech_stack       IS 'JSONB string array. VD: ["React","Node.js","AWS"]. Hiển thị dạng tag trên trang công ty';
COMMENT ON COLUMN companies.perks            IS 'JSONB string array. VD: ["13 tháng lương","Remote linh hoạt"]. Tối đa 10 mục';
COMMENT ON COLUMN companies.short_desc       IS 'Tối đa 500 ký tự. Hiển thị trong kết quả tìm kiếm và card preview';
COMMENT ON COLUMN companies.is_published     IS 'FALSE (default)=draft chỉ recruiter thấy. TRUE=công khai, ứng viên tìm thấy qua /candidate/jobs';


-- =============================================================================
-- §3. TABLE: jobs — Tin tuyển dụng                            [CẬP NHẬT — v1.1]
-- =============================================================================
-- v1.1: Thêm cột company_id (FK → companies, nullable).
--   - NULL cho phép recruiter tạo JD trước khi hoàn thiện hồ sơ công ty.
--   - Khi company_id IS NOT NULL: JOIN companies để hiển thị logo + tên công ty
--     trên card JD và trang chi tiết JD cho ứng viên.
--   - ON DELETE SET NULL: xoá/reset company không làm mất JD.
-- =============================================================================

CREATE TABLE jobs (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id      UUID         NOT NULL,
    company_id        UUID,                                        -- [v1.1] FK → companies (nullable)
    title             VARCHAR(255) NOT NULL,
    department        VARCHAR(100),
    description       TEXT         NOT NULL,
    requirements      TEXT         NOT NULL,
    salary_range      VARCHAR(100),
    status            VARCHAR(20)  NOT NULL DEFAULT 'draft',
    deadline          DATE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_jobs_recruiter_id
        FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE RESTRICT,

    CONSTRAINT fk_jobs_company_id                                 -- [v1.1]
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,

    CONSTRAINT chk_jobs_status
        CHECK (status IN ('draft', 'active', 'closed'))
);

CREATE INDEX idx_jobs_recruiter        ON jobs(recruiter_id);
CREATE INDEX idx_jobs_company          ON jobs(company_id);       -- [v1.1]
CREATE INDEX idx_jobs_status           ON jobs(status);

-- Partial index: chỉ index các job 'active' để filter "active + chưa hết hạn" cho Candidate
CREATE INDEX idx_jobs_active_deadline  ON jobs(deadline) WHERE status = 'active';

COMMENT ON TABLE  jobs                IS 'Tin tuyển dụng do Recruiter tạo. id đồng thời là Point ID trong Qdrant collection "jobs"';
COMMENT ON COLUMN jobs.company_id     IS '[v1.1] FK → companies.id (nullable). NULL khi recruiter chưa tạo hồ sơ công ty. ON DELETE SET NULL.';
COMMENT ON COLUMN jobs.salary_range   IS 'Free-text "20-30 triệu". KHÔNG dùng cho matching scoring (per M1)';
COMMENT ON COLUMN jobs.status         IS 'draft/active/closed. "Xóa" JD = soft delete bằng UPDATE status=closed (per M8)';
COMMENT ON COLUMN jobs.deadline       IS 'Hạn nộp đơn. NULL = không có deadline cụ thể';


-- =============================================================================
-- §4. TABLE: candidate_profiles — Hồ sơ ứng viên sau khi parse CV
-- =============================================================================

CREATE TABLE candidate_profiles (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL,
    cv_file_url       VARCHAR(500),
    cv_raw_text       TEXT,
    parsed_data       JSONB,
    is_parsed         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_candidate_profiles_user_id UNIQUE (user_id),

    CONSTRAINT fk_candidate_profiles_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_candidate_profiles_parsed ON candidate_profiles(is_parsed);

COMMENT ON TABLE  candidate_profiles                IS 'Hồ sơ ứng viên sau khi Agent 1 (Resume Parser) extract. id đồng thời là Point ID trong Qdrant collection "cvs"';
COMMENT ON COLUMN candidate_profiles.cv_file_url    IS 'S3 KEY (không phải signed URL). Sign khi cần dùng với expiration 5 phút';
COMMENT ON COLUMN candidate_profiles.cv_raw_text    IS 'Output từ pdf-parse/mammoth. NULL nếu parse fail';
COMMENT ON COLUMN candidate_profiles.parsed_data    IS 'JSON cấu trúc {name, email, phone, summary, skills[], experience[], education[]}. Validate Zod ở app layer';
COMMENT ON COLUMN candidate_profiles.is_parsed      IS 'TRUE sau khi Agent 1 thành công. Nút "Apply" trên UI chỉ enable khi TRUE';


-- =============================================================================
-- §5. TABLE: user_oauth_tokens — Google OAuth tokens (cho Recruiter)
-- =============================================================================

CREATE TABLE user_oauth_tokens (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL,
    provider          VARCHAR(20)  NOT NULL DEFAULT 'google',
    access_token      TEXT         NOT NULL,
    refresh_token     TEXT         NOT NULL,
    token_type        VARCHAR(20)  NOT NULL DEFAULT 'Bearer',
    expires_at        TIMESTAMPTZ  NOT NULL,
    scope             TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_oauth_tokens_user_id UNIQUE (user_id),

    CONSTRAINT fk_user_oauth_tokens_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_user_oauth_tokens_provider
        CHECK (provider IN ('google'))
);

CREATE INDEX idx_user_oauth_tokens_expires ON user_oauth_tokens(expires_at);

COMMENT ON TABLE  user_oauth_tokens                 IS 'Google OAuth 2.0 tokens cho Recruiter, dùng bởi Agent 4 (Scheduling)';
COMMENT ON COLUMN user_oauth_tokens.access_token    IS 'AES-256-GCM encrypted (base64 encoded). KHÔNG BAO GIỜ log plaintext. Khóa lưu env OAUTH_ENCRYPTION_KEY';
COMMENT ON COLUMN user_oauth_tokens.refresh_token   IS 'AES-256-GCM encrypted. Dùng để refresh access_token khi hết hạn';
COMMENT ON COLUMN user_oauth_tokens.expires_at      IS 'Thời điểm access_token hết hạn. Cron job tìm những token sắp hết hạn để auto-refresh';


-- =============================================================================
-- §6. TABLE: applications — Đơn ứng tuyển (bảng giao dịch trung tâm)
-- =============================================================================

CREATE TABLE applications (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id      UUID         NOT NULL,
    job_id            UUID         NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'pending',
    applied_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_applications_candidate_job
        UNIQUE (candidate_id, job_id),

    CONSTRAINT fk_applications_candidate_id
        FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE RESTRICT,

    CONSTRAINT fk_applications_job_id
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT,

    CONSTRAINT chk_applications_status
        CHECK (status IN (
            'pending', 'matched', 'interviewed', 'schedule_sent',
            'scheduled', 'completed', 'hired', 'rejected'
        )),

    CONSTRAINT chk_applications_terminal_no_backdate
        CHECK (NOT (status IN ('hired', 'rejected') AND updated_at < applied_at))
);

CREATE INDEX idx_applications_candidate    ON applications(candidate_id);
CREATE INDEX idx_applications_job          ON applications(job_id);
CREATE INDEX idx_applications_status       ON applications(status);
CREATE INDEX idx_applications_applied_date ON applications(applied_at DESC);
CREATE INDEX idx_applications_job_applied  ON applications(job_id, applied_at DESC);

CREATE INDEX idx_applications_job_active_status
    ON applications(job_id, status)
    WHERE status != 'pending';

COMMENT ON TABLE  applications            IS 'Đơn ứng tuyển. Bảng trung tâm kết nối Candidate, Job, và mọi kết quả AI';
COMMENT ON COLUMN applications.status     IS 'State machine 8 trạng thái. Toàn bộ transitions enforce qua ApplicationsService.transitionStatus() ở NestJS, KHÔNG dùng SQL trigger';
COMMENT ON COLUMN applications.applied_at IS 'Immutable sau khi tạo. Dùng để tính KPI avg_hours_to_hire';


-- =============================================================================
-- §7. TABLE: application_status_history — Audit trail mọi transition status
-- =============================================================================

CREATE TABLE application_status_history (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID         NOT NULL,
    from_status       VARCHAR(20),
    to_status         VARCHAR(20)  NOT NULL,
    changed_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    changed_by        UUID,
    metadata          JSONB,

    CONSTRAINT fk_application_status_history_application_id
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,

    CONSTRAINT fk_application_status_history_changed_by
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT chk_application_status_history_to_status
        CHECK (to_status IN (
            'pending', 'matched', 'interviewed', 'schedule_sent',
            'scheduled', 'completed', 'hired', 'rejected'
        )),

    CONSTRAINT chk_application_status_history_from_status
        CHECK (from_status IS NULL OR from_status IN (
            'pending', 'matched', 'interviewed', 'schedule_sent',
            'scheduled', 'completed', 'hired', 'rejected'
        ))
);

CREATE INDEX idx_app_history_app_time
    ON application_status_history(application_id, changed_at);

CREATE INDEX idx_app_history_status_time
    ON application_status_history(to_status, changed_at);

COMMENT ON TABLE  application_status_history             IS 'Audit log mọi lần đổi trạng thái applications. Source-of-truth cho KPI avg_hours_to_hire';
COMMENT ON COLUMN application_status_history.from_status IS 'NULL = INSERT đầu (status từ "không có" → pending)';
COMMENT ON COLUMN application_status_history.changed_by  IS 'User trigger transition (Recruiter cho hired/rejected). NULL = transition do Agent (system)';
COMMENT ON COLUMN application_status_history.metadata    IS 'Free-form: {agent: "matching", score: 78, error: null}, etc.';


-- =============================================================================
-- §8. TABLE: matching_results — Output Agent 2 (CV-JD Matching)
-- =============================================================================

CREATE TABLE matching_results (
    id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID            NOT NULL,
    overall_score     NUMERIC(5, 2)   NOT NULL,
    criteria          JSONB           NOT NULL,
    qdrant_similarity NUMERIC(5, 4),
    explanation       TEXT            NOT NULL,
    recommendation    VARCHAR(20)     NOT NULL,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_matching_results_application_id UNIQUE (application_id),

    CONSTRAINT fk_matching_results_application_id
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,

    CONSTRAINT chk_matching_results_overall_score
        CHECK (overall_score >= 0 AND overall_score <= 100),

    CONSTRAINT chk_matching_results_similarity
        CHECK (qdrant_similarity IS NULL OR (qdrant_similarity >= 0 AND qdrant_similarity <= 1)),

    CONSTRAINT chk_matching_results_recommendation
        CHECK (recommendation IN ('strong_match', 'good_match', 'partial_match', 'poor_match'))
);

CREATE INDEX idx_matching_results_score ON matching_results(overall_score DESC);
CREATE INDEX idx_matching_results_reco  ON matching_results(recommendation);

COMMENT ON TABLE  matching_results                   IS 'Output của Agent 2 (CV-JD Matching). 1-1 với applications';
COMMENT ON COLUMN matching_results.criteria          IS 'JSONB {skills, experience, education: 0-100 each}. Trọng số: skills×0.45 + experience×0.35 + education×0.20';
COMMENT ON COLUMN matching_results.qdrant_similarity IS 'Cosine similarity [0,1] từ Qdrant. NULL khi fallback LLM full-text (per M2)';
COMMENT ON COLUMN matching_results.recommendation    IS 'strong_match(>=80) / good_match(60-79) / partial_match(40-59) / poor_match(<40)';


-- =============================================================================
-- §9. TABLE: interview_sessions — Phiên phỏng vấn AI (Agent 3)
-- =============================================================================

CREATE TABLE interview_sessions (
    id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID            NOT NULL,
    attempt_number    INT             NOT NULL DEFAULT 1,
    mode              VARCHAR(10)     NOT NULL,
    status            VARCHAR(20)     NOT NULL DEFAULT 'pending',
    questions         JSONB,
    answers           JSONB,
    transcript        TEXT,
    overall_score     NUMERIC(5, 2),
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_interview_sessions_app_attempt
        UNIQUE (application_id, attempt_number),

    CONSTRAINT fk_interview_sessions_application_id
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,

    CONSTRAINT chk_interview_sessions_attempt   CHECK (attempt_number >= 1),
    CONSTRAINT chk_interview_sessions_mode      CHECK (mode IN ('text', 'voice')),
    CONSTRAINT chk_interview_sessions_status    CHECK (status IN ('pending', 'in_progress', 'completed', 'timeout', 'cancelled')),
    CONSTRAINT chk_interview_sessions_score     CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
    CONSTRAINT chk_interview_sessions_time_order
        CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX idx_interview_sessions_app    ON interview_sessions(application_id);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX idx_interview_sessions_date   ON interview_sessions(created_at DESC);

COMMENT ON TABLE  interview_sessions                IS 'Phiên phỏng vấn AI. Cho phép retry: nhiều session/application phân biệt qua attempt_number';
COMMENT ON COLUMN interview_sessions.attempt_number IS '1-based. Lấy session hiện tại: ORDER BY attempt_number DESC LIMIT 1';
COMMENT ON COLUMN interview_sessions.questions      IS 'JSONB array [{id, question, category, difficulty}]';
COMMENT ON COLUMN interview_sessions.answers        IS 'JSONB array [{question_id, answer_text, audio_url?, scores:{relevance,clarity,depth,correctness:0-25}, total}]';
COMMENT ON COLUMN interview_sessions.overall_score  IS 'AVG(answers[*].total). Range [0,100].';


-- =============================================================================
-- §10. TABLE: schedules — Lịch phỏng vấn chính thức (Agent 4)
-- =============================================================================

CREATE TABLE schedules (
    id                       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id           UUID            NOT NULL,
    suggested_slots          JSONB           NOT NULL,
    confirmed_slot_index     INT,
    confirmed_start_time     TIMESTAMPTZ,
    confirmed_end_time       TIMESTAMPTZ,
    google_event_id          VARCHAR(255),
    meet_link                VARCHAR(500),
    status                   VARCHAR(20)     NOT NULL DEFAULT 'pending',
    email_sent_at            TIMESTAMPTZ,
    email_status             VARCHAR(20)     NOT NULL DEFAULT 'pending',
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_schedules_application_id UNIQUE (application_id),

    CONSTRAINT fk_schedules_application_id
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,

    CONSTRAINT chk_schedules_status        CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    CONSTRAINT chk_schedules_email_status  CHECK (email_status IN ('pending', 'sent', 'failed')),
    CONSTRAINT chk_schedules_slot_index
        CHECK (confirmed_slot_index IS NULL OR (confirmed_slot_index >= 0 AND confirmed_slot_index < 10)),
    CONSTRAINT chk_schedules_time_order
        CHECK (confirmed_end_time IS NULL OR confirmed_start_time IS NULL
               OR confirmed_end_time > confirmed_start_time),
    CONSTRAINT chk_schedules_confirmed_complete
        CHECK (status != 'confirmed' OR (
            confirmed_slot_index IS NOT NULL AND confirmed_start_time IS NOT NULL AND
            confirmed_end_time   IS NOT NULL AND google_event_id      IS NOT NULL
        ))
);

CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_time   ON schedules(confirmed_start_time);
CREATE UNIQUE INDEX uq_schedules_google_event_id
    ON schedules(google_event_id)
    WHERE google_event_id IS NOT NULL;

COMMENT ON TABLE  schedules                      IS 'Lịch phỏng vấn chính thức sau khi Agent 4 gửi slots và Candidate chọn';
COMMENT ON COLUMN schedules.suggested_slots      IS 'JSONB array [{start_time, end_time}]. 3-5 slots, mỗi slot 45 phút, timezone +07:00';
COMMENT ON COLUMN schedules.confirmed_slot_index IS '0-based index vào suggested_slots khi Candidate chọn';
COMMENT ON COLUMN schedules.google_event_id      IS 'ID event trên Google Calendar. NULL trước khi POST /scheduling/:id/confirm';
COMMENT ON COLUMN schedules.email_status         IS 'Track email retry: pending→sent/failed. BullMQ job quản lý retry';


-- =============================================================================
-- §11. TABLE: candidate_reports — Báo cáo cuối Agent 5
-- =============================================================================

CREATE TABLE candidate_reports (
    id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID            NOT NULL,
    match_score       NUMERIC(5, 2),
    match_criteria    JSONB,
    interview_score   NUMERIC(5, 2),
    overall_score     NUMERIC(5, 2),
    summary           TEXT            NOT NULL,
    strengths         JSONB           NOT NULL,
    weaknesses        JSONB           NOT NULL,
    recommendation    VARCHAR(10)     NOT NULL,
    pdf_url           VARCHAR(500),
    generated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_candidate_reports_application_id UNIQUE (application_id),

    CONSTRAINT fk_candidate_reports_application_id
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,

    CONSTRAINT chk_candidate_reports_recommendation
        CHECK (recommendation IN ('pass', 'fail', 'review')),
    CONSTRAINT chk_candidate_reports_match_score
        CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
    CONSTRAINT chk_candidate_reports_interview_score
        CHECK (interview_score IS NULL OR (interview_score >= 0 AND interview_score <= 100)),
    CONSTRAINT chk_candidate_reports_overall_score
        CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100))
);

CREATE INDEX idx_candidate_reports_score ON candidate_reports(overall_score DESC NULLS LAST);
CREATE INDEX idx_candidate_reports_reco  ON candidate_reports(recommendation);
CREATE INDEX idx_candidate_reports_date  ON candidate_reports(generated_at DESC);

COMMENT ON TABLE  candidate_reports                 IS 'Báo cáo đánh giá cuối từ Agent 5. Agent 5 trả JSON, NestJS dùng Puppeteer render PDF';
COMMENT ON COLUMN candidate_reports.interview_score IS 'NULL nếu nhánh auto-reject (Agent 2 score<30, không qua phỏng vấn)';
COMMENT ON COLUMN candidate_reports.recommendation  IS 'pass(>=70) / review(40-69) / fail(<40)';
COMMENT ON COLUMN candidate_reports.pdf_url         IS 'S3 key của PDF. NULL trước khi Puppeteer render xong';


-- =============================================================================
-- §12. VIEW: vw_recruiter_dashboard — Dashboard metrics aggregated per Recruiter
-- =============================================================================

CREATE OR REPLACE VIEW vw_recruiter_dashboard AS
SELECT
    j.recruiter_id,
    COUNT(DISTINCT a.id) AS total_applications,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status NOT IN ('pending','rejected')) AS passed_screening,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'hired')       AS hired_count,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'rejected')    AS rejected_count,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'interviewed') AS interviewed_count,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed')   AS completed_count,
    ROUND(
        100.0 * COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'hired')
        / NULLIF(COUNT(DISTINCT a.id), 0), 2
    ) AS hire_rate_pct,
    AVG(EXTRACT(EPOCH FROM (h.changed_at - a.applied_at)) / 3600.0)
        FILTER (WHERE h.to_status = 'hired')       AS avg_hours_to_hire,
    AVG(EXTRACT(EPOCH FROM (h.changed_at - a.applied_at)) / 3600.0)
        FILTER (WHERE h.to_status = 'interviewed') AS avg_hours_to_interview
FROM applications a
JOIN jobs j ON j.id = a.job_id
LEFT JOIN application_status_history h ON h.application_id = a.id
GROUP BY j.recruiter_id;

COMMENT ON VIEW vw_recruiter_dashboard IS 'Dashboard aggregated metrics per Recruiter. Query: SELECT * FROM vw_recruiter_dashboard WHERE recruiter_id = :rid';


-- =============================================================================
-- §13. VERIFY — Health check sau khi init            [CẬP NHẬT — v1.1]
-- =============================================================================
--
--   -- Đếm số bảng (kỳ vọng v1.1: 11)
--   SELECT COUNT(*) AS table_count FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
--
--   -- Đếm số FK (kỳ vọng v1.1: 11)
--   SELECT COUNT(*) FROM information_schema.table_constraints
--   WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';
--
--   -- Kiểm tra bảng companies
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'companies' ORDER BY ordinal_position;
--
--   -- Kiểm tra jobs.company_id
--   SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_name = 'jobs' AND column_name = 'company_id';
--
--   -- Liệt kê tất cả tables
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
--   ORDER BY table_name;
-- =============================================================================


-- =============================================================================
-- §14. BƯỚC TIẾP THEO (sau khi schema.sql chạy thành công)
-- =============================================================================
-- 1. Tạo Qdrant collections (chạy ai-service/startup.py):
--      collection "cvs"  — vector 1536, cosine
--      collection "jobs" — vector 1536, cosine
--
-- 2. Seed demo data (npm run seed):
--      - 1 Recruiter: hr@demo.com / password123
--      - 1 Candidate: candidate@demo.com / password123
--      - 1 Company: TechVision Vietnam (is_published=TRUE)   ← [v1.1]
--      - 3 Jobs (Backend/Frontend/AI-ML) với company_id gán vào company trên
--      - 3 CV samples
--
-- 3. Verify end-to-end:
--      - Login Recruiter → /recruiter/company → điền hồ sơ → Lưu & xuất bản
--      - Tạo JD → jobs.company_id tự gán
--      - Login Candidate → /candidate/jobs → thấy logo + tên công ty
--      - Upload CV → is_parsed=TRUE sau 30s → Apply → pipeline chạy
-- =============================================================================

-- END OF schema.sql  (v1.1)
