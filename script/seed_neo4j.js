/**
 * seed_neo4j.js
 *
 * Đọc dữ liệu thật từ PostgreSQL, rồi tạo đầy đủ nodes + relationships
 * trong Neo4j để demo tất cả tính năng Social Graph.
 *
 * Chạy từ thư mục gốc project:
 *   node script/seed_neo4j.js
 *
 * Idempotent: dùng MERGE nên chạy nhiều lần không bị duplicate.
 */

require('dotenv').config();
const { Client } = require('pg');
const neo4j = require('neo4j-driver');

// ── Kết nối DB ──────────────────────────────────────────────────────────
const pg = new Client({
  host:     process.env.PG_HOST     || 'localhost',
  port:     Number(process.env.PG_PORT) || 5432,
  user:     process.env.PG_USER     || 'admin',
  password: process.env.PG_PASSWORD || 'secret123',
  database: process.env.PG_DATABASE || 'linkedin_clone',
});

const driver = neo4j.driver(
  process.env.NEO4J_URI      || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER     || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password123'
  )
);

// helper chạy Cypher
async function cypher(query, params = {}) {
  const session = driver.session();
  try {
    await session.run(query, params);
  } finally {
    await session.close();
  }
}

// ── Skill mapping: keyword trong headline/title → danh sách skill_id ───
const SKILL_KEYWORDS = [
  { keywords: ['data engineer', 'etl', 'pipeline', 'airflow'],     skills: ['skill-python', 'skill-sql', 'skill-airflow'] },
  { keywords: ['data analyst', 'analytics', 'business intelligence', 'bi'], skills: ['skill-sql', 'skill-python', 'skill-excel'] },
  { keywords: ['data scientist', 'machine learning', 'ml', 'ai', 'deep learning'], skills: ['skill-python', 'skill-sql', 'skill-tensorflow'] },
  { keywords: ['backend', 'api', 'server', 'node', 'express'],      skills: ['skill-nodejs', 'skill-python', 'skill-sql'] },
  { keywords: ['frontend', 'react', 'ui', 'ux', 'web'],             skills: ['skill-javascript', 'skill-react', 'skill-css'] },
  { keywords: ['fullstack', 'full stack', 'full-stack'],             skills: ['skill-javascript', 'skill-react', 'skill-nodejs'] },
  { keywords: ['devops', 'cloud', 'aws', 'gcp', 'azure', 'kubernetes', 'docker'], skills: ['skill-docker', 'skill-aws', 'skill-kubernetes'] },
  { keywords: ['java', 'spring'],                                    skills: ['skill-java', 'skill-sql', 'skill-spring'] },
  { keywords: ['mobile', 'ios', 'android', 'flutter', 'react native'], skills: ['skill-javascript', 'skill-react', 'skill-flutter'] },
  { keywords: ['database', 'dba', 'sql', 'postgres', 'mysql'],      skills: ['skill-sql', 'skill-python', 'skill-neo4j'] },
  { keywords: ['neo4j', 'graph'],                                    skills: ['skill-neo4j', 'skill-sql', 'skill-python'] },
  { keywords: ['software engineer', 'developer', 'programmer'],     skills: ['skill-python', 'skill-javascript', 'skill-sql'] },
];

// Tất cả skills có trong hệ thống
const ALL_SKILLS = [
  { id: 'skill-python',     name: 'Python' },
  { id: 'skill-sql',        name: 'SQL' },
  { id: 'skill-javascript', name: 'JavaScript' },
  { id: 'skill-nodejs',     name: 'Node.js' },
  { id: 'skill-react',      name: 'React' },
  { id: 'skill-java',       name: 'Java' },
  { id: 'skill-spring',     name: 'Spring Boot' },
  { id: 'skill-neo4j',      name: 'Neo4j' },
  { id: 'skill-airflow',    name: 'Airflow' },
  { id: 'skill-docker',     name: 'Docker' },
  { id: 'skill-kubernetes', name: 'Kubernetes' },
  { id: 'skill-aws',        name: 'AWS' },
  { id: 'skill-excel',      name: 'Excel' },
  { id: 'skill-tensorflow', name: 'TensorFlow' },
  { id: 'skill-css',        name: 'CSS' },
  { id: 'skill-flutter',    name: 'Flutter' },
];

const ALL_SCHOOLS = [
  { id: 'school-hcmus', name: 'HCMUS',  location: 'Ho Chi Minh City' },
  { id: 'school-hcmut', name: 'HCMUT',  location: 'Ho Chi Minh City' },
  { id: 'school-hcmulaw', name: 'UEL',   location: 'Ho Chi Minh City' },
  { id: 'school-neu',   name: 'NEU',    location: 'Ha Noi' },
  { id: 'school-vnu',   name: 'VNU-HCM', location: 'Ho Chi Minh City' },
];

