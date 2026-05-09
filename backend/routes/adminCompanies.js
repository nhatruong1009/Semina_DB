const express = require('express');
const router = express.Router();
const { verifyToken, checkSuperAdmin} = require('../middleware/auth');
const Companies = require('../query/companies');

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
    await Companies.AddCompanyUser(company.id, email, 'ADMIN');

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
