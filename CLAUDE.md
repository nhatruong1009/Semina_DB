# CLAUDE.md — Context file for Claude CLI
# Project: Semina_DB — LinkedIn Clone
# Owner: Hà (Neo4j) | Stack: Node.js/Express + React/Vite

## Tổng quan project
LinkedIn Clone full-stack với polyglot persistence:
- PostgreSQL: User, Profile, Company, Job, Application
- MongoDB: Posts, Feed, Comments, Likes
- Neo4j: Social Graph (connections, follows, skill matching)
- Redis: Session, Cache notifications
- Frontend: React + Vite
- Backend: Node.js + Express

## Cấu trúc thư mục
```
SEMINA_DB/
├── backend/
│   ├── data/
│   │   ├── mongo_schema.js     # MongoDB schemas
│   │   ├── mongo.js            # MongoDB connection
│   │   ├── neo4j.js            # Neo4j connection
│   │   ├── postgresql.js       # PostgreSQL connection
│   │   └── redis.js            # Redis connection
│   ├── routes/
│   │   ├── auth.js             # Authentication routes
│   │   ├── jobs.js             # Job routes
│   │   ├── posts.js            # Post routes
│   │   └── users.js            # User/network routes
│   ├── middleware/
│   │   ├── auth.js             # JWT middleware
│   │   └── user.js             # User middleware
│   ├── query/
│   │   └── example.js          # Query examples
│   ├── event/
│   │   └── kafka.js            # Kafka events
│   ├── server.js               # Express server entry
│   ├── init_db.js              # DB initialization
│   └── .env                    # Environment variables
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Auth.jsx         # Login/Register
│       │   ├── Feed.jsx         # Post feed
│       │   ├── Jobs.jsx         # Job listing
│       │   ├── Network.jsx      # Social network/connections
│       │   ├── PostCard.jsx     # Post component
│       │   └── PostCreate.jsx   # Create post
│       ├── api.js               # API calls to backend
│       ├── App.jsx              # Main app
│       └── AuthContext.jsx      # Auth state
└── script/
    ├── neo4j_linkedin.cypher    # Neo4j setup scripts
    ├── postgres.sql             # PostgreSQL setup scripts
    └── mongodb_init.js          # MongoDB init scripts
```

## Phân công DB
| DB | File kết nối | Người phụ trách |
|----|-------------|-----------------|
| PostgreSQL | backend/data/postgresql.js | Hân |
| MongoDB | backend/data/mongo.js | Vĩnh |
| Neo4j | backend/data/neo4j.js | Hà |
| Redis | backend/data/redis.js | Trường |

## Task của Hà — Neo4j Integration

### Mục tiêu
Implement Neo4j Social Graph module vào backend và kết nối với frontend Network.jsx

### Kết nối Neo4j AuraDB
- Driver: neo4j-driver (npm)
- Instance: AuraDB Free
- Credentials: lấy từ .env

### File .env cần có
```
NEO4J_URI=neo4j+s://7140fa6c.databases.neo4j.io
NEO4J_USERNAME=7140fa6c
NEO4J_PASSWORD=<password đã lưu>
```

### Nodes đã có trong AuraDB
- User (user_id, name, headline, location)
- Company (company_id, name, industry)
- School (school_id, name, location)
- Skill (skill_id, name)
- Job (job_id, title, salary_range, status, location)

### Relationships đã có
- (User)-[:FOLLOWS]->(User)
- (User)-[:CONNECTS {connected_at}]->(User)
- (User)-[:WORKS_AT {position, start_date}]->(Company)
- (User)-[:STUDIED_AT {degree, field, start_year, end_year}]->(School)
- (User)-[:HAS_SKILL]->(Skill)
- (Job)-[:REQUIRES_SKILL]->(Skill)

### API cần implement trong backend/routes/users.js

```javascript
// GET /api/neo4j/suggestions/:userId
// Gợi ý kết nối "người bạn có thể biết"

// GET /api/neo4j/mutual/:userId1/:userId2
// Tìm bạn chung giữa 2 users

// GET /api/neo4j/job-recommendations/:userId
// Gợi ý việc làm theo skill

// GET /api/neo4j/same-school/:userId
// Tìm người cùng trường

// GET /api/neo4j/same-company/:userId
// Tìm người cùng công ty

// POST /api/neo4j/connect
// Tạo kết nối CONNECTS giữa 2 users

// POST /api/neo4j/follow
// Tạo FOLLOWS giữa 2 users
```

### Cypher queries tương ứng

```cypher
// Gợi ý kết nối
MATCH (u:User {user_id: $userId})-[:CONNECTS]->(friend)-[:CONNECTS]->(suggest)
WHERE suggest.user_id <> $userId
AND NOT (u)-[:CONNECTS]->(suggest)
RETURN suggest.name AS suggested_user, suggest.user_id AS user_id

// Bạn chung
MATCH (u1:User {user_id: $userId1})-[:FOLLOWS]->(common)<-[:FOLLOWS]-(u2:User {user_id: $userId2})
RETURN common.name AS mutual_connection, common.user_id AS user_id

// Gợi ý việc làm
MATCH (u:User {user_id: $userId})-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(j:Job)
WHERE j.status = 'OPEN'
RETURN j.title AS job, j.salary_range AS salary, count(s) AS matching_skills
ORDER BY matching_skills DESC

// Cùng trường
MATCH (u:User {user_id: $userId})-[:STUDIED_AT]->(school)<-[:STUDIED_AT]-(other:User)
WHERE other.user_id <> $userId
RETURN other.name AS name, other.user_id AS user_id, school.name AS school

// Cùng công ty
MATCH (u:User {user_id: $userId})-[:WORKS_AT]->(company)<-[:WORKS_AT]-(other:User)
WHERE other.user_id <> $userId
RETURN other.name AS name, other.user_id AS user_id, company.name AS company
```

### Frontend cần update
- `frontend/src/components/Network.jsx`: hiển thị gợi ý kết nối từ Neo4j
- `frontend/src/api.js`: thêm các API calls đến /api/neo4j/*

## Lưu ý quan trọng
- user_id trong Neo4j phải khớp với users.id trong PostgreSQL
- Hiện tại sample data dùng u001/u002/u003 — sau khi PostgreSQL có data thật thì sync lại
- Không được xóa data Neo4j hiện tại khi test
- Chạy script/neo4j_linkedin.cypher để setup DB từ đầu nếu cần reset