// Lấy skills phù hợp với text (headline hoặc job title)
function mapSkills(text) {
  if (!text) return ['skill-python', 'skill-sql']; // default
  const lower = text.toLowerCase();
  for (const { keywords, skills } of SKILL_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) return skills;
  }
  return ['skill-python', 'skill-sql']; // fallback
}

// ── Main ────────────────────────────────────────────────────────────────
async function seed() {
  await pg.connect();
  await driver.verifyConnectivity();
  console.log('✓ Kết nối PostgreSQL và Neo4j thành công\n');

  // ── 1. Đọc dữ liệu từ PostgreSQL ──────────────────────────────────
  const { rows: users } = await pg.query(`
    SELECT u.id, u.email,
           COALESCE(p.full_name, split_part(u.email, '@', 1)) AS name,
           COALESCE(p.headline, '') AS headline,
           COALESCE(p.location, 'Vietnam') AS location
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    ORDER BY u.created_at
  `);

  const { rows: companies } = await pg.query(`
    SELECT id, name, COALESCE(industry, 'Technology') AS industry
    FROM companies
    ORDER BY created_at
  `);

  const { rows: jobs } = await pg.query(`
    SELECT id, company_id, title, COALESCE(status, 'OPEN') AS status,
           salary_range
    FROM jobs
    ORDER BY created_at
  `);

  const { rows: companyUsers } = await pg.query(`
    SELECT cu.company_id, cu.user_id, cu.role
    FROM company_users cu
    WHERE cu.active = true
  `);

  console.log(`Đọc từ PostgreSQL:`);
  console.log(`  Users   : ${users.length}`);
  console.log(`  Companies: ${companies.length}`);
  console.log(`  Jobs    : ${jobs.length}`);
  console.log(`  WORKS_AT: ${companyUsers.length}\n`);

  // ── 2. Upsert User nodes ────────────────────────────────────────────
  console.log('[ 1/9 ] Upsert User nodes...');
  for (const u of users) {
    await cypher(
      `MERGE (u:User {user_id: $id})
       SET u.name = $name, u.headline = $headline, u.location = $location`,
      { id: u.id, name: u.name, headline: u.headline, location: u.location }
    );
  }
  console.log(`  ✓ ${users.length} users`);

  // ── 3. Upsert Company nodes ─────────────────────────────────────────
  console.log('[ 2/9 ] Upsert Company nodes...');
  for (const c of companies) {
    await cypher(
      `MERGE (c:Company {company_id: $id})
       SET c.name = $name, c.industry = $industry`,
      { id: c.id, name: c.name, industry: c.industry }
    );
  }
  console.log(`  ✓ ${companies.length} companies`);

  // ── 4. Upsert Job nodes ─────────────────────────────────────────────
  console.log('[ 3/9 ] Upsert Job nodes...');
  for (const j of jobs) {
    // parse salary_range: "20-30M VND" hoặc JSON object
    let salaryMin = null, salaryMax = null, currency = 'VND';
    if (j.salary_range) {
      try {
        const parsed = typeof j.salary_range === 'string'
          ? JSON.parse(j.salary_range)
          : j.salary_range;
        salaryMin = parsed.min ?? null;
        salaryMax = parsed.max ?? null;
        currency  = parsed.currency ?? 'VND';
      } catch {
        // plain string như "20-30M VND", giữ nguyên
      }
    }
    await cypher(
      `MERGE (j:Job {job_id: $id})
       SET j.title = $title, j.company_id = $companyId, j.status = $status,
           j.salary_min = $salaryMin, j.salary_max = $salaryMax, j.salary_currency = $currency
       WITH j
       OPTIONAL MATCH (c:Company {company_id: $companyId})
       FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
         MERGE (j)-[:BELONGS_TO]->(c)
       )`,
      { id: j.id, title: j.title, companyId: j.company_id, status: j.status,
        salaryMin, salaryMax, currency }
    );
  }
  console.log(`  ✓ ${jobs.length} jobs`);

  // ── 5. WORKS_AT từ company_users ────────────────────────────────────
  console.log('[ 4/9 ] Tạo WORKS_AT relationships...');
  let worksAtCount = 0;
  for (const cu of companyUsers) {
    await cypher(
      `MATCH (u:User {user_id: $userId}), (c:Company {company_id: $companyId})
       MERGE (u)-[r:WORKS_AT]->(c)
       SET r.position = $role, r.start_date = $startDate`,
      { userId: cu.user_id, companyId: cu.company_id,
        role: cu.role || 'Employee', startDate: '2023-01-01' }
    );
    worksAtCount++;
  }
  console.log(`  ✓ ${worksAtCount} WORKS_AT edges`);

  // ── 6. Skill nodes (static) ─────────────────────────────────────────
  console.log('[ 5/9 ] Tạo Skill nodes...');
  for (const s of ALL_SKILLS) {
    await cypher(
      `MERGE (s:Skill {skill_id: $id}) SET s.name = $name`,
      { id: s.id, name: s.name }
    );
  }
  console.log(`  ✓ ${ALL_SKILLS.length} skills`);

  // ── 7. School nodes (static) ────────────────────────────────────────
  console.log('[ 6/9 ] Tạo School nodes...');
  for (const sc of ALL_SCHOOLS) {
    await cypher(
      `MERGE (s:School {school_id: $id}) SET s.name = $name, s.location = $location`,
      { id: sc.id, name: sc.name, location: sc.location }
    );
  }
  console.log(`  ✓ ${ALL_SCHOOLS.length} schools`);

  // ── 8. HAS_SKILL: gán skill cho user dựa theo headline ──────────────
  console.log('[ 7/9 ] Tạo HAS_SKILL relationships...');
  let hasSkillCount = 0;
  for (const u of users) {
    const skillIds = mapSkills(u.headline);
    for (const skillId of skillIds) {
      await cypher(
        `MATCH (u:User {user_id: $userId}), (s:Skill {skill_id: $skillId})
         MERGE (u)-[:HAS_SKILL]->(s)`,
        { userId: u.id, skillId }
      );
      hasSkillCount++;
    }
  }
  console.log(`  ✓ ${hasSkillCount} HAS_SKILL edges`);

  // ── 9. REQUIRES_SKILL: gán skill cho job dựa theo title ─────────────
  console.log('[ 8/9 ] Tạo REQUIRES_SKILL relationships...');
  let requiresSkillCount = 0;
  for (const j of jobs) {
    const skillIds = mapSkills(j.title);
    for (const skillId of skillIds) {
      await cypher(
        `MATCH (j:Job {job_id: $jobId}), (s:Skill {skill_id: $skillId})
         MERGE (j)-[:REQUIRES_SKILL]->(s)`,
        { jobId: j.id, skillId }
      );
      requiresSkillCount++;
    }
  }
  console.log(`  ✓ ${requiresSkillCount} REQUIRES_SKILL edges`);

  // ── 10. STUDIED_AT: phân phối users vào schools ────────────────────
  // (PostgreSQL không có dữ liệu học vấn → phân theo index để demo)
  console.log('[ 9/9 ] Tạo STUDIED_AT relationships...');
  const DEGREE_OPTIONS = ['Bachelor', 'Master', 'Engineer'];
  const FIELD_OPTIONS  = ['Computer Science', 'Information Technology', 'Software Engineering',
                           'Data Science', 'Information Systems', 'Electrical Engineering'];
  let studiedAtCount = 0;
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const school = ALL_SCHOOLS[i % ALL_SCHOOLS.length];
    const degree = DEGREE_OPTIONS[i % DEGREE_OPTIONS.length];
    const field  = FIELD_OPTIONS[i % FIELD_OPTIONS.length];
    const startYear = 2018 + (i % 4);
    const endYear   = startYear + 4;
    await cypher(
      `MATCH (u:User {user_id: $userId}), (s:School {school_id: $schoolId})
       MERGE (u)-[r:STUDIED_AT]->(s)
       SET r.degree = $degree, r.field = $field,
           r.start_year = $startYear, r.end_year = $endYear`,
      { userId: u.id, schoolId: school.id, degree, field, startYear, endYear }
    );
    studiedAtCount++;
  }
  console.log(`  ✓ ${studiedAtCount} STUDIED_AT edges`);

  // ── 11. Thêm FOLLOWS giữa tất cả users (nếu chưa có) ───────────────
  if (users.length <= 20) {
    // Với dataset nhỏ: all-to-all follows để test network feed dễ hơn
    console.log('\n[ bonus ] Tạo FOLLOWS giữa tất cả users (dataset nhỏ)...');
    let followCount = 0;
    for (const u1 of users) {
      for (const u2 of users) {
        if (u1.id === u2.id) continue;
        await cypher(
          `MATCH (a:User {user_id: $a}), (b:User {user_id: $b})
           MERGE (a)-[:FOLLOWS]->(b)`,
          { a: u1.id, b: u2.id }
        );
        followCount++;
      }
    }
    console.log(`  ✓ ${followCount} FOLLOWS edges`);
  }

  // ── Tổng kết ────────────────────────────────────────────────────────
  const session = driver.session();
  const [nodeResult, relResult] = await Promise.all([
    session.run('MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY count DESC'),
    session.run('MATCH ()-[r]->() RETURN type(r) AS rel, count(r) AS count ORDER BY count DESC'),
  ]);
  await session.close();

  console.log('\n══════════════════════════════════════════');
  console.log('  Neo4j sau khi seed');
  console.log('══════════════════════════════════════════');
  console.log('  Nodes:');
  nodeResult.records.forEach(r => console.log(`    ${String(r.get('label')).padEnd(12)} ${r.get('count')}`));
  console.log('  Relationships:');
  relResult.records.forEach(r => console.log(`    ${String(r.get('rel')).padEnd(18)} ${r.get('count')}`));
  console.log('\n✓ Seed hoàn tất!');
}

seed()
  .catch(err => { console.error('✗ Seed thất bại:', err.message); process.exit(1); })
  .finally(() => Promise.all([pg.end(), driver.close()]));
