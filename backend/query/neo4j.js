const neo4j = require('../data/neo4j');

const createUser = (userId, name, headline = '', location = '') =>
  neo4j.Query(
    `MERGE (u:User {user_id: $userId})
     SET u.name = $name, u.headline = $headline, u.location = $location`,
    { userId: String(userId), name, headline, location }
  );

const getSuggestions = (userId, { limit = 10, exclude = [] } = {}) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:CONNECTS]->(friend)-[:CONNECTS]->(suggest)
     WHERE suggest.user_id <> $userId
     AND NOT (u)-[:CONNECTS]->(suggest)
     AND NOT suggest.user_id IN $exclude
     RETURN suggest.name AS suggested_user, suggest.user_id AS user_id
     LIMIT toInteger($limit)`,
    { userId, exclude, limit: parseInt(limit) }
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

const getSameSchool = (userId, { limit = 10, exclude = [] } = {}) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:STUDIED_AT]->(school)<-[:STUDIED_AT]-(other:User)
     WHERE other.user_id <> $userId
     AND NOT other.user_id IN $exclude
     RETURN other.name AS name, other.user_id AS user_id, school.name AS school
     LIMIT toInteger($limit)`,
    { userId, exclude, limit: parseInt(limit) }
  );

const getSameCompany = (userId, { limit = 10, exclude = [] } = {}) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:WORKS_AT]->(company)<-[:WORKS_AT]-(other:User)
     WHERE other.user_id <> $userId
     AND NOT other.user_id IN $exclude
     RETURN other.name AS name, other.user_id AS user_id, company.name AS company
     LIMIT toInteger($limit)`,
    { userId, exclude, limit: parseInt(limit) }
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

// ── Post interactions ────────────────────────────────────────────────

const authored = (userId, postId) =>
  neo4j.Query(
    `MERGE (u:User {user_id: $userId})
     MERGE (p:Post {post_id: $postId})
     MERGE (u)-[:AUTHORED]->(p)`,
    { userId: String(userId), postId: String(postId) }
  );

const likePost = (userId, postId) =>
  neo4j.Query(
    `MERGE (u:User {user_id: $userId})
     MERGE (p:Post {post_id: $postId})
     MERGE (u)-[:LIKED]->(p)`,
    { userId: String(userId), postId: String(postId) }
  );

const unlikePost = (userId, postId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[r:LIKED]->(p:Post {post_id: $postId})
     DELETE r`,
    { userId: String(userId), postId: String(postId) }
  );

const commentPost = (userId, postId, commentId) =>
  neo4j.Query(
    `MERGE (u:User {user_id: $userId})
     MERGE (p:Post {post_id: $postId})
     MERGE (u)-[:COMMENTED {comment_id: $commentId}]->(p)`,
    { userId: String(userId), postId: String(postId), commentId: String(commentId) }
  );

const unfollow = (followerId, followeeId) =>
  neo4j.Query(
    `MATCH (u1:User {user_id: $followerId})-[r:FOLLOWS]->(u2:User {user_id: $followeeId})
     DELETE r`,
    { followerId, followeeId }
  );

const sharePost = (userId, postId) =>
  neo4j.Query(
    `MERGE (u:User {user_id: $userId})
     MERGE (p:Post {post_id: $postId})
     MERGE (u)-[:SHARED]->(p)`,
    { userId: String(userId), postId: String(postId) }
  );

const getPostInteractions = (postId) =>
  neo4j.Query(
    `MATCH (u:User)-[r:LIKED|COMMENTED|SHARED]->(p:Post {post_id: $postId})
     RETURN u.user_id AS user_id, u.name AS name, type(r) AS action`,
    { postId: String(postId) }
  );

const getFeedByNetwork = (userId) =>
  neo4j.Query(
    `MATCH (me:User {user_id: $userId})-[:FOLLOWS|CONNECTS]->(friend)-[:LIKED|SHARED]->(p:Post)
     RETURN DISTINCT p.post_id AS post_id, count(*) AS score
     ORDER BY score DESC`,
    { userId: String(userId) }
  );

const getFollowers = (userId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})<-[:FOLLOWS]-(follower:User)
     RETURN follower.user_id AS user_id, follower.name AS name`,
    { userId: String(userId) }
  );

const getFollowing = (userId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:FOLLOWS]->(followed:User)
     RETURN followed.user_id AS user_id, followed.name AS name`,
    { userId: String(userId) }
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
  unfollow,
  authored,
  likePost,
  unlikePost,
  commentPost,
  sharePost,
  getPostInteractions,
  getFeedByNetwork,
  getFollowers,
  getFollowing,
};
