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
     RETURN suggest.name AS suggested_user, suggest.user_id AS user_id, suggest.headline AS headline
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
     RETURN j.job_id AS job_id, j.title AS job, j.salary_range AS salary, count(s) AS matching_skills
     ORDER BY matching_skills DESC`,
    { userId }
  );

const getSameSchool = (userId, { limit = 10, exclude = [] } = {}) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:STUDIED_AT]->(school)<-[:STUDIED_AT]-(other:User)
     WHERE other.user_id <> $userId
     AND NOT other.user_id IN $exclude
     RETURN other.name AS name, other.user_id AS user_id, other.headline AS headline, school.name AS school
     LIMIT toInteger($limit)`,
    { userId, exclude, limit: parseInt(limit) }
  );

const getSameCompany = (userId, { limit = 10, exclude = [] } = {}) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:WORKS_AT]->(company)<-[:WORKS_AT]-(other:User)
     WHERE other.user_id <> $userId
     AND NOT other.user_id IN $exclude
     RETURN other.name AS name, other.user_id AS user_id, other.headline AS headline, company.name AS company
     LIMIT toInteger($limit)`,
    { userId, exclude, limit: parseInt(limit) }
  );

const getHighlyConnectedUsers = (userId, { limit = 10, exclude = [] } = {}) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})
     MATCH (suggest:User)
     WHERE suggest.user_id <> $userId
       AND NOT suggest.user_id IN $exclude
       AND NOT (u)-[:CONNECTS]->(suggest)
     WITH suggest, COUNT { (suggest)-[:CONNECTS]-() } AS connections
     ORDER BY connections DESC
     LIMIT $poolSize
     WITH collect(suggest) AS pool
     UNWIND pool AS candidate
     WITH candidate, rand() AS r
     ORDER BY r
     LIMIT $limit
     RETURN candidate.name AS name, candidate.user_id AS user_id, candidate.headline AS headline`,
    { userId, exclude, limit: parseInt(limit), poolSize: parseInt(limit) * 2 }
  );

const DEFAULT_RATIO = { friend: 0.4, same_school: 0.2, same_company: 0.2, popular: 0.2 };

const getSuggestionsAll = async (userId, { limit = 20, ratio = DEFAULT_RATIO } = {}) => {
  const seen = new Set([String(userId)]);
  const results = [];

  const sources = [
    { key: 'friend',       fn: getSuggestions,         nameField: 'suggested_user' },
    { key: 'same_school',  fn: getSameSchool,           nameField: 'name' },
    { key: 'same_company', fn: getSameCompany,          nameField: 'name' },
    { key: 'popular',      fn: getHighlyConnectedUsers, nameField: 'name' },
  ];

  for (const { key, fn, nameField } of sources) {
    const quota = Math.round(limit * (ratio[key] ?? 0));
    if (quota <= 0) continue;

    const rows = await fn(userId, { limit: quota * 2, exclude: [...seen] });

    let taken = 0;
    for (const r of rows) {
      if (taken >= quota) break;
      const obj = r.toObject();
      const uid = String(obj.user_id);
      if (seen.has(uid)) continue;
      seen.add(uid);
      results.push({ user_id: uid, name: obj[nameField], headline: obj.headline || '', relation: key });
      taken++;
    }
  }

  return results;
};

const createCompanyNode = (companyId, name) =>
  neo4j.Query(
    `MERGE (c:Company {company_id: $companyId})
     SET c.name = $name`,
    { companyId: String(companyId), name }
  );

const worksAt = (userId, companyId) =>
  neo4j.Query(
    `MERGE (u:User {user_id: $userId})
     MERGE (c:Company {company_id: $companyId})
     MERGE (u)-[:WORKS_AT]->(c)`,
    { userId: String(userId), companyId: String(companyId) }
  );

const removeWorksAt = (userId, companyId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[r:WORKS_AT]->(c:Company {company_id: $companyId})
     DELETE r`,
    { userId: String(userId), companyId: String(companyId) }
  );

const createJobNode = (jobId, title, companyId, salaryRange = '') =>
  neo4j.Query(
    `MERGE (j:Job {job_id: $jobId})
     SET j.title = $title, j.company_id = $companyId, j.status = 'OPEN', j.salary_range = $salaryRange
     WITH j
     MATCH (c:Company {company_id: $companyId})
     MERGE (j)-[:BELONGS_TO]->(c)`,
    { jobId: String(jobId), title, companyId: String(companyId), salaryRange }
  );

const applyJob = (userId, jobId) =>
  neo4j.Query(
    `MERGE (u:User {user_id: $userId})
     MERGE (j:Job {job_id: $jobId})
     MERGE (u)-[:APPLIED]->(j)`,
    { userId: String(userId), jobId: String(jobId) }
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

const deleteComment = (userId, postId, commentId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[r:COMMENTED {comment_id: $commentId}]->(p:Post {post_id: $postId})
     DELETE r`,
    { userId: String(userId), postId: String(postId), commentId: String(commentId) }
  );

const getPostInteractions = (postId) =>
  neo4j.Query(
    `MATCH (u:User)-[r:LIKED|COMMENTED|SHARED]->(p:Post {post_id: $postId})
     RETURN u.user_id AS user_id, u.name AS name, type(r) AS action`,
    { postId: String(postId) }
  );

const getFeedByNetwork = (userId) =>
  neo4j.Query(
    `MATCH (me:User {user_id: $userId})-[:FOLLOWS|CONNECTS]->(friend)
     MATCH (friend)-[r:AUTHORED|LIKED|SHARED]->(p:Post)
     RETURN DISTINCT p.post_id AS post_id, 
            CASE WHEN type(r) = 'AUTHORED' THEN 2 ELSE 1 END AS score
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

const getConnections = (userId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:CONNECTS]-(connected:User)
     RETURN connected.user_id AS user_id, connected.name AS name`,
    { userId: String(userId) }
  );

module.exports = {

  createUser,
  getSuggestions,
  getSuggestionsAll,
  getHighlyConnectedUsers,
  getMutualConnections,
  getJobRecommendations,
  getSameSchool,
  getSameCompany,
  createCompanyNode,
  worksAt,
  removeWorksAt,
  createJobNode,
  applyJob,
  createConnect,
  createFollow,
  unfollow,
  authored,
  likePost,
  unlikePost,
  commentPost,
  deleteComment,
  sharePost,
  getPostInteractions,
  getFeedByNetwork,
  getFollowers,
  getFollowing,
  getConnections,
};

