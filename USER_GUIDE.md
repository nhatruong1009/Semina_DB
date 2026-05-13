# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG
## Semina_DB — LinkedIn Clone

---

# PHẦN 1: GIỚI THIỆU HỆ THỐNG

## 1.1. Tổng quan

**Semina_DB** là ứng dụng mạng xã hội nghề nghiệp mô phỏng LinkedIn, được xây dựng theo kiến trúc full-stack với polyglot persistence (đa cơ sở dữ liệu). Hệ thống cho phép người dùng kết nối chuyên nghiệp, đăng tải nội dung, tìm kiếm việc làm và quản lý mạng lưới quan hệ.

## 1.2. Kiến trúc hệ thống

| Thành phần | Công nghệ |
|-----------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Cơ sở dữ liệu quan hệ | PostgreSQL |
| Cơ sở dữ liệu đồ thị | Neo4j |
| Cơ sở dữ liệu tài liệu | MongoDB |
| Cache | Redis |
| Message Queue | Apache Kafka |
| Real-time | Socket.io |

## 1.3. Các tính năng chính

- Đăng ký / đăng nhập với JWT authentication
- Đăng bài viết, tương tác (like, comment, share)
- Hệ thống mạng lưới: theo dõi, kết nối người dùng
- Gợi ý kết bạn thông minh (dựa trên bạn chung, trường học, công ty)
- Quản lý kỹ năng và học vấn trên hồ sơ cá nhân
- Đăng tin tuyển dụng và ứng tuyển việc làm
- Gợi ý việc làm phù hợp dựa trên kỹ năng
- Hệ thống thông báo real-time
- Quản lý công ty (admin)

---

# PHẦN 2: CÀI ĐẶT VÀ KHỞI ĐỘNG

## 2.1. Yêu cầu môi trường

- **Node.js** 14 trở lên
- **npm** 6 trở lên
- **Docker** và **Docker Compose**
- Hệ điều hành: Windows 10/11, macOS, hoặc Linux

## 2.2. Khởi động các dịch vụ cơ sở dữ liệu

Mở terminal tại thư mục gốc của dự án và chạy:

```bash
docker-compose up -d
```

Lệnh này sẽ khởi động tất cả các dịch vụ cần thiết:

| Dịch vụ | Cổng | Thông tin đăng nhập |
|---------|------|---------------------|
| PostgreSQL | 5432 | user: `admin` / pass: `secret123` / db: `linkedin_clone` |
| MongoDB | 27017 | (mặc định, không cần xác thực) |
| Neo4j Browser | 7474 | user: `neo4j` / pass: `password123` |
| Neo4j Bolt | 7687 | (dùng cho kết nối driver) |
| Redis | 6379 | (mặc định) |
| Kafka | 9092 | (mặc định) |

Kiểm tra trạng thái các container:

```bash
docker ps
```

## 2.3. Cấu hình môi trường Backend

Tạo file `.env` trong thư mục `backend/` với nội dung:

```
MONGO_URI=mongodb://localhost:27017/linkedin_clone
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
PG_HOST=localhost
PG_PORT=5432
PG_USER=admin
PG_PASSWORD=secret123
PG_DATABASE=linkedin_clone
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
KAFKA_HOST=127.0.0.1
KAFKA_PORT=9092
JWT_SECRET=your_jwt_secret_key_here
SUPERADMIN_EMAIL=<email_của_superadmin>
PORT=9000
```

> **Lưu ý:** Thay `<email_của_superadmin>` bằng email tài khoản muốn cấp quyền quản trị cao nhất.

## 2.4. Khởi động Backend

```bash
cd backend
npm install
npm run dev
```

Backend sẽ chạy tại: `http://localhost:9000`

## 2.5. Khởi động Frontend

Mở terminal mới:

```bash
cd frontend
npm install
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173` (hoặc cổng Vite thông báo)

