const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Neo4j = require('../query/neo4j');

router.get('/profile/:id', (req, res) => {
  res.status(501).json({ message: 'Profile retrieval should be handled by the data layer and return the user profile.' });
});

router.get('/all', (req, res) => {
  res.status(501).json({ message: 'User list retrieval should be handled by the data layer and return all users.' });
});

router.post('/follow/:id', [verifyToken], (req, res) => {
  res.status(501).json({ message: 'Follow action should be handled by the data layer and return the updated current user.' });
});

router.post('/unfollow/:id', [verifyToken], (req, res) => {
  res.status(501).json({ message: 'Unfollow action should be handled by the data layer and return the updated current user.' });
});

// ── Neo4j Social Graph ──────────────────────────────────────────────

router.get('/neo4j/suggestions/:userId', async (req, res) => {
  try {
    const records = await Neo4j.getSuggestions(req.params.userId);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/neo4j/mutual/:userId1/:userId2', async (req, res) => {
  try {
    const records = await Neo4j.getMutualConnections(req.params.userId1, req.params.userId2);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/neo4j/job-recommendations/:userId', async (req, res) => {
  try {
    const records = await Neo4j.getJobRecommendations(req.params.userId);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/neo4j/same-school/:userId', async (req, res) => {
  try {
    const records = await Neo4j.getSameSchool(req.params.userId);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/neo4j/same-company/:userId', async (req, res) => {
  try {
    const records = await Neo4j.getSameCompany(req.params.userId);
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/neo4j/connect', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    await Neo4j.createConnect(userId1, userId2);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/neo4j/follow', async (req, res) => {
  try {
    const { followerId, followeeId } = req.body;
    await Neo4j.createFollow(followerId, followeeId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
