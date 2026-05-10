const psql = require('../init_db').psql;

// Create a new company
const CreateCompany = (name, industry, description, createdAt) => {
  return psql.Query(
    `INSERT INTO companies (name, industry, description, created_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, industry, description, createdAt]
  );
};

const CreateCompanyWithAdmin = async (name, industry, description, createdAt, adminEmail) => {
  try {
    await psql.Query('BEGIN');

    // Step 1: Insert the company
    const companyResult = await psql.Query(
      `INSERT INTO companies (name, industry, description, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, industry, description, createdAt]
    );
    const company = companyResult.rows[0];

    // Step 2: Look up the admin user
    const userResult = await psql.Query(
      `SELECT id FROM users WHERE email = $1`,
      [adminEmail]
    );
    if (!userResult || userResult.rowCount === 0) {
      throw new Error('Admin user not found for email: ' + adminEmail);
    }
    const admin = userResult.rows[0];

    // Step 3: Assign admin role
    const companyUserResult = await psql.Query(
      `INSERT INTO company_users (company_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [company.id, admin.id, 'admin']
    );

    await psql.Query('COMMIT');
    return { company, admin };
  } catch (err) {
    await psql.Query('ROLLBACK');
    console.log('create company error ROLLBACK');
    throw err;
  }
};

// Link a user to a company with a role
const AddCompanyUser = async (company_id, email, role) => {
  // Look up the user_id from email
  const userResult = await psql.Query(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );
  if (!userResult || userResult.rowCount === 0) {
    throw new Error('User not found for email: ' + email);
  }
  const user_id = userResult.rows[0].id;
  // Insert into company_users with the resolved user_id
  return psql.Query(
    `INSERT INTO company_users (company_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role
     RETURNING *`,
    [company_id, user_id, role]
  );
};


// Get all companies
const GetCompanies = () => {
  return psql.Query(
    `SELECT * FROM companies ORDER BY created_at DESC`
  );
};

// Get companies managed by a user
const GetCompaniesByUser = (user_id) => {
  return psql.Query(
    `SELECT cu.company_id, c.name
     FROM companies c
     JOIN company_users cu ON c.id = cu.company_id
     WHERE cu.user_id = $1 AND cu.active = true`,
    [user_id]
  );
};

// Get all users of a company
const GetCompanyUsers = (company_id) => {
  return psql.Query(
    `SELECT u.id, u.email, p.full_name, cu.role, cu.active
     FROM company_users cu
     JOIN users u ON cu.user_id = u.id
     LEFT JOIN profiles p ON u.id = p.user_id
     WHERE cu.company_id = $1`,
    [company_id]
  );
};

// Soft-remove a user from a company
const DeactivateCompanyUser = (company_id, user_id) => {
  return psql.Query(
    `UPDATE company_users
     SET active = false
     WHERE company_id = $1 AND user_id = $2
     RETURNING *`,
    [company_id, user_id]
  );
};

module.exports = {
  CreateCompany,
  CreateCompanyWithAdmin,
  AddCompanyUser,
  GetCompanies,
  GetCompaniesByUser,
  GetCompanyUsers,
  DeactivateCompanyUser,
};