## 2.6. Khởi tạo schema cơ sở dữ liệu

Sau khi các container Docker đã chạy, cần chạy thủ công các script để tạo schema:

**PostgreSQL** — chạy file `script/postgres.sql` để tạo toàn bộ bảng, index và trigger.

**Neo4j** — mở Neo4j Browser tại `http://localhost:7474`, đăng nhập và chạy nội dung file `script/neo4j_linkedin.cypher` để tạo dữ liệu seed.

> **Lưu ý:** Sau khi khởi động lần đầu, dữ liệu trống. Tài khoản người dùng cần được tạo qua chức năng **Đăng ký** trên giao diện.

---

# PHẦN 3: HƯỚNG DẪN SỬ DỤNG

## 3.1. Đăng ký tài khoản mới

1. Truy cập địa chỉ frontend trên trình duyệt
2. Trang đăng nhập hiển thị mặc định
3. Nhấn **"Sign Up"** / **"Đăng ký"** để chuyển sang form đăng ký
4. Điền các thông tin:
   - **Full Name**: Họ và tên đầy đủ
   - **Email**: Địa chỉ email (dùng để đăng nhập)
   - **Password**: Mật khẩu
5. Nhấn **"Register"** để tạo tài khoản
6. Hệ thống tự động đăng nhập và chuyển vào trang chủ

## 3.2. Đăng nhập

1. Nhập **Email** và **Password** đã đăng ký
2. Nhấn **"Login"**
3. Token JWT được lưu vào localStorage, tự động làm mới khi hết hạn
4. Nhấn **"Logout"** trên thanh điều hướng để thoát khỏi hệ thống

---

## 3.3. Trang chủ (Feed)

Sau khi đăng nhập, người dùng thấy trang chủ với 3 tab:

### Tab "All Posts" — Tất cả bài viết
- Hiển thị tất cả bài viết từ mọi người dùng theo thứ tự thời gian
- Tải thêm bài viết khi cuộn xuống (phân trang tự động)

### Tab "Network Feed" — Bài viết từ mạng lưới
- Chỉ hiển thị bài viết từ những người bạn đang **theo dõi (follow)**
- Nếu chưa follow ai, feed sẽ trống

### Tab "Find Jobs" — Tìm việc làm
- Hiển thị danh sách việc làm được gợi ý dựa trên kỹ năng của bạn
- Mỗi card việc làm hiển thị: tên vị trí, công ty, địa điểm, mức lương, số kỹ năng phù hợp
- Nhấn **"Apply"** để ứng tuyển ngay

### Tạo bài viết mới
1. Nhấn vào ô **"What's on your mind?"** ở đầu trang
2. Nhập nội dung bài viết
3. (Tuỳ chọn) Đính kèm hình ảnh bằng cách nhập URL ảnh
4. Nhấn **"Post"** để đăng

### Tương tác với bài viết

| Hành động | Cách thực hiện |
|-----------|---------------|
| Like | Nhấn biểu tượng 👍 dưới bài viết |
| Unlike | Nhấn lại biểu tượng 👍 (đang active) |
| Comment | Nhấn biểu tượng 💬, gõ nội dung rồi nhấn Enter hoặc nút gửi |
| Share | Nhấn biểu tượng ↗ — link bài viết được sao chép vào clipboard |
| Xem chi tiết | Nhấn vào số lượt tương tác để xem danh sách người đã like/comment/share |

---

## 3.4. Hồ sơ cá nhân (Profile)

### Truy cập hồ sơ
- Nhấn vào **tên / avatar** của bất kỳ người dùng nào để xem hồ sơ
- Hoặc nhấn vào avatar/tên của bạn trên navbar để xem hồ sơ của mình

### Các thông tin trên hồ sơ

