-- ============================================
-- Schema cho App học tiếng Trung Phồn thể (TOCFL)
-- Database: PostgreSQL (Supabase)
-- ============================================

-- 1. Bảng từ vựng chính
CREATE TABLE vocabulary (
    id          VARCHAR(20) PRIMARY KEY,          -- e.g. "N1_0001"
    vocabulary  VARCHAR(100) NOT NULL,             -- từ gốc (phồn thể)
    variants    TEXT[] DEFAULT '{}',               -- biến thể (VD: ["妳"])
    pinyin      VARCHAR(200),                      -- phiên âm
    pos         TEXT[] DEFAULT '{}',               -- từ loại (VD: ["N", "V"])
    pos_raw     VARCHAR(100),                      -- từ loại gốc
    context     VARCHAR(100),                      -- chủ đề (個人資料, 工作...)
    level_code  VARCHAR(5) NOT NULL,               -- N1, N2, A1, A2, B1, B2, C1
    level_name  VARCHAR(50),                       -- tên cấp độ tiếng Trung
    level_name_en VARCHAR(50),                     -- tên cấp độ tiếng Anh
    level_order INT,                               -- thứ tự cấp độ (1-7)
    
    -- Các trường sẽ bổ sung sau (dùng AI)
    meaning_vi  TEXT,                              -- nghĩa tiếng Việt
    example_sentence TEXT,                         -- câu ví dụ
    example_pinyin TEXT,                           -- phiên âm câu ví dụ
    example_meaning_vi TEXT,                       -- nghĩa câu ví dụ
    
    -- Audio
    audio_url   VARCHAR(500),                      -- URL file audio phát âm
    
    -- Metadata
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vocabulary_level ON vocabulary(level_code);
CREATE INDEX idx_vocabulary_context ON vocabulary(context);
CREATE INDEX idx_vocabulary_pinyin ON vocabulary(pinyin);

-- 2. Bảng cấp độ
CREATE TABLE levels (
    code        VARCHAR(5) PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    name_en     VARCHAR(50),
    sort_order  INT NOT NULL,
    word_count  INT DEFAULT 0
);

INSERT INTO levels (code, name, name_en, sort_order, word_count) VALUES
    ('N1', '準備級一級', 'Novice 1', 1, 160),
    ('N2', '準備級二級', 'Novice 2', 2, 234),
    ('A1', '入門級', 'Level 1', 3, 347),
    ('A2', '基礎級', 'Level 2', 4, 485),
    ('B1', '進階級', 'Level 3', 5, 1173),
    ('B2', '高階級', 'Level 4', 6, 2342),
    ('C1', '流利級', 'Level 5', 7, 2776);

-- 3. Bảng người dùng (tích hợp Supabase Auth)
CREATE TABLE user_profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id),
    display_name    VARCHAR(100),
    avatar_url      VARCHAR(500),
    target_level    VARCHAR(5) REFERENCES levels(code),  -- cấp độ mục tiêu
    daily_goal      INT DEFAULT 20,                      -- mục tiêu từ/ngày
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng tiến độ học từ vựng
CREATE TABLE user_vocabulary_progress (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES auth.users(id) NOT NULL,
    vocabulary_id   VARCHAR(20) REFERENCES vocabulary(id) NOT NULL,
    
    -- SRS (Spaced Repetition) data
    ease_factor     FLOAT DEFAULT 2.5,           -- SuperMemo SM-2
    interval_days   INT DEFAULT 0,
    repetitions     INT DEFAULT 0,
    next_review_at  TIMESTAMPTZ DEFAULT NOW(),
    
    -- Trạng thái
    status          VARCHAR(20) DEFAULT 'new',   -- new, learning, review, mastered
    last_reviewed_at TIMESTAMPTZ,
    
    -- Điểm
    correct_count   INT DEFAULT 0,
    incorrect_count INT DEFAULT 0,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, vocabulary_id)
);

CREATE INDEX idx_progress_user ON user_vocabulary_progress(user_id);
CREATE INDEX idx_progress_next_review ON user_vocabulary_progress(next_review_at);

-- 5. Bảng lịch sử học
CREATE TABLE study_sessions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES auth.users(id) NOT NULL,
    session_type    VARCHAR(20) NOT NULL,        -- vocabulary, reading, listening
    level_code      VARCHAR(5),
    words_studied   INT DEFAULT 0,
    correct_count   INT DEFAULT 0,
    duration_seconds INT,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    ended_at        TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user ON study_sessions(user_id);

-- 6. Bảng bài đọc (sẽ xây dựng sau)
CREATE TABLE reading_passages (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(300) NOT NULL,
    content         TEXT NOT NULL,               -- nội dung chữ Phồn thể
    content_pinyin  TEXT,                        -- phiên âm
    content_vi      TEXT,                        -- dịch tiếng Việt
    level_code      VARCHAR(5) REFERENCES levels(code),
    topic           VARCHAR(100),
    word_count      INT,
    audio_url       VARCHAR(500),
    source          VARCHAR(300),                -- nguồn bài đọc
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bảng câu hỏi đọc hiểu
CREATE TABLE reading_questions (
    id              BIGSERIAL PRIMARY KEY,
    passage_id      BIGINT REFERENCES reading_passages(id) ON DELETE CASCADE,
    question_type   VARCHAR(20) DEFAULT 'multiple_choice',
    question_text   TEXT NOT NULL,
    options         JSONB,                       -- ["A. ...", "B. ...", ...]
    correct_answer  VARCHAR(10),
    explanation     TEXT
);

-- 8. Bảng bài nghe (sẽ xây dựng sau)
CREATE TABLE listening_tracks (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(300) NOT NULL,
    audio_url       VARCHAR(500) NOT NULL,
    transcript      TEXT,                        -- bản ghi (phồn thể)
    transcript_vi   TEXT,                        -- dịch
    level_code      VARCHAR(5) REFERENCES levels(code),
    duration_seconds INT,
    topic           VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Bảng đối chiếu TOCFL-HSK (tham khảo)
CREATE TABLE cross_strait_comparison (
    id              BIGSERIAL PRIMARY KEY,
    tocfl_word      VARCHAR(100) NOT NULL,
    tocfl_level     VARCHAR(5),
    cross_strait_variants TEXT,                  -- biến thể đại lục
    hsk_word        VARCHAR(100),
    hsk_level       VARCHAR(20)
);

-- ============================================
-- Row Level Security (RLS) cho Supabase
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocabulary_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: user chỉ xem được data của chính mình
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own progress" ON user_vocabulary_progress
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_vocabulary_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_vocabulary_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON study_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON study_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Vocabulary là public read-only
CREATE POLICY "Vocabulary is public" ON vocabulary
    FOR SELECT USING (true);
