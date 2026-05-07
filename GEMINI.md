# GEMINI.md — Context file for Gemini CLI
# Project: Semina_DB — LinkedIn Clone
# Owner: Hà (Neo4j) | Stack: Node.js/Express + React/Vite

## Project Overview
LinkedIn Clone full-stack app with polyglot persistence (multiple databases):
- PostgreSQL: User auth, Profile, Company, Job, Application
- MongoDB: Posts, Feed, Comments, Likes
- Neo4j: Social Graph (connections, follows, skill matching)
- Redis: Session, Cache
- Backend: Node.js + Express (port 9000)
- Frontend: React + Vite (port 3000)

## My Role: Neo4j Integration
I am responsible for integrating Neo4j (Graph Store) into the backend and connecting it to the frontend Network page.

## Directory Structure
```
SEMINA_DB/
├── backend/
│   ├── data/
│   │   ├── neo4j.js            # Neo4j connection — MY FILE
│   │   ├── mongo.js            # MongoDB connection
│   │   ├── postgresql.js       # PostgreSQL connection
│   │   └── redis.js            # Redis connection
│   ├── routes/
│   │   └── users.js            # Add Neo4j API routes here
│   ├── server.js
│   └── .env                    # Add NEO4J credentials here
├── frontend/src/
│   ├── components/
│   │   └── Network.jsx         # Update to show Neo4j suggestions
│   └── api.js                  # Add Neo4j API calls here
└── script/
    └── neo4j_linkedin.cypher   # Neo4j setup — already done
```

## Neo4j AuraDB Connection
Add to backend/.env:
```
NEO4J_URI=neo4j+s://7140fa6c.databases.neo4j.io
NEO4J_USERNAME=7140fa6c
NEO4J_PASSWORD=<saved password>
```

Install driver:
```bash
cd backend
npm install neo4j-driver
```

## Neo4j Data Model

### Nodes (already created in AuraDB)
- User: user_id, name, headline, location
- Company: company_id, name, industry
- School: school_id, name, location
- Skill: skill_id, name
- Job: job_id, title, salary_range, status, location

### Relationships (already created)
- (User)-[:FOLLOWS]->(User)
- (User)-[:CONNECTS {connected_at}]->(User)
- (User)-[:WORKS_AT {position, start_date}]->(Company)
- (User)-[:STUDIED_AT {degree, field, start_year, end_year}]->(School)
- (User)-[:HAS_SKILL]->(Skill)
- (Job)-[:REQUIRES_SKILL]->(Skill)

## What needs to be done

### 1. backend/data/neo4j.js
Create Neo4j connection and export driver:
```javascript
const neo4j = require('neo4j-driver');
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);
module.exports = driver;
```

### 2. backend/routes/users.js
Add these API endpoints:
- GET /api/neo4j/suggestions/:userId — connection suggestions
- GET /api/neo4j/mutual/:userId1/:userId2 — mutual connections
- GET /api/neo4j/job-recommendations/:userId — job suggestions by skill
- GET /api/neo4j/same-school/:userId — people from same school
- GET /api/neo4j/same-company/:userId — people from same company
- POST /api/neo4j/connect — create CONNECTS relationship
- POST /api/neo4j/follow — create FOLLOWS relationship

### 3. frontend/src/components/Network.jsx
Update to fetch and display:
- Connection suggestions from /api/neo4j/suggestions/:userId
- People from same school/company

### 4. frontend/src/api.js
Add API call functions for all Neo4j endpoints

## Key Cypher Queries

### Connection suggestions (friends of friends)
```cypher
MATCH (u:User {user_id: $userId})-[:CONNECTS]->(friend)-[:CONNECTS]->(suggest)
WHERE suggest.user_id <> $userId
AND NOT (u)-[:CONNECTS]->(suggest)
RETURN suggest.name AS name, suggest.user_id AS user_id
```

### Mutual connections
```cypher
MATCH (u1:User {user_id: $userId1})-[:FOLLOWS]->(common)<-[:FOLLOWS]-(u2:User {user_id: $userId2})
RETURN common.name AS name, common.user_id AS user_id
```

### Job recommendations by skill match
```cypher
MATCH (u:User {user_id: $userId})-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(j:Job)
WHERE j.status = 'OPEN'
RETURN j.title AS job, j.salary_range AS salary, count(s) AS matching_skills
ORDER BY matching_skills DESC
```

### Same school
```cypher
MATCH (u:User {user_id: $userId})-[:STUDIED_AT]->(school)<-[:STUDIED_AT]-(other:User)
WHERE other.user_id <> $userId
RETURN other.name AS name, other.user_id AS user_id, school.name AS school
```

### Same company
```cypher
MATCH (u:User {user_id: $userId})-[:WORKS_AT]->(company)<-[:WORKS_AT]-(other:User)
WHERE other.user_id <> $userId
RETURN other.name AS name, other.user_id AS user_id, company.name AS company
```

## Important Notes
- Do NOT modify backend/data/mongo.js, postgresql.js, redis.js
- Do NOT modify routes/posts.js or routes/jobs.js
- Only touch: backend/data/neo4j.js, backend/routes/users.js, frontend/src/components/Network.jsx, frontend/src/api.js
- user_id in Neo4j must match users.id in PostgreSQL
- Current sample data uses u001/u002/u003 format
- Script to reset Neo4j: script/neo4j_linkedin.cypher
