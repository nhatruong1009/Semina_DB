const express = require('express');
const router = express.Router();
const Neo4j = require('../query/neo4j');

router.get('/suggestions/:userId', async (req, res) => {
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

router.get('/mutual/:userId1/:userId2', async (req, res) => {
  try {
    const records = await Neo4j.getMutualConnections(req.params.userId1, req.params.userId2);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/job-recommendations/:userId', async (req, res) => {
  try {
    const records = await Neo4j.getJobRecommendations(req.params.userId);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/same-school/:userId', async (req, res) => {
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

router.get('/same-company/:userId', async (req, res) => {
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

router.post('/connect', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    await Neo4j.createConnect(userId1, userId2);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/follow', async (req, res) => {
  try {
    const { followerId, followeeId } = req.body;
    await Neo4j.createFollow(followerId, followeeId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
