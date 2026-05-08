const express = require('express');
const router = express.Router();
const { users } = require('../data');
const { verifyToken } = require('../middleware/auth');
const neo4j = require('../data/neo4j');

router.get('/profile/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, password: undefined });
});

router.get('/all', (req, res) => {
  res.json(users.map(u => ({ ...u, password: undefined })));
});

router.post('/follow/:id',[
    verifyToken
  ], (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const currentUser = users.find(u => u.id === req.userId);
  const targetUser = users.find(u => u.id === targetUserId);

  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  if (!currentUser.following.includes(targetUserId)) {
    currentUser.following.push(targetUserId);
  }
  if (!targetUser.followers.includes(req.userId)) {
    targetUser.followers.push(req.userId);
  }

  res.json({ message: 'Following user', currentUser: { ...currentUser, password: undefined } });
});

router.post('/unfollow/:id',[
    verifyToken
  ], (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const currentUser = users.find(u => u.id === req.userId);
  const targetUser = users.find(u => u.id === targetUserId);

  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  currentUser.following = currentUser.following.filter(id => id !== targetUserId);
  targetUser.followers = targetUser.followers.filter(id => id !== req.userId);

  res.json({ message: 'Unfollowed user', currentUser: { ...currentUser, password: undefined } });
});

// ── Neo4j Social Graph ──────────────────────────────────────────────

router.get('/neo4j/suggestions/:userId', async (req, res) => {
  try {
    const records = await neo4j.Query(
      `MATCH (u:User {user_id: $userId})-[:CONNECTS]->(friend)-[:CONNECTS]->(suggest)
       WHERE suggest.user_id <> $userId
       AND NOT (u)-[:CONNECTS]->(suggest)
       RETURN suggest.name AS suggested_user, suggest.user_id AS user_id`,
      { userId: req.params.userId }
    );
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/neo4j/mutual/:userId1/:userId2', async (req, res) => {
  try {
    const records = await neo4j.Query(
      `MATCH (u1:User {user_id: $userId1})-[:FOLLOWS]->(common)<-[:FOLLOWS]-(u2:User {user_id: $userId2})
       RETURN common.name AS mutual_connection, common.user_id AS user_id`,
      { userId1: req.params.userId1, userId2: req.params.userId2 }
    );
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/neo4j/job-recommendations/:userId', async (req, res) => {
  try {
    const records = await neo4j.Query(
      `MATCH (u:User {user_id: $userId})-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(j:Job)
       WHERE j.status = 'OPEN'
       RETURN j.title AS job, j.salary_range AS salary, count(s) AS matching_skills
       ORDER BY matching_skills DESC`,
      { userId: req.params.userId }
    );
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/neo4j/same-school/:userId', async (req, res) => {
  try {
    const records = await neo4j.Query(
      `MATCH (u:User {user_id: $userId})-[:STUDIED_AT]->(school)<-[:STUDIED_AT]-(other:User)
       WHERE other.user_id <> $userId
       RETURN other.name AS name, other.user_id AS user_id, school.name AS school`,
      { userId: req.params.userId }
    );
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/neo4j/same-company/:userId', async (req, res) => {
  try {
    const records = await neo4j.Query(
      `MATCH (u:User {user_id: $userId})-[:WORKS_AT]->(company)<-[:WORKS_AT]-(other:User)
       WHERE other.user_id <> $userId
       RETURN other.name AS name, other.user_id AS user_id, company.name AS company`,
      { userId: req.params.userId }
    );
    res.json(records.map(r => r.toObject()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/neo4j/connect', async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    await neo4j.Query(
      `MATCH (u1:User {user_id: $userId1}), (u2:User {user_id: $userId2})
       MERGE (u1)-[:CONNECTS {connected_at: $now}]->(u2)`,
      { userId1, userId2, now: new Date().toISOString() }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/neo4j/follow', async (req, res) => {
  try {
    const { followerId, followeeId } = req.body;
    await neo4j.Query(
      `MATCH (u1:User {user_id: $followerId}), (u2:User {user_id: $followeeId})
       MERGE (u1)-[:FOLLOWS]->(u2)`,
      { followerId, followeeId }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;