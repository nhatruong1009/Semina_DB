const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const neo4j = require('../data/neo4j');

router.get('/profile/:id', (req, res) => {
  // TODO: Fetch user profile from the database by ID.
  // - Return user details without the password.
  res.status(501).json({ message: 'Profile retrieval should be handled by the data layer and return the user profile.' });
});

router.get('/all', (req, res) => {
  // TODO: Fetch all users from the database.
  // - Return user list without passwords.
  res.status(501).json({ message: 'User list retrieval should be handled by the data layer and return all users.' });
});

router.post('/follow/:id', [verifyToken], (req, res) => {
  // TODO: Add target user to current user's following list.
  // - Validate target user exists.
  // - Persist follower/following relationships.
  // - Return confirmation and updated current user.
  res.status(501).json({ message: 'Follow action should be handled by the data layer and return the updated current user.' });
});

router.post('/unfollow/:id', [verifyToken], (req, res) => {
  // TODO: Remove target user from current user's following list.
  // - Validate target user exists.
  // - Persist follower/following relationships.
  // - Return confirmation and updated current user.
  res.status(501).json({ message: 'Unfollow action should be handled by the data layer and return the updated current user.' });
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