| Thông tin | Mô tả |
|-----------|-------|
| Ảnh đại diện (Avatar) | Ảnh đại diện người dùng |
| Ảnh bìa (Cover) | Ảnh nền phần header hồ sơ |
| Họ tên | Tên hiển thị |
| Tiêu đề (Headline) | Vị trí / mô tả nghề nghiệp ngắn |
| Giới thiệu (Bio) | Mô tả chi tiết về bản thân |
| Địa điểm | Nơi sinh sống / làm việc |
| Thống kê | Số followers, following, connections, việc đã ứng tuyển |

### Chỉnh sửa hồ sơ của bạn (chỉ hiện khi xem hồ sơ chính mình)

1. Nhấn nút **"Edit Profile"** hoặc biểu tượng chỉnh sửa
2. Cập nhật các trường: Họ tên, Tiêu đề, Giới thiệu, Địa điểm, URL ảnh đại diện, URL ảnh bìa
3. Nhấn **"Save"** để lưu thay đổi

### Quản lý Kỹ năng (Skills)

**Thêm kỹ năng:**
1. Trong phần "Skills" trên hồ sơ, nhấn **"Add Skill"**
2. Gõ tên kỹ năng (có gợi ý autocomplete)
3. Nhấn **"Add"** hoặc Enter để thêm

**Xoá kỹ năng:**
- Nhấn biểu tượng **✕** bên cạnh kỹ năng muốn xoá

> Kỹ năng được đồng bộ với Neo4j và dùng để gợi ý việc làm phù hợp.

### Quản lý Học vấn (Education)

**Thêm trường học:**
1. Trong phần "Education" trên hồ sơ, nhấn **"Add School"**
2. Chọn tên trường từ danh sách hoặc nhập thủ công
3. Nhấn **"Add"** để lưu

**Xoá trường học:**
- Nhấn biểu tượng **✕** bên cạnh trường muốn xoá

> Thông tin trường học được dùng trong thuật toán gợi ý kết nối "Same School".

### Xem Followers / Following / Connections
- Cuộn xuống phần tab **"Followers"**, **"Following"**, **"Connections"** trên hồ sơ
- Nhấn vào tên người dùng trong danh sách để xem hồ sơ của họ

---

## 3.5. Mạng lưới (Network)

Truy cập: Nhấn **"Network"** trên thanh điều hướng

### Gợi ý kết bạn (People You May Know)
Hệ thống gợi ý người dùng dựa trên thuật toán kết hợp nhiều yếu tố:

| Badge | Ý nghĩa |
|-------|---------|
| Mutual friend | Có bạn chung |
| Same school | Đã học cùng trường |
| Same company | Đang làm cùng công ty |
| Popular | Người dùng có nhiều kết nối |

### Follow / Unfollow người dùng
- Nhấn **"Follow"** trên card người dùng để bắt đầu theo dõi
- Nhấn **"Following"** (đang active) để huỷ theo dõi
- Sau khi follow, bài viết của họ sẽ hiện trong **Network Feed** của bạn

### Kết nối (Connect)
- Nhấn **"Connect"** để gửi yêu cầu kết nối (tạo quan hệ hai chiều trong đồ thị Neo4j)
- Kết nối được dùng trong thuật toán gợi ý "Mutual friend"

### Xem tất cả người dùng
- Danh sách **"All Users"** hiển thị tất cả người dùng trong hệ thống (trừ bạn)
- Nhấn vào tên / avatar để xem hồ sơ của họ

---

## 3.6. Việc làm (Jobs)

> Tính năng này dành cho **người dùng có quyền đăng tuyển** (staff).

Truy cập: Nhấn **"Jobs"** trên thanh điều hướng

### Tìm kiếm và ứng tuyển việc làm

1. Danh sách việc làm được gợi ý dựa trên kỹ năng của bạn (từ Neo4j)
2. Mỗi job card hiển thị:
   - Tên vị trí
   - Tên công ty
   - Địa điểm (thành phố, quốc gia)
   - Mức lương (min–max và đơn vị tiền tệ)
   - Số lượng ứng viên
   - Số kỹ năng phù hợp với hồ sơ của bạn
