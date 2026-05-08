const neo4j = require('../data/neo4j');

const createUser = (userId, name, headline = '', location = '') =>
  neo4j.Query(
    `MERGE (u:User {user_id: $userId})
     SET u.name = $name, u.headline = $headline, u.location = $location`,
    { userId: String(userId), name, headline, location }
  );

const getSuggestions = (userId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:CONNECTS]->(friend)-[:CONNECTS]->(suggest)
     WHERE suggest.user_id <> $userId
     AND NOT (u)-[:CONNECTS]->(suggest)
     RETURN suggest.name AS suggested_user, suggest.user_id AS user_id`,
    { userId }
  );

const getMutualConnections = (userId1, userId2) =>
  neo4j.Query(
    `MATCH (u1:User {user_id: $userId1})-[:FOLLOWS]->(common)<-[:FOLLOWS]-(u2:User {user_id: $userId2})
     RETURN common.name AS mutual_connection, common.user_id AS user_id`,
    { userId1, userId2 }
  );

const getJobRecommendations = (userId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(j:Job)
     WHERE j.status = 'OPEN'
     RETURN j.title AS job, j.salary_range AS salary, count(s) AS matching_skills
     ORDER BY matching_skills DESC`,
    { userId }
  );

const getSameSchool = (userId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:STUDIED_AT]->(school)<-[:STUDIED_AT]-(other:User)
     WHERE other.user_id <> $userId
     RETURN other.name AS name, other.user_id AS user_id, school.name AS school`,
    { userId }
  );

const getSameCompany = (userId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:WORKS_AT]->(company)<-[:WORKS_AT]-(other:User)
     WHERE other.user_id <> $userId
     RETURN other.name AS name, other.user_id AS user_id, company.name AS company`,
    { userId }
  );

const createConnect = (userId1, userId2) =>
  neo4j.Query(
    `MATCH (u1:User {user_id: $userId1}), (u2:User {user_id: $userId2})
     MERGE (u1)-[:CONNECTS {connected_at: $now}]->(u2)`,
    { userId1, userId2, now: new Date().toISOString() }
  );

const createFollow = (followerId, followeeId) =>
  neo4j.Query(
    `MATCH (u1:User {user_id: $followerId}), (u2:User {user_id: $followeeId})
     MERGE (u1)-[:FOLLOWS]->(u2)`,
    { followerId, followeeId }
  );

module.exports = {
  createUser,
  getSuggestions,
  getMutualConnections,
  getJobRecommendations,
  getSameSchool,
  getSameCompany,
  createConnect,
  createFollow,
};
