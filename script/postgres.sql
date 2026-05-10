CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, LOCKED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE, -- Đảm bảo 1 user chỉ có 1 profile (Quan hệ 1-1)
    full_name VARCHAR(100) NOT NULL,
    headline VARCHAR(255),
    bio TEXT,
    location VARCHAR(100),
    avatar_url VARCHAR(512),
    cover_url VARCHAR(512),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    salary_range JSONB,
    status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, CLOSED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);


CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    user_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, REVIEWED, REJECTED, ACCEPTED
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_applicant FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Đảm bảo 1 user không apply 2 lần vào cùng 1 job
    CONSTRAINT unique_job_application UNIQUE (job_id, user_id) 
);

-- ta cần tài khoản để kiểm soát các "account" công ti
CREATE TABLE company_users  (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'RECRUITER', -- ADMIN, RECRUITER, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_company_admin UNIQUE (company_id, user_id)
);

-- Speed up lookups of all admins for a company
CREATE INDEX idx_company_admins_company_id ON company_users (company_id);
-- Speed up lookups of all companies managed by a user
CREATE INDEX idx_company_admins_user_id ON company_users (user_id);


-- Tìm user theo email cực nhanh (phục vụ lúc đăng nhập)
CREATE INDEX idx_users_email ON users(email);

-- Tối ưu hóa việc join các bảng
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_applications_user_id ON job_applications(user_id);



-- WITH new_user AS (
--     -- Bước 1: Không truyền ID vào, để hệ thống tự sinh ra. Sau đó lấy ID đó trả về (RETURNING)
--     INSERT INTO users (email, password_hash) 
--     VALUES ('test@email.com', 'hashed_pass')
--     RETURNING id
-- )
-- -- Bước 2: Lấy ID từ Bước 1 nhét vào bảng profiles
-- INSERT INTO profiles (user_id, full_name, headline) 
-- SELECT id, 'Nguyễn Văn A', 'Data Engineer' FROM new_user;


-- select * from users
-- select * from profiles