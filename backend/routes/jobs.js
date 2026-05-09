const express = require('express');
const router = express.Router();
const { verifyToken, checkCompanyAdmin } = require('../middleware/auth');
const Jobs = require('../query/jobs');

// Create job
router.post('/create', [verifyToken, checkCompanyAdmin], async (req, res) => {
  try {
    const { title, company_id, location, description, salary_range } = req.body;
    const createdAt = new Date();
    const records = await Jobs.Create(company_id, title, description, location, salary_range, createdAt);
    res.json(records.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all jobs
router.get('/', [verifyToken], async (req, res) => {
  try {
    const result = await Jobs.Get(req.userId);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get jobs applied by current user
router.get('/applied', [verifyToken], async (req, res) => {
  try {
    const result = await Jobs.GetApplied(req.userId);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply to job
router.post('/:id/apply', [verifyToken], async (req, res) => {
  try {
    const records = await Jobs.Apply(req.params.id, req.userId);
    if (!records || records.rowCount === 0) {
      return res.status(400).json({ error: "Already applied" });
    }
    res.json(records.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get applicants
router.get('/:id/applicants', [verifyToken, checkCompanyAdmin], async (req, res) => {
  try {
    const result = await Jobs.GetApplicants(req.params.id);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update job
router.put('/:id', [verifyToken, checkCompanyAdmin], async (req, res) => {
  try {
    const { title, location, description, salary_range } = req.body;
    const result = await Jobs.Update(req.params.id, title, description, location, salary_range);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete job
router.delete('/:id', [verifyToken, checkCompanyAdmin], async (req, res) => {
  try {
    await Jobs.Delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;