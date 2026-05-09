const express = require('express');
const router = express.Router();
const { verifyToken, checkSuperAdmin} = require('../middleware/auth');
const Companies = require('../query/companies');
const Neo4j = require('../query/neo4j');

// Create company and assign an admin
router.post('/companies/create', [verifyToken, checkSuperAdmin], async (req, res) => {
  try {
    const { name, industry, description, email } = req.body;
    const createdAt = new Date();

    const companyResult = await Companies.CreateCompany(name, industry, description, createdAt);
    if (!companyResult || companyResult.rowCount === 0) {
      return res.status(500).json({ success: false, error: 'Company creation failed' });
    }
    const company = companyResult.rows[0];

    // Assign the chosen admin user
    const adminResult = await Companies.AddCompanyUser(company.id, email, 'ADMIN');
    const adminUserId = adminResult.rows[0]?.user_id;

    Neo4j.createCompanyNode(company.id, company.name)
      .catch(err => console.error('Neo4j createCompanyNode:', err));
    if (adminUserId) {
      Neo4j.worksAt(adminUserId, company.id)
        .catch(err => console.error('Neo4j worksAt:', err));
    }

    res.json(company);
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all companies (super admin view)
router.get('/companies', [verifyToken, checkSuperAdmin], async (req, res) => {
  try {
    const result = await Companies.GetCompanies();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
