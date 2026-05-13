# LinkedIn Clone — Semina_DB

A full-stack LinkedIn clone built with **React + Vite** (frontend) and **Node.js/Express** (backend), using polyglot persistence across PostgreSQL, Neo4j, MongoDB, and Redis, with event streaming via Apache Kafka.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite |
| Backend | Node.js, Express |
| Relational DB | PostgreSQL |
| Graph DB | Neo4j |
| Document DB | MongoDB |
| Cache | Redis |
| Message Queue | Apache Kafka |
| Real-time | Socket.io |
| Auth | JWT + Refresh Tokens |

---

## Features

- **Authentication** — Register, login, JWT with auto-refresh
- **Posts** — Create, like/unlike, comment, share; all-posts feed & network feed
- **Profile** — Edit bio, headline, avatar, cover; manage skills and education
- **Network** — Follow/unfollow, connect; smart suggestions (mutual friends, same school, same company, popular)
- **Jobs** — Post job listings, apply to jobs, skill-based recommendations, view applicants
- **Notifications** — Real-time via Socket.io; mark read / mark all read
- **Companies** — Create and manage company staff (superadmin)

---

## Prerequisites

- Node.js 14+
- npm
- Docker & Docker Compose

---

## Getting Started

### 1. Start all database services

```bash
docker-compose up -d
```

| Service | Port | Credentials |
|---------|------|-------------|
| PostgreSQL | 5432 | user: `admin` / pass: `secret123` / db: `linkedin_clone` |
| MongoDB | 27017 | — |
| Neo4j Browser | 7474 | `neo4j` / `password123` |
| Neo4j Bolt | 7687 | `neo4j` / `password123` |
| Redis | 6379 | — |
| Kafka | 9092 | — |

### 2. Configure environment

Create `backend/.env`:

```env
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
SUPERADMIN_EMAIL=your_admin_email@example.com
PORT=9000
```

### 3. Start the backend

```bash
cd backend
npm install
npm run dev
```

Runs on `http://localhost:9000`

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`

---

## Default Test Accounts

| Email | Password | Role |
|-------|----------|------|
| john@example.com | password123 | User |
| jane@example.com | password123 | User |

---

## Project Structure

```
Semina_DB/
├── backend/
│   ├── data/             # DB connection files (postgresql.js, neo4j.js, mongo.js, redis.js)
│   ├── datadriven/       # Kafka producers & consumers (data_collector.js)
│   ├── middleware/       # Auth verification, Redis caching
│   ├── query/            # DB query abstractions (neo4j.js, user.js, ...)
│   ├── routes/           # Express route handlers
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/   # React components (Feed, Network, Jobs, Profile, ...)
│       └── api.js        # Axios client with JWT interceptors
├── script/
│   ├── postgres.sql      # PostgreSQL schema
│   └── neo4j_linkedin.cypher  # Neo4j seed data
└── docker-compose.yml
```

---

## Database Responsibilities

| Database | Stores |
|----------|--------|
| PostgreSQL | Users, profiles, companies, jobs, applications, notifications |
| Neo4j | Social graph: follows, connections, skills, schools, job matching |
| MongoDB | Post content, comments, interaction counts |
| Redis | Feed cache, job recommendation cache, unread notification counts |

---

## Kafka Event Flow

| Event Topic | Trigger | Consumer Action |
|-------------|---------|----------------|
| `user.created` | User registers | Neo4j: create User node |
| `posts.events` CREATE | Post created | Neo4j: create Post node + AUTHORED relation |
| `posts.events` LIKE/UNLIKE | Post liked/unliked | Neo4j: create/remove LIKED relation |
| `posts.events` COMMENT_ADD | Post commented | Neo4j: create COMMENTED relation |
| `posts.events` SHARE | Post shared | Neo4j: create SHARED relation |
| `jobs.events` CREATE | Job posted | Neo4j: create Job node |
| `jobs.events` APPLY | User applies | Neo4j: create APPLIED_TO relation |

---

## API Endpoints

### Auth — `/api/auth`
```
POST /register        Register new account
POST /login           Login
POST /refresh         Refresh JWT token
POST /logout          Logout
```

### Users & Network — `/api/users`
```
GET    /all                              All users
GET    /suggestions/:userId              Friend suggestions
GET    /suggestions-all/:userId          Combined suggestions (multi-factor)
GET    /mutual/:userId1/:userId2         Mutual connections
GET    /followers/:userId                Followers list
GET    /following/:userId                Following list
GET    /:userId/skills                   User's skills
GET    /:userId/schools                  User's education
POST   /follow                           Follow a user
POST   /unfollow                         Unfollow a user
POST   /connect                          Connect with a user
POST   /:userId/skills                   Add skill
DELETE /:userId/skills/:skillName        Remove skill
POST   /:userId/school                   Add school
DELETE /:userId/school/:schoolName       Remove school
```

### Posts — `/api/posts`
```
POST /create                Create post
GET  /feed                  All posts feed (paginated)
GET  /feed/network          Network feed (followed users)
GET  /:id                   Get post by ID
GET  /:id/comments          Get comments (paginated)
GET  /:id/interactions      Get who liked/commented/shared
POST /:id/like              Like post
POST /:id/unlike            Unlike post
POST /:id/comment           Add comment
POST /:id/share             Share post
```

### Jobs — `/api/jobs`
```
POST   /create                   Post a job
GET    /                         Recommended jobs (skill-based)
GET    /applied                  Jobs current user applied to
GET    /my-jobs                  Jobs posted by current user
GET    /:id                      Job details
GET    /:id/applicants           All applicants for a job
GET    /:id/best-candidates      Top matched candidates
GET    /:id/skills               Required skills for job
PUT    /:id                      Update job
DELETE /:id                      Delete job
POST   /:id/apply                Apply to job
POST   /:id/skills               Add required skill
DELETE /:id/skills/:skillName    Remove required skill
```

### Profiles — `/api/profiles`
```
GET /api/profiles/:userId    View user profile
PUT /api/profiles/me         Update own profile
```

### Companies — `/api/companies`
```
GET    /                      All companies
GET    /my                    Companies managed by current user
GET    /:id/users             Company staff list
POST   /:id/add-user          Add member to company
DELETE /:id/users/:userId     Remove member from company
```

### Admin — `/api/admin`
```
POST /companies/create    Create company (superadmin only)
GET  /companies           List all companies (superadmin only)
```

### Notifications — `/api/notifications`
```
GET /                     Get notifications (cursor-paginated)
GET /unread-count         Get unread count
PUT /:id/read             Mark as read
PUT /read-all             Mark all as read
```

---

## Seeding Neo4j Data

Open Neo4j Browser at `http://localhost:7474` and run the contents of `script/neo4j_linkedin.cypher` to seed skills, schools, and social graph data needed for job recommendations and network suggestions.
