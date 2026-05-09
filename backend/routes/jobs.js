const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Jobs = require('../query/jobs')

router.post('/create', [verifyToken], async (req, res) => {
  try {
    const { title, company_id, location, description, salary_range } = req.body;
    console.log(title, company_id, location, description, salary_range);
    const createdAt = new Date();
    const records = await Jobs.Create(company_id, title, salary_range, createdAt)    
    if (!records || records.rowCount === 0) {
      console.log("Job creation failed");
      return res.status(500).json({ success: false, error: "Job creation failed" });
    }
    res.json(records.rows[0]);
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all jobs with company and author info
router.get('/', [verifyToken], async (req, res) => {
  try {
    const result = await Jobs.Get();
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Apply to a job
router.post('/:id/apply', [verifyToken], async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.userId;

    // Insert application (unique constraint prevents duplicates)
    const records = await Jobs.Apply(jobId, userId)

    if (!records || records.rowCount === 0) {
      console.log("Job apply failed");
      return res.status(500).json({ success: false, error: "Job apply failed" });
    }

    res.json(records.rows[0]);
  } catch (err) {
    console.error('Error applying to job:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;