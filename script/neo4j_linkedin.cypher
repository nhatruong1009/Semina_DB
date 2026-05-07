// ============================================================
// NEO4J LINKEDIN - SOCIAL GRAPH MODULE
// ============================================================


// ------------------------------------------------------------
// 1. CONSTRAINTS
// ------------------------------------------------------------

CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.user_id IS UNIQUE;
CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.company_id IS UNIQUE;
CREATE CONSTRAINT school_id IF NOT EXISTS FOR (s:School) REQUIRE s.school_id IS UNIQUE;
CREATE CONSTRAINT skill_id IF NOT EXISTS FOR (s:Skill) REQUIRE s.skill_id IS UNIQUE;
CREATE CONSTRAINT job_id IF NOT EXISTS FOR (j:Job) REQUIRE j.job_id IS UNIQUE;


// ------------------------------------------------------------
// 2. SAMPLE DATA 
// ------------------------------------------------------------

// Users
CREATE (:User {user_id: '<UUID_USER_1>', name: 'Nguyen Van A', headline: 'Data Engineer', location: 'Ho Chi Minh City'});
CREATE (:User {user_id: '<UUID_USER_2>', name: 'Tran Thi B', headline: 'Backend Developer', location: 'Ha Noi'});
CREATE (:User {user_id: '<UUID_USER_3>', name: 'Le Van C', headline: 'Data Analyst', location: 'Ho Chi Minh City'});

// Companies (UUID khớp với companies.id trong PostgreSQL)
CREATE (:Company {company_id: '<UUID_COMPANY_1>', name: 'FPT Software', industry: 'Technology'});
CREATE (:Company {company_id: '<UUID_COMPANY_2>', name: 'VNG Corporation', industry: 'Technology'});

// Schools
CREATE (:School {school_id: '<UUID_SCHOOL_1>', name: 'HCMUS', location: 'Ho Chi Minh City'});
CREATE (:School {school_id: '<UUID_SCHOOL_2>', name: 'HCMUT', location: 'Ho Chi Minh City'});

// Skills
CREATE (:Skill {skill_id: '<UUID_SKILL_1>', name: 'Python'});
CREATE (:Skill {skill_id: '<UUID_SKILL_2>', name: 'SQL'});
CREATE (:Skill {skill_id: '<UUID_SKILL_3>', name: 'Neo4j'});
CREATE (:Skill {skill_id: '<UUID_SKILL_4>', name: 'Airflow'});

// Jobs 
CREATE (:Job {job_id: '<UUID_JOB_1>', title: 'Data Engineer', salary_range: '20-30M', status: 'OPEN', location: 'Ho Chi Minh City'});
CREATE (:Job {job_id: '<UUID_JOB_2>', title: 'Backend Developer', salary_range: '25-35M', status: 'OPEN', location: 'Ha Noi'});


// ------------------------------------------------------------
// 3. RELATIONSHIPS
// ------------------------------------------------------------

// FOLLOWS
MATCH (u1:User {user_id: '<UUID_USER_1>'}), (u2:User {user_id: '<UUID_USER_2>'})
CREATE (u1)-[:FOLLOWS]->(u2);

MATCH (u1:User {user_id: '<UUID_USER_1>'}), (u3:User {user_id: '<UUID_USER_3>'})
CREATE (u1)-[:FOLLOWS]->(u3);

MATCH (u2:User {user_id: '<UUID_USER_2>'}), (u3:User {user_id: '<UUID_USER_3>'})
CREATE (u2)-[:FOLLOWS]->(u3);

// CONNECTS
MATCH (u1:User {user_id: '<UUID_USER_1>'}), (u2:User {user_id: '<UUID_USER_2>'})
CREATE (u1)-[:CONNECTS {connected_at: '2024-01-15'}]->(u2);

MATCH (u2:User {user_id: '<UUID_USER_2>'}), (u3:User {user_id: '<UUID_USER_3>'})
CREATE (u2)-[:CONNECTS {connected_at: '2024-02-01'}]->(u3);

// WORKS_AT
MATCH (u1:User {user_id: '<UUID_USER_1>'}), (c1:Company {company_id: '<UUID_COMPANY_1>'})
CREATE (u1)-[:WORKS_AT {position: 'Data Engineer', start_date: '2022-01-01', end_date: null}]->(c1);

