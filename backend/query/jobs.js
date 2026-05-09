const psql = require('../init_db').psql

const Create = (company_id, title, description, location, salary_range, createdAt) => {
  return psql.Query(`INSERT INTO jobs (company_id, title, description, location, salary_range, status, created_at)
    VALUES ($1, $2, $3, $4, $5, 'OPEN', $6)
    RETURNING *`,
    [company_id, title, description, location, salary_range, createdAt]
  );
}

const Apply = (job_id, user_id) => {
  return psql.Query(
    `INSERT INTO job_applications (job_id, user_id, status, applied_at)
       VALUES ($1::UUID, $2::UUID, 'PENDING', CURRENT_TIMESTAMP)
       ON CONFLICT (job_id, user_id) DO NOTHING
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

const Get = (userId) => {
  return psql.Query(
    `SELECT j.id, j.title, j.description, j.location, j.salary_range, j.status, j.created_at,
            c.name AS company_name, c.industry, c.description AS company_description,
            COUNT(DISTINCT a.id) AS applicants_count,
            EXISTS(SELECT 1 FROM job_applications WHERE job_id = j.id AND user_id = $1::UUID) AS has_applied
    FROM jobs j
    JOIN companies c ON j.company_id = c.id
    LEFT JOIN job_applications a ON j.id = a.job_id
    GROUP BY j.id, j.title, j.description, j.location, j.salary_range, j.status, j.created_at, 
             c.name, c.industry, c.description
    ORDER BY j.created_at DESC`,
    [userId]
  );
}

const GetApplicants = (jobId) => {
  return psql.Query(
    `SELECT u.id, u.email, p.full_name, p.headline, a.applied_at, a.status
     FROM job_applications a
     JOIN users u ON a.user_id = u.id
     LEFT JOIN profiles p ON u.id = p.user_id
     WHERE a.job_id = $1::UUID
     ORDER BY a.applied_at DESC`,
    [jobId]
  );
}

const Update = (id, title, description, location, salary_range) => {
  return psql.Query(
    `UPDATE jobs 
     SET title = $2, description = $3, location = $4, salary_range = $5
     WHERE id = $1::UUID
     RETURNING *`,
    [id, title, description, location, salary_range]
  );
}

const Delete = (id) => {
  return psql.Query(
    `DELETE FROM jobs WHERE id = $1::UUID RETURNING *`,
    [id]
  );
}

module.exports = {
  Create,
  Apply,
  Get,
  GetApplied,
  GetApplicants,
  Update,
  Delete
}