3. Nhấn **"View Details"** để xem chi tiết đầy đủ (mô tả, kỹ năng yêu cầu, ứng viên phù hợp nhất)
4. Nhấn **"Apply"** để ứng tuyển
   - Nút chuyển thành **"Applied"** và bị vô hiệu hoá sau khi ứng tuyển thành công
   - Hệ thống ngăn không cho ứng tuyển trùng lặp

### Xem việc đã ứng tuyển

- Trong tab **"Jobs You Applied"** (sidebar bên phải hoặc tab riêng)
- Hiển thị danh sách jobs đã apply kèm trạng thái và ngày ứng tuyển

### Đăng tin tuyển dụng (dành cho staff)

1. Nhấn **"Post a Job"** hoặc nút thêm mới
2. Điền thông tin:
   - **Title**: Tên vị trí tuyển dụng
   - **Company**: Chọn công ty (từ danh sách công ty bạn thuộc về)
   - **Country / City**: Địa điểm làm việc
   - **Description**: Mô tả chi tiết công việc
   - **Salary Range**: Mức lương tối thiểu, tối đa và đơn vị tiền tệ
   - **Required Skills**: Thêm các kỹ năng yêu cầu (tìm kiếm và chọn từ danh sách)
3. Nhấn **"Post Job"** để đăng

### Quản lý tin tuyển dụng đã đăng

- Xem danh sách tin tuyển dụng của bạn trong **"My Job Postings"**
- **Chỉnh sửa**: Nhấn biểu tượng ✏️ để cập nhật thông tin job
- **Xoá**: Nhấn biểu tượng 🗑️ để xoá tin
- **Xem ứng viên**: Nhấn **"View Applicants"** để xem danh sách người đã ứng tuyển:
  - Họ tên, tiêu đề, email, địa điểm
  - Ngày ứng tuyển và trạng thái
  - Nhấn vào tên ứng viên để xem hồ sơ chi tiết

---

## 3.7. Thông báo (Notifications)

Truy cập: Nhấn biểu tượng **🔔** trên thanh điều hướng

### Các loại thông báo

| Loại | Ý nghĩa |
|------|---------|
| POST_LIKE | Có người like bài viết của bạn |
| POST_COMMENT | Có người comment bài viết của bạn |
| POST_SHARE | Có người share bài viết của bạn |
| USER_FOLLOW | Có người follow bạn |
| CONNECTION_REQUEST | Có người gửi yêu cầu kết nối |
| CONNECTION_ACCEPT | Yêu cầu kết nối của bạn được chấp nhận |
| JOB_APPLY | Có người ứng tuyển vào job của bạn |

### Thao tác với thông báo

- **Badge số** trên biểu tượng chuông hiển thị số thông báo chưa đọc
- Nhấn vào thông báo để điều hướng đến nội dung liên quan (bài viết, hồ sơ, việc làm)
- Nhấn **"Mark as read"** trên một thông báo để đánh dấu đã đọc
- Nhấn **"Mark all as read"** để đánh dấu tất cả đã đọc

---

## 3.8. Quản lý công ty (Admin Companies)

> Tính năng này chỉ dành cho tài khoản **Superadmin** (được cấu hình qua `SUPERADMIN_EMAIL` trong `.env`).

Truy cập: Nhấn **"Admin Companies"** trên thanh điều hướng (chỉ hiện với superadmin)

### Tạo công ty mới

1. Nhấn **"Create Company"**
2. Điền thông tin:
   - **Company Name**: Tên công ty
   - **Industry**: Ngành nghề
   - **Description**: Mô tả công ty
   - **Admin Email**: Email của người quản trị công ty
3. Nhấn **"Create Company"** để tạo
4. Công ty mới xuất hiện trong danh sách **"All Companies"** bên dưới

