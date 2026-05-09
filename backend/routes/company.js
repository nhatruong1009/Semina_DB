const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Companies = require('../query/companies');
const Neo4j = require('../query/neo4j');

// Get all companies
router.get('/', [verifyToken], async (req, res) => {
  try {
    const result = await Companies.GetCompanies();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get companies managed by current user
router.get('/my', [verifyToken], async (req, res) => {
  try {
    const result = await Companies.GetCompaniesByUser(req.userId);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a user to a company
router.post('/:id/add-user', [verifyToken], async (req, res) => {
  try {
    const { userId, role } = req.body;
    const companyId = req.params.id;

    const result = await Companies.AddCompanyUser(companyId, userId, role || 'RECRUITER');
    const resolvedUserId = result.rows[0]?.user_id;
    if (resolvedUserId) {
      Neo4j.worksAt(resolvedUserId, companyId)
        .catch(err => console.error('Neo4j worksAt:', err));
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users of a company
router.get('/:id/users', [verifyToken], async (req, res) => {
  try {
    const companyId = req.params.id;
    const result = await Companies.GetCompanyUsers(companyId);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deactivate a user from a company
router.delete('/:id/users/:userId', [verifyToken], async (req, res) => {
  try {
    const { id: companyId, userId } = req.params;
    const result = await Companies.DeactivateCompanyUser(companyId, userId);
    Neo4j.removeWorksAt(userId, companyId)
      .catch(err => console.error('Neo4j removeWorksAt:', err));
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