MATCH (u2:User {user_id: '<UUID_USER_2>'}), (c2:Company {company_id: '<UUID_COMPANY_2>'})
CREATE (u2)-[:WORKS_AT {position: 'Backend Developer', start_date: '2021-06-01', end_date: null}]->(c2);

// STUDIED_AT
MATCH (u1:User {user_id: '<UUID_USER_1>'}), (s1:School {school_id: '<UUID_SCHOOL_1>'})
CREATE (u1)-[:STUDIED_AT {degree: 'Bachelor', field: 'Computer Science', start_year: 2018, end_year: 2022}]->(s1);

MATCH (u3:User {user_id: '<UUID_USER_3>'}), (s1:School {school_id: '<UUID_SCHOOL_1>'})
CREATE (u3)-[:STUDIED_AT {degree: 'Bachelor', field: 'Information System', start_year: 2018, end_year: 2022}]->(s1);

// HAS_SKILL
MATCH (u1:User {user_id: '<UUID_USER_1>'}), (sk1:Skill {skill_id: '<UUID_SKILL_1>'}) CREATE (u1)-[:HAS_SKILL]->(sk1);
MATCH (u1:User {user_id: '<UUID_USER_1>'}), (sk2:Skill {skill_id: '<UUID_SKILL_2>'}) CREATE (u1)-[:HAS_SKILL]->(sk2);
MATCH (u1:User {user_id: '<UUID_USER_1>'}), (sk4:Skill {skill_id: '<UUID_SKILL_4>'}) CREATE (u1)-[:HAS_SKILL]->(sk4);
MATCH (u2:User {user_id: '<UUID_USER_2>'}), (sk1:Skill {skill_id: '<UUID_SKILL_1>'}) CREATE (u2)-[:HAS_SKILL]->(sk1);
MATCH (u3:User {user_id: '<UUID_USER_3>'}), (sk2:Skill {skill_id: '<UUID_SKILL_2>'}) CREATE (u3)-[:HAS_SKILL]->(sk2);

// REQUIRES_SKILL
MATCH (j1:Job {job_id: '<UUID_JOB_1>'}), (sk1:Skill {skill_id: '<UUID_SKILL_1>'}) CREATE (j1)-[:REQUIRES_SKILL]->(sk1);
MATCH (j1:Job {job_id: '<UUID_JOB_1>'}), (sk2:Skill {skill_id: '<UUID_SKILL_2>'}) CREATE (j1)-[:REQUIRES_SKILL]->(sk2);
MATCH (j1:Job {job_id: '<UUID_JOB_1>'}), (sk4:Skill {skill_id: '<UUID_SKILL_4>'}) CREATE (j1)-[:REQUIRES_SKILL]->(sk4);
MATCH (j2:Job {job_id: '<UUID_JOB_2>'}), (sk1:Skill {skill_id: '<UUID_SKILL_1>'}) CREATE (j2)-[:REQUIRES_SKILL]->(sk1);


// ------------------------------------------------------------
// 4. INDEX
// ------------------------------------------------------------

CREATE INDEX user_name IF NOT EXISTS FOR (u:User) ON (u.name);
CREATE INDEX job_title IF NOT EXISTS FOR (j:Job) ON (j.title);
CREATE INDEX skill_name IF NOT EXISTS FOR (s:Skill) ON (s.name);


// ------------------------------------------------------------
// 5. QUERIES - CÁC CHỨC NĂNG CHÍNH
// ------------------------------------------------------------

// 5.1 Tìm bạn chung giữa 2 users
MATCH (u1:User {user_id: '<UUID_1>'})-[:FOLLOWS]->(common)<-[:FOLLOWS]-(u2:User {user_id: '<UUID_2>'})
RETURN common.name AS mutual_connection;

// 5.2 Tìm người cùng trường
MATCH (u:User {user_id: '<UUID>'})-[:STUDIED_AT]->(school)<-[:STUDIED_AT]-(other:User)
WHERE other.user_id <> '<UUID>'
RETURN other.name AS same_school_user, school.name AS school;

// 5.3 Tìm người cùng công ty
MATCH (u:User {user_id: '<UUID>'})-[:WORKS_AT]->(company)<-[:WORKS_AT]-(other:User)
WHERE other.user_id <> '<UUID>'
RETURN other.name AS same_company_user, company.name AS company;


