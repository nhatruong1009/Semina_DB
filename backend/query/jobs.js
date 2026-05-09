const psql = require('../init_db').psql

const Create = (company_id, title, salary_range, createdAt) => {
  return psql.Query(`INSERT INTO jobs (company_id, title, salary_range, status, created_at)
    VALUES ($1, $2, $3, 'OPEN', $4)
    RETURNING *`,
    [company_id, title, salary_range, createdAt]
  );
}

const Apply = (job_id, user_id) => {
  return psql.Query(
    `INSERT INTO job_applications (job_id, user_id, status, applied_at)
       VALUES ($1, $2, 'PENDING', CURRENT_TIMESTAMP)
       ON CONFLICT (job_id, user_id) DO UPDATE SET applied_at = EXCLUDED.applied_at
       RETURNING *`,
      [job_id, user_id]
  );
}

const GetApplied = (user_id) => {
  return psql.Query(
    `SELECT j.id, j.title, j.salary_range, j.status, j.created_at,
            c.name AS company_name,
            a.status AS application_status, a.applied_at
     FROM job_applications a
     JOIN jobs j ON a.job_id = j.id
     JOIN companies c ON j.company_id = c.id
     WHERE a.user_id = $1
     ORDER BY a.applied_at DESC`,
    [user_id]
  );
}

const Get = () => {
  return psql.Query(
    `SELECT j.id, j.title, j.salary_range, j.status, j.created_at,
            c.name AS company_name, c.industry, c.description AS company_description,
            COUNT(a.id) AS applicants_count
    FROM jobs j
    JOIN companies c ON j.company_id = c.id
    LEFT JOIN job_applications a ON j.id = a.job_id
    GROUP BY j.id, c.name, c.industry, c.description
    ORDER BY j.created_at DESC`
  );
}

module.exports = {
  Create,
  Apply,
  Get,
  GetApplied,
}