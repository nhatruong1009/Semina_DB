const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Jobs = require('../query/jobs');
const Neo4j = require('../query/neo4j');
const psql = require('../data/postgresql');
const { publishJobEvent, JOBS_EVENT_TYPE } = require('../datadriven/data_collector');
const cache = require('../query/cache');
const Neo4j = require('../query/neo4j');

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
    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`
    let job_ids = await cache.getCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, req.userId, {date:dateStr});
    if (job_ids === null) {
      const records = await Neo4j.getSuggestJobsForUser(req.userId, 20);
      job_ids = records.map(r => r.toObject().job_id);
      await cache.storeCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, req.userId, job_ids, {date:dateStr})
    }

    const result = await Jobs.GetByIds(job_ids);
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

// n ứng viên phù hợp nhất cho 1 job (sort theo % skill match)
router.get('/:id/best-candidates', [verifyToken], async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const records = await Neo4j.getBestUsersForJob(req.params.id, limit);
    const candidates = records.map(r => r.toObject());

    if (candidates.length === 0) return res.json([]);

    // Enrich với PostgreSQL: lấy email + avatar
    const userIds = candidates.map(c => String(c.user_id));
    const result = await psql.Query(`
      SELECT u.id, u.email, p.full_name, p.avatar_url, p.location
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ANY($1::uuid[])
    `, [userIds]);

    const pgMap = Object.fromEntries(result.rows.map(u => [u.id, u]));
    const enriched = candidates.map(c => ({
      user_id:         String(c.user_id),
      name:            String(c.name),
      headline:        String(c.headline || ''),
      location:        String(c.location || ''),
      matching_skills: Number(c.matching_skills),
      required_skills: Number(c.required_skills),
      match_percent:   Number(c.match_percent),
      email:           pgMap[String(c.user_id)]?.email      ?? null,
      avatar_url:      pgMap[String(c.user_id)]?.avatar_url ?? null,
    }));

    res.json(enriched);
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