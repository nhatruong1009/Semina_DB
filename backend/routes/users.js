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
    const cached = await cache.getCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, req.params.userId);
    if (cached) return res.json(cached);

    const records = await Neo4j.getJobRecommendations(req.params.userId);
    const recs = records.map(r => r.toObject());

    // Fallback: nếu user chưa có skills trong Neo4j → trả all open jobs
    if (recs.length === 0) {
      const result = await psql.Query(`
        SELECT j.id, j.title, j.salary_range, j.status, j.created_at,
               c.name AS company_name, c.id AS company_id,
               COUNT(ja.id)::int AS applicants_count
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        LEFT JOIN job_applications ja ON j.id = ja.job_id
        WHERE j.status = 'OPEN'
        GROUP BY j.id, c.name, c.id
        ORDER BY j.created_at DESC
      `);
      const fallback = result.rows.map(j => ({ ...j, matching_skills: 0 }));
      cache.storeCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, req.params.userId, fallback);
      return res.json(fallback);
    }

    // Enrich: lấy full job details từ PostgreSQL cho các job Neo4j recommend
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

    // Gắn matching_skills từ Neo4j vào từng job, sort theo số skill khớp
    const matchMap = Object.fromEntries(recs.map(r => [String(r.job_id), Number(r.matching_skills)]));
    const enriched = result.rows
      .map(j => ({ ...j, matching_skills: matchMap[j.id] ?? 0 }))
      .sort((a, b) => b.matching_skills - a.matching_skills);

    cache.storeCache(cache.CACHE_TYPE.JOB_RECOMMENDATIONS, req.params.userId, enriched);
    res.json(enriched);
  } catch (err) {
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

// Get skills of a user
router.get('/:userId/skills', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getUserSkills(req.params.userId);
    res.json(records.map(r => r.toObject()));
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