> Tính năng thêm/xoá nhân sự trong công ty đã có ở backend (`/api/companies/:id/add-user`) nhưng chưa được tích hợp vào giao diện trong phiên bản hiện tại.

---

# PHẦN 4: LUỒNG DỮ LIỆU VÀ KIẾN TRÚC

## 4.1. Phân chia dữ liệu giữa các cơ sở dữ liệu

| Cơ sở dữ liệu | Lưu trữ |
|--------------|---------|
| **PostgreSQL** | Tài khoản người dùng, hồ sơ, công ty, việc làm, đơn ứng tuyển, thông báo |
| **Neo4j** | Đồ thị quan hệ xã hội (follows, connections, skills, schools, job matching) |
| **MongoDB** | Nội dung bài viết, bình luận, số liệu tương tác |
| **Redis** | Cache feed, cache gợi ý việc làm, đếm thông báo chưa đọc |

## 4.2. Luồng sự kiện Kafka

```
Đăng ký tài khoản  →  user.created   →  Neo4j: tạo node User
Tạo bài viết       →  posts.events   →  Neo4j: tạo node Post + quan hệ AUTHORED
Like bài viết      →  posts.events   →  Neo4j: tạo quan hệ LIKED
Comment bài viết   →  posts.events   →  Neo4j: tạo quan hệ COMMENTED
Share bài viết     →  posts.events   →  Neo4j: tạo quan hệ SHARED
Đăng tin job       →  jobs.events    →  Neo4j: tạo node Job
Ứng tuyển job      →  jobs.events    →  Neo4j: tạo quan hệ APPLIED_TO
```

## 4.3. Thuật toán gợi ý kết nối

Hệ thống tính điểm và xếp hạng người dùng dựa trên:

1. **Bạn chung (Mutual Friends)** — trọng số cao nhất
2. **Cùng trường học (Same School)** — trọng số cao
3. **Cùng công ty (Same Company)** — trọng số trung bình
4. **Người dùng nổi bật (Popular)** — trọng số thấp (dự phòng)

## 4.4. Thuật toán gợi ý việc làm

- Truy vấn Neo4j: `(User)-[:HAS_SKILL]->(:Skill)<-[:REQUIRES_SKILL]-(Job)`
- Tính số kỹ năng khớp giữa hồ sơ người dùng và yêu cầu của job
- Sắp xếp theo số kỹ năng khớp giảm dần
- Kết quả được cache trong Redis (làm mới hàng ngày)

---

# PHẦN 5: GHI CHÚ KỸ THUẬT

## 5.1. ID đồng bộ giữa các hệ thống

- `user_id` trong Neo4j phải khớp với `users.id` trong PostgreSQL
- `post_id` trong Neo4j phải khớp với `_id` trong MongoDB
- `comment_id` trong quan hệ `[:COMMENTED]` phải khớp với `_id` comment trong MongoDB

## 5.2. Xác thực JWT

- Sau đăng nhập, token JWT (hết hạn sau 1 giờ) và refreshToken được cấp
- Mọi API request cần header: `Authorization: Bearer {token}`
- Khi token hết hạn, hệ thống tự động gửi refreshToken để lấy token mới
- Khi đăng xuất, refreshToken bị vô hiệu hoá trong Redis

## 5.3. Neo4j Browser (để debug / seed dữ liệu)

Truy cập: `http://localhost:7474`
- Username: `neo4j`
- Password: `password123`

Chạy script seed dữ liệu từ file `script/neo4j_linkedin.cypher` bằng cách copy-paste vào Neo4j Browser.

---

# PHỤ LỤC: DANH SÁCH API ENDPOINTS

## Authentication
```
POST /api/auth/register     — Đăng ký tài khoản mới
POST /api/auth/login        — Đăng nhập
POST /api/auth/refresh      — Làm mới JWT token
POST /api/auth/logout       — Đăng xuất
```

