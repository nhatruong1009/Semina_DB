const express = require('express');
const router = express.Router();
const Neo4j = require('../query/neo4j');
const psql = require('../data/postgresql');
const { verifyToken } = require('../middleware/auth');
const cache = require('../query/cache');
const { publishUserEvent, USERS_EVENT_TYPE } = require('../datadriven/data_collector');

router.get('/suggestions-all/:userId', [verifyToken], async (req, res) => {
  try {
    const { limit, friend, same_school, same_company, popular } = req.query;
    const ratio = {
      friend:       friend       ? parseFloat(friend)       : 0.4,
      same_school:  same_school  ? parseFloat(same_school)  : 0.2,
      same_company: same_company ? parseFloat(same_company) : 0.2,
      popular:      popular      ? parseFloat(popular)      : 0.2,
    };
    const results = await Neo4j.getSuggestionsAll(req.params.userId, {
      limit: limit ? parseInt(limit) : undefined,
      ratio,
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/suggestions/:userId', [verifyToken], async (req, res) => {
  try {
    const { limit, exclude } = req.query;
    const records = await Neo4j.getSuggestions(req.params.userId, {
      limit: limit ? parseInt(limit) : undefined,
      exclude: exclude ? exclude.split(',') : undefined,
    });
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mutual/:userId1/:userId2', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getMutualConnections(req.params.userId1, req.params.userId2);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// n job phù hợp nhất cho user (có match_percent, enrich từ PostgreSQL)
router.get('/best-jobs/:userId', [verifyToken], async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const records = await Neo4j.getBestJobsForUser(req.params.userId, limit);
    const recs = records.map(r => r.toObject());

    // No skill data in Neo4j — fall back to all open jobs for demo
    if (recs.length === 0) {
      const fallback = await psql.Query(`
        SELECT j.id, j.title, j.salary_range, j.status, j.created_at,
               c.name AS company_name, c.id AS company_id,
               COUNT(ja.id)::int AS applicants_count
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        LEFT JOIN job_applications ja ON j.id = ja.job_id
        WHERE j.status = 'OPEN'
        GROUP BY j.id, c.name, c.id
        ORDER BY j.created_at DESC
        LIMIT $1
      `, [limit]);
      return res.json(fallback.rows.map(j => ({
        ...j, matching_skills: 0, required_skills: 0, match_percent: 0,
      })));
    }

    const jobIds = recs.map(r => String(r.job_id));
    const result = await psql.Query(`
      SELECT j.id, j.title, j.salary_range, j.status, j.created_at,
             c.name AS company_name, c.id AS company_id,
             COUNT(ja.id)::int AS applicants_count
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN job_applications ja ON j.id = ja.job_id
      WHERE j.id = ANY($1::uuid[])
      GROUP BY j.id, c.name, c.id
    `, [jobIds]);

    const metaMap = Object.fromEntries(
      recs.map(r => [String(r.job_id), {
        matching_skills: Number(r.matching_skills),
        required_skills: Number(r.required_skills),
        match_percent:   Number(r.match_percent),
      }])
    );
    const enriched = result.rows
      .map(j => ({ ...j, ...metaMap[j.id] }))
      .sort((a, b) => b.match_percent - a.match_percent);

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/job-recommendations/:userId', [verifyToken], async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    // 1. Get all OPEN jobs from PostgreSQL with full details
    const allJobsResult = await psql.Query(`
      SELECT j.id, j.title, j.location, j.description, j.salary_range, j.status, j.created_at, j.recruiter_id,
             c.name AS company_name, c.id AS company_id,
             p.full_name AS recruiter_name,
             COUNT(ja.id)::int AS applicants_count
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      LEFT JOIN job_applications ja ON j.id = ja.job_id
      LEFT JOIN profiles p ON j.recruiter_id = p.user_id
      WHERE j.status = 'OPEN' AND j.recruiter_id != $1
      GROUP BY j.id, c.name, c.id, p.full_name
      ORDER BY j.created_at DESC
    `, [userId]);
    const allJobs = allJobsResult.rows;
    console.log(`[DEBUG JobRecs] Found ${allJobs.length} open jobs in Postgres`);

    if (allJobs.length === 0) return res.json({ jobs: [], total: 0, page, limit, hasMore: false });

    // 2. Get skill matching info from Neo4j
    let recs = [];
    try {
        const recommendations = await Neo4j.getJobRecommendations(userId);
        recs = recommendations.map(r => r.toObject());
    } catch (e) {
        console.error('[JobRecs] Neo4j skill match error:', e.message);
    }
    const matchMap = Object.fromEntries(recs.map(r => [String(r.job_id), Number(r.matching_skills)]));

    // 3. Fetch required skills for all jobs from Neo4j
    const jobIds = allJobs.map(j => j.id);
    let skillsMap = {};
    try {
        const skillsRecords = await Neo4j.getMultipleJobsSkills(jobIds);
        skillsMap = Object.fromEntries(
            skillsRecords.map(r => {
                const obj = r.toObject();
                return [obj.job_id, obj.skills];
            })
        );
    } catch (e) {
        console.error('[JobRecs] Neo4j skills fetch error:', e.message);
    }

    // 4. Enrich + Sort by skill match then date
    const enriched = allJobs.map(j => ({
      ...j,
      matching_skills: matchMap[String(j.id)] ?? 0,
      required_skills_list: skillsMap[String(j.id)] ?? []
    })).sort((a, b) => {
      if (b.matching_skills !== a.matching_skills) return b.matching_skills - a.matching_skills;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // 5. Apply pagination
    const total = enriched.length;
    const paginated = enriched.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    res.json({ jobs: paginated, total, page, limit, hasMore });
  } catch (err) {
    console.error('Error in job-recommendations:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/same-school/:userId',  [verifyToken], async (req, res) => {
  try {
    const { limit, exclude } = req.query;
    const records = await Neo4j.getSameSchool(req.params.userId, {
      limit: limit ? parseInt(limit) : undefined,
      exclude: exclude ? exclude.split(',') : undefined,
    });
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/same-company/:userId', [verifyToken], async (req, res) => {
  try {
    const { limit, exclude } = req.query;
    const records = await Neo4j.getSameCompany(req.params.userId, {
      limit: limit ? parseInt(limit) : undefined,
      exclude: exclude ? exclude.split(',') : undefined,
    });
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/connect',  [verifyToken], async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    publishUserEvent(USERS_EVENT_TYPE.CONNECT, { user_id: userId1, target_user_id: userId2 }).catch(console.error);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/follow', [verifyToken], async (req, res) => {
  try {
    const { followerId, followeeId } = req.body;
    publishUserEvent(USERS_EVENT_TYPE.FOLLOW, { user_id: followerId, target_user_id: followeeId }).catch(console.error);
    cache.invalidateCache(cache.CACHE_TYPE.FEED_NETWORK, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/unfollow', [verifyToken], async (req, res) => {
  try {
    const { followeeId } = req.body;
    await Neo4j.unfollow(String(req.userId), followeeId);
    cache.invalidateCache(cache.CACHE_TYPE.FEED_NETWORK, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/followers/:userId', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getFollowers(req.params.userId);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/following/:userId', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getFollowing(req.params.userId);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/connections/:userId', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getConnections(req.params.userId);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', [verifyToken], async (req, res) => {

  try {
    const psql = require('../init_db').psql;
    const result = await psql.Query(`
      SELECT u.id, u.email, p.full_name, p.headline, p.bio, p.location, p.avatar_url
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY p.full_name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all available skills (for dropdown in UI)
router.get('/skills/all', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getAllSkills();
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all available schools (for dropdown in UI)
router.get('/schools/all', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getAllSchools();
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get schools of a user
router.get('/:userId/schools', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getUserSchools(req.params.userId);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get skills of a user
router.get('/:userId/skills', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getUserSkills(req.params.userId);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add school to user
router.post('/:userId/school', [verifyToken], async (req, res) => {
  try {
    const { schoolName } = req.body;
    if (!schoolName) return res.status(400).json({ error: 'schoolName required' });
    await Neo4j.addStudiedAt(req.params.userId, schoolName);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove school from user
router.delete('/:userId/school/:schoolName', [verifyToken], async (req, res) => {
  try {
    await Neo4j.removeStudiedAt(req.params.userId, decodeURIComponent(req.params.schoolName));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a skill to a user
router.post('/:userId/skills', [verifyToken], async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'skill name required' });
    await Neo4j.addUserSkill(req.params.userId, name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a skill from a user
router.delete('/:userId/skills/:skillName', [verifyToken], async (req, res) => {
  try {
    await Neo4j.removeUserSkill(req.params.userId, decodeURIComponent(req.params.skillName));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

