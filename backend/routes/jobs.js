const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Jobs = require('../query/jobs');
const Neo4j = require('../query/neo4j');
const psql = require('../data/postgresql');
const { publishJobEvent, JOBS_EVENT_TYPE } = require('../datadriven/data_collector');
const cache = require('../query/cache');

router.post('/create', [verifyToken], async (req, res) => {
  try {
    const { title, company_id, location, description, salary_range } = req.body;
    console.log('[DEBUG Job Create] Payload:', { title, company_id, location, description, salary_range, userId: req.userId });

    if (!company_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(company_id)) {
      return res.status(400).json({ error: 'Valid Company ID is required' });
    }
    if (!title) return res.status(400).json({ error: 'Title is required' });

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
      recruiter_id: job.recruiter_id,
      salary_range: job.salary_range,
    }).catch(err => console.error('Kafka publishJobEvent CREATE:', err));
    res.json(job);
  } catch (err) {
    console.error('[DEBUG Job Create] Error:', err);
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
    let job_ids = await cache.getCache({
      type: cache.CACHE_TYPE.JOB_RECOMMENDATIONS, 
      object_id: req.userId, 
      params: {date:dateStr},
      refesh_timeout: false, // the recommend for daily, so we don't want refesh it
    });
    if (job_ids === null) {
      const records = await Neo4j.getSuggestJobsForUser(req.userId, 20);
      job_ids = records.map(r => r.toObject().job_id);
      await cache.storeCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, req.userId, job_ids, {date:dateStr})
    }

    const validIds = (job_ids || []).filter(id => 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    
    if (validIds.length === 0) return res.json([]);
    
    const result = await Jobs.GetByIds(validIds);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching jobs:', err);
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

// Get jobs managed by current user
router.get('/my-jobs', [verifyToken], async (req, res) => {
  try {
    const result = await Jobs.GetByManager(req.userId);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single job by ID
router.get('/:id', [verifyToken], async (req, res) => {
  try {
    const jobId = req.params.id;
    
    // 1. Get job from PostgreSQL
    const result = await Jobs.GetFullDetail(jobId);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = result.rows[0];

    // 2. Get skills matching info from Neo4j
    const recommendations = await Neo4j.getJobRecommendations(req.userId);
    const recs = recommendations.map(r => r.toObject());
    const match = recs.find(r => String(r.job_id) === String(jobId));
    
    // 3. Get required skills list
    const skillsRes = await Neo4j.getJobSkills(jobId);
    
    res.json({
      ...job,
      matching_skills: match ? Number(match.matching_skills) : 0,
      required_skills_list: skillsRes.map(s => s.toObject().name)
    });
  } catch (err) {
    console.error('Error fetching job details:', err);
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

// Get required skills for a job
router.get('/:id/skills', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getJobSkills(req.params.id);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a required skill to a job
router.post('/:id/skills', [verifyToken], async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'skill name required' });
    await Neo4j.addJobSkill(req.params.id, name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a required skill from a job
router.delete('/:id/skills/:skillName', [verifyToken], async (req, res) => {
  try {
    await Neo4j.removeJobSkill(req.params.id, decodeURIComponent(req.params.skillName));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply to a job
router.post('/:id/apply', [verifyToken], async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.userId;

    // Check if user is the recruiter of this job
    const jobResult = await psql.Query('SELECT recruiter_id FROM jobs WHERE id = $1', [jobId]);
    console.log('[DEBUG Apply] Check:', { 
      jobId, 
      userId, 
      recruiterId: jobResult.rows[0]?.recruiter_id, 
      match: String(jobResult.rows[0]?.recruiter_id) === String(userId) 
    });
    
    if (jobResult.rowCount > 0 && String(jobResult.rows[0].recruiter_id) === String(userId)) {
      return res.status(403).json({ error: "You cannot apply to your own job posting." });
    }

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

module.exports = router;