## Users & Network
```
GET  /api/users/all                            — Danh sách tất cả người dùng
GET  /api/users/suggestions/:userId            — Gợi ý kết bạn
GET  /api/users/suggestions-all/:userId        — Gợi ý kết hợp đa tiêu chí
GET  /api/users/mutual/:userId1/:userId2       — Bạn chung
GET  /api/users/followers/:userId              — Danh sách followers
GET  /api/users/following/:userId              — Danh sách following
GET  /api/users/:userId/skills                 — Kỹ năng của người dùng
GET  /api/users/:userId/schools                — Trường học của người dùng
POST /api/users/follow                         — Theo dõi người dùng
POST /api/users/unfollow                       — Huỷ theo dõi
POST /api/users/connect                        — Gửi kết nối
POST /api/users/:userId/skills                 — Thêm kỹ năng
DELETE /api/users/:userId/skills/:skillName    — Xoá kỹ năng
POST /api/users/:userId/school                 — Thêm trường học
DELETE /api/users/:userId/school/:schoolName   — Xoá trường học
```

## Posts
```
POST /api/posts/create            — Tạo bài viết
GET  /api/posts/feed              — Feed tất cả bài viết (phân trang)
GET  /api/posts/feed/network      — Feed mạng lưới
GET  /api/posts/:id               — Chi tiết bài viết
GET  /api/posts/:id/comments      — Bình luận của bài viết
GET  /api/posts/:id/interactions  — Tương tác của bài viết
POST /api/posts/:id/like          — Like bài viết
POST /api/posts/:id/unlike        — Unlike bài viết
POST /api/posts/:id/comment       — Bình luận
POST /api/posts/:id/share         — Share bài viết
```

## Jobs
```
POST   /api/jobs/create            — Đăng tin tuyển dụng
GET    /api/jobs                   — Danh sách jobs gợi ý
GET    /api/jobs/applied           — Jobs đã ứng tuyển
GET    /api/jobs/my-jobs           — Jobs đã đăng (của mình)
GET    /api/jobs/:id               — Chi tiết job
GET    /api/jobs/:id/applicants    — Danh sách ứng viên
GET    /api/jobs/:id/best-candidates — Ứng viên phù hợp nhất
GET    /api/jobs/:id/skills        — Kỹ năng yêu cầu
PUT    /api/jobs/:id               — Cập nhật job
DELETE /api/jobs/:id               — Xoá job
POST   /api/jobs/:id/apply         — Ứng tuyển
POST   /api/jobs/:id/skills        — Thêm kỹ năng yêu cầu
DELETE /api/jobs/:id/skills/:skillName — Xoá kỹ năng yêu cầu
```

## Profiles
```
GET /api/profiles/:userId    — Xem hồ sơ người dùng
PUT /api/profiles/me         — Cập nhật hồ sơ của mình
```

## Companies
```
GET    /api/companies                  — Danh sách công ty
GET    /api/companies/my               — Công ty của mình
GET    /api/companies/:id/users        — Nhân sự công ty
POST   /api/companies/:id/add-user     — Thêm thành viên
DELETE /api/companies/:id/users/:userId — Xoá thành viên
```

## Admin
```
POST /api/admin/companies/create   — Tạo công ty mới (superadmin)
GET  /api/admin/companies          — Danh sách tất cả công ty (superadmin)
```

## Notifications
```
GET /api/notifications              — Danh sách thông báo
GET /api/notifications/unread-count — Đếm thông báo chưa đọc
PUT /api/notifications/:id/read     — Đánh dấu đã đọc
PUT /api/notifications/read-all     — Đánh dấu tất cả đã đọc
```

---

*Tài liệu này được viết cho đồ án môn học — Semina_DB LinkedIn Clone.*
*Stack: Node.js/Express + React/Vite + PostgreSQL + Neo4j + MongoDB + Redis + Kafka*
