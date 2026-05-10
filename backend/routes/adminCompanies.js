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
    const { company, admin } = await Companies.CreateCompanyWithAdmin( name, industry, description, createdAt, email);
    if (!company || !admin) {
      return res.status(500).json({ success: false, error: 'Company creation failed' });
    }

    // Create Neo4j nodes/relationships
    Neo4j.createCompanyNode(company.id, company.name)
      .catch(err => console.error('Neo4j createCompanyNode:', err));
    Neo4j.worksAt(admin.id, company.id)
      .catch(err => console.error('Neo4j worksAt:', err));

    // Respond with both company and admin info
    res.json({ company, admin });
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
