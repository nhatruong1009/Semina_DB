const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Jobs = require('../query/jobs');
const { publishJobEvent, JOBS_EVENT_TYPE } = require('../datadriven/data_collector');

router.post('/create', [verifyToken], async (req, res) => {
  try {
    const { title, company_id, location, description, salary_range } = req.body;
    const createdAt = new Date();
    const records = await Jobs.Create(company_id, req.userId, title, location, description, salary_range, createdAt)
    if (!records || records.rowCount === 0) {
      return res.status(500).json({ success: false, error: "Job creation failed" });
    }
    const job = records.rows[0];
    publishJobEvent(JOBS_EVENT_TYPE.CREATE, {
      job_id: job.id,
      title: job.title,
      company_id: job.company_id,
      salary_range: job.salary_range,
      recruiter_id: req.userId,
    }).catch(err => console.error('Kafka publishJobEvent CREATE:', err));
    res.json(job);
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a job
router.put('/:id', [verifyToken], async (req, res) => {
  try {
    const { title, location, description, salary_range } = req.body;
    const records = await Jobs.Update(req.params.id, title, location, description, salary_range);
    if (!records || records.rowCount === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(records.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a job
router.delete('/:id', [verifyToken], async (req, res) => {
  try {
    await Jobs.Delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
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

// Get jobs managed by current user
router.get('/my-jobs', [verifyToken], async (req, res) => {
  try {
    const result = await Jobs.GetByManager(req.userId);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get applicants for a job
router.get('/:id/applicants', [verifyToken], async (req, res) => {
  try {
    const result = await Jobs.GetApplicants(req.params.id);
    res.json(result.rows);
  } catch (err) {
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
      return res.status(500).json({ success: false, error: "Job apply failed" });
    }

    publishJobEvent(JOBS_EVENT_TYPE.APPLY, {
      user_id: userId,
      job_id: jobId,
    }).catch(err => console.error('Kafka publishJobEvent APPLY:', err));
    res.json(records.rows[0]);
  } catch (err) {
    console.error('Error applying to job:', err);
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

module.exports = router;