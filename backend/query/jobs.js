const psql = require('../init_db').psql

const Create = (company_id, recruiter_id, title, location, description, salary_range, createdAt) => {
  return psql.Query(
    `INSERT INTO jobs (company_id, recruiter_id, title, location, description, salary_range, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', $7)
     RETURNING *`,
    [company_id, recruiter_id, title, location, description, salary_range, createdAt]
  );
}

const Update = (id, title, location, description, salary_range) => {
  return psql.Query(`UPDATE jobs 
    SET title = $2, location = $3, description = $4, salary_range = $5
    WHERE id = $1
    RETURNING *`,
    [id, title, location, description, salary_range]
  );
}

const Delete = (id) => {
  return psql.Query(`DELETE FROM jobs WHERE id = $1`, [id]);
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
    `SELECT j.id, j.title, j.location, j.description, j.salary_range, j.status, j.created_at,
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
    `SELECT j.id, j.title, j.location, j.description, j.salary_range, j.status, j.created_at,
            c.name AS company_name, c.industry, c.description AS company_description,
            COUNT(a.id) AS applicants_count
    FROM jobs j
    JOIN companies c ON j.company_id = c.id
    LEFT JOIN job_applications a ON j.id = a.job_id
    GROUP BY j.id, c.name, c.industry, c.description
    ORDER BY j.created_at DESC`
  );
}

const GetByIds = (ids) => {
  return psql.Query(
    `SELECT j.id, j.title, j.location, j.description, j.salary_range, j.status, j.created_at,
            c.name AS company_name, c.industry, c.description AS company_description,
            COUNT(a.id) AS applicants_count
     FROM jobs j
     JOIN companies c ON j.company_id = c.id
     LEFT JOIN job_applications a ON j.id = a.job_id
     WHERE j.id = ANY($1)
     GROUP BY j.id, c.name, c.industry, c.description
     ORDER BY j.created_at DESC`,
    [ids]  // pass array of IDs as parameter
  );
};


const GetByManager = (user_id) => {
  return psql.Query(
    `SELECT j.id, j.title, j.location, j.description, j.salary_range, j.status, j.created_at,
            c.name AS company_name,
            COUNT(a.id) AS applicants_count
    FROM jobs j
    JOIN companies c ON j.company_id = c.id
    JOIN company_users cu ON c.id = cu.company_id
    LEFT JOIN job_applications a ON j.id = a.job_id
    WHERE cu.user_id = $1 AND cu.active = true
    GROUP BY j.id, c.name
    ORDER BY j.created_at DESC`,
    [user_id]
  );
}


const GetApplicants = (job_id) => {
  return psql.Query(
    `SELECT a.id AS application_id, a.status AS application_status, a.applied_at,
            u.id AS user_id, u.email,
            p.full_name, p.headline, p.location AS user_location
     FROM job_applications a
     JOIN users u ON a.user_id = u.id
     LEFT JOIN profiles p ON u.id = p.user_id
     WHERE a.job_id = $1
     ORDER BY a.applied_at DESC`,
    [job_id]
  );
}

module.exports = {
  Create,
  Update,
  Delete,
  Apply,
  Get,
  GetByIds,
  GetApplied,
  GetByManager,
  GetApplicants
}