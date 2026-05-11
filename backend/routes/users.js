const express = require('express');
const router = express.Router();
const Neo4j = require('../query/neo4j');
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

router.get('/job-recommendations/:userId', [verifyToken], async (req, res) => {
  try {
    const records = await Neo4j.getJobRecommendations(req.params.userId);
    res.json(records.map(r => r.toObject()));
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

module.exports = router;

