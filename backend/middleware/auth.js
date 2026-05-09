const jwt = require('jsonwebtoken');
const { psql } = require('../init_db');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.email = decoded.email
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
const checkSuperAdmin = (req, res, next) => {
  const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
  if (req.email !== SUPERADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden: only super admin can access' });
  }
  next();
};

const checkCompanyAdmin = async (req, res, next) => {
  const userId = req.userId;
  let companyId = req.body.company_id || req.params.companyId;

  // If no companyId is directly provided, but a job id is in params
  if (!companyId && req.params.id) {
    try {
      // Check if the ID belongs to a job first
      const jobResult = await psql.Query('SELECT company_id FROM jobs WHERE id = $1::UUID', [req.params.id]);
      if (jobResult.rowCount > 0) {
        companyId = jobResult.rows[0].company_id;
      } else {
        // If not a job, assume it's a company ID (for routes like /companies/:id)
        companyId = req.params.id;
      }
    } catch (e) {
      // Fallback to assuming it's a company ID
      companyId = req.params.id;
    }
  }

  if (!companyId) return res.status(400).json({ error: 'Company ID required' });

  try {
    const result = await psql.Query(
      `SELECT role FROM company_users WHERE user_id = $1 AND company_id = $2 AND active = true`,
      [userId, companyId]
    );

    if (result.rowCount === 0 || result.rows[0].role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: only company admin can perform this action' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { verifyToken, checkSuperAdmin, checkCompanyAdmin };