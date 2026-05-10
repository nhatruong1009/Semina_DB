const express = require('express');
const router = express.Router();
const Neo4j = require('../query/neo4j');
const psql = require('../data/postgresql');
const { verifyToken } = require('../middleware/auth');
const cache = require('../query/cache')

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

    if (recs.length === 0) return res.json([]);

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
      return res.json(result.rows.map(j => ({ ...j, matching_skills: 0 })));
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
    await Neo4j.createConnect(userId1, userId2);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/follow', [verifyToken], async (req, res) => {
  try {
    const { followerId, followeeId } = req.body;
    await Neo4j.createFollow(followerId, followeeId);
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

module.exports = router;

