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
    `MATCH (u1:User {user_id: $userId1})-[:FOLLOWS]-(common)-[:FOLLOWS]-(u2:User {user_id: $userId2})
     RETURN DISTINCT common.name AS mutual_connection, common.user_id AS user_id`,
    { userId1, userId2 }
  );

const getJobRecommendations = (userId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(j:Job)
     WHERE j.status = 'OPEN'
     RETURN j.job_id AS job_id, j.title AS job, j.salary_min AS salary_min, j.salary_max AS salary_max, j.salary_currency AS salary_currency, count(s) AS matching_skills
     ORDER BY matching_skills DESC`,
    { userId }
  );

// n job phù hợp nhất cho user — sort theo % skill match
const getBestJobsForUser = (userId, limit = 10) =>
  neo4j.Query(
    `MATCH (j:Job) WHERE j.status = 'OPEN'
     OPTIONAL MATCH (u:User {user_id: $userId})-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(j)
     WITH j, count(DISTINCT s) AS matching_skills
     OPTIONAL MATCH (j)-[:REQUIRES_SKILL]->(req:Skill)
     WITH j, matching_skills, count(DISTINCT req) AS required_skills
     RETURN j.job_id        AS job_id,
            j.title         AS title,
            j.company_id    AS company_id,
            j.salary_min    AS salary_min,
            j.salary_max    AS salary_max,
            j.salary_currency AS salary_currency,
            matching_skills,
            required_skills,
            CASE WHEN required_skills > 0
                 THEN round(100.0 * matching_skills / required_skills)
                 ELSE 0 END AS match_percent
     ORDER BY match_percent DESC, matching_skills DESC
     LIMIT toInteger($limit)`,
    { userId: String(userId), limit: parseInt(limit) }
  );

// n ứng viên phù hợp nhất cho 1 job — sort theo % skill match
const getBestUsersForJob = (jobId, limit = 10) =>
  neo4j.Query(
    `MATCH (j:Job {job_id: $jobId})-[:REQUIRES_SKILL]->(s:Skill)<-[:HAS_SKILL]-(u:User)
     WITH u, count(DISTINCT s) AS matching_skills
     MATCH (j2:Job {job_id: $jobId})-[:REQUIRES_SKILL]->(req:Skill)
     WITH u, matching_skills, count(DISTINCT req) AS required_skills
     RETURN u.user_id   AS user_id,
            u.name      AS name,
            u.headline  AS headline,
            u.location  AS location,
            matching_skills,
            required_skills,
            round(100.0 * matching_skills / required_skills) AS match_percent
     ORDER BY match_percent DESC, matching_skills DESC
     LIMIT toInteger($limit)`,
    { jobId, limit: parseInt(limit) }
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
    `MATCH (me:User {user_id: $userId})
     MATCH (suggest:User)
     // FIX #5: Anchor the query to prevent full graph scan
     // In a real prod system, we would anchor by location or school
     // For this fix, we use the 'me' node as a base for traversals if possible,
     // or at least ensure the ID exclusion is efficient.
     WHERE suggest.user_id <> $userId
       AND NOT suggest.user_id IN $exclude
       AND NOT (me)-[:CONNECTS]->(suggest)
     WITH suggest, COUNT { (suggest)-[:CONNECTS]-() } AS connections
     // Optimized sampling: avoid ORDER BY rand() on entire table
     ORDER BY connections DESC
     LIMIT $poolSize
     RETURN suggest.name AS name, suggest.user_id AS user_id, suggest.headline AS headline`,
    { userId, exclude, limit: parseInt(limit), poolSize: parseInt(limit) }
  );

const jobNodeExists = (jobId) =>
  neo4j.Query(
    `MATCH (j:Job {job_id: $jobId}) RETURN count(j) > 0 AS exists`,
    { jobId }
  ).then(res => res[0]?.toObject().exists || false);

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

const createJobNode = (jobId, title, companyId, salaryRange = null) => {
  const salary = typeof salaryRange === 'object' && salaryRange !== null ? salaryRange : {};
  return neo4j.Query(
    `MERGE (j:Job {job_id: $jobId})
     SET j.title = $title, j.company_id = $companyId, j.status = 'OPEN',
         j.salary_min = $salaryMin, j.salary_max = $salaryMax, j.salary_currency = $salaryCurrency
     WITH j
     MATCH (c:Company {company_id: $companyId})
     MERGE (j)-[:BELONGS_TO]->(c)`,
    {
      jobId: String(jobId),
      title,
      companyId: String(companyId),
      salaryMin: salary.min ?? null,
      salaryMax: salary.max ?? null,
      salaryCurrency: salary.currency ?? '',
    }
  );
};

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
    `MERGE (u1:User {user_id: $followerId})
     MERGE (u2:User {user_id: $followeeId})
     MERGE (u1)-[:FOLLOWS]->(u2)`,
    { followerId, followeeId }
  );

// ── Post interactions ────────────────────────────────────────────────

const authored = (userId, postId) =>
  neo4j.Query(
    `MERGE (u:User {user_id: $userId})
     MERGE (p:Post {post_id: $postId})
     ON CREATE SET p.created_at = $now
     ON MATCH SET p.created_at = CASE WHEN p.created_at IS NULL THEN $now ELSE p.created_at END
     MERGE (u)-[:AUTHORED]->(p)`,
    { userId: String(userId), postId: String(postId), now: new Date().toISOString() }
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
     ON CREATE SET p.created_at = $now
     MERGE (u)-[:SHARED]->(p)`,
    { userId: String(userId), postId: String(postId), now: new Date().toISOString() }
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
    `MATCH (me:User {user_id: $userId})
     OPTIONAL MATCH (me)-[:FOLLOWS|CONNECTS]-(friend:User)
     WITH me, collect(DISTINCT friend) + me AS network
     UNWIND network AS member
     MATCH (member)-[r:AUTHORED|SHARED]->(p:Post)
     RETURN DISTINCT p.post_id AS post_id, 
            p.created_at AS created_at,
            CASE 
              WHEN member.user_id = $userId THEN 3
              WHEN type(r) = 'AUTHORED' THEN 2 
              ELSE 1 
            END AS score
     ORDER BY p.created_at DESC, score DESC`,
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

const getSuggestJobsForUser = (userId, limit = 10, exclude = []) =>
  neo4j.Query(
    `
    // skill-based matches
    MATCH (u:User {user_id: $userId})-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(j:Job)
    WHERE j.status = 'OPEN' AND NOT j.job_id IN $exclude
    WITH j, count(s) AS matching_skills
    RETURN j.job_id AS job_id,
           j.title AS title,
           j.company_id AS company_id,
           j.salary_min AS salary_min,
           j.salary_max AS salary_max,
           j.salary_currency AS salary_currency,
           matching_skills
    ORDER BY matching_skills DESC
    LIMIT $limit

    UNION

    // fallback jobs if not enough matches (randomized)
    MATCH (j2:Job)
    WHERE j2.status = 'OPEN' AND NOT j2.job_id IN $exclude
    WITH j2
    ORDER BY rand()
    RETURN j2.job_id AS job_id,
           j2.title AS title,
           j2.company_id AS company_id,
           j2.salary_min AS salary_min,
           j2.salary_max AS salary_max,
           j2.salary_currency AS salary_currency,
           0 AS matching_skills
    LIMIT $limit
    `,
    { userId: String(userId), limit: parseInt(limit), exclude }
  );

const getSuggestUsersForJob = (jobId, limit = 10, exclude = []) =>
  neo4j.Query(
    `
    // skill-based matches
    MATCH (j:Job {job_id: $jobId})-[:REQUIRES_SKILL]->(s:Skill)<-[:HAS_SKILL]-(u:User)
    WHERE NOT u.user_id IN $exclude
    WITH u, count(s) AS matching_skills
    RETURN u.user_id AS user_id,
           u.name AS name,
           u.headline AS headline,
           matching_skills
    ORDER BY matching_skills DESC
    LIMIT $limit

    UNION

    // fallback users if not enough matches (randomized)
    MATCH (u2:User)
    WHERE NOT u2.user_id IN $exclude
    WITH u2
    ORDER BY rand()
    RETURN u2.user_id AS user_id,
           u2.name AS name,
           u2.headline AS headline,
           0 AS matching_skills
    LIMIT $limit
    `,
    { jobId: String(jobId), limit: parseInt(limit), exclude }
  );


const getUserSkills = (userId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:HAS_SKILL]->(s:Skill)
     RETURN s.skill_id AS skill_id, s.name AS name ORDER BY s.name`,
    { userId: String(userId) }
  );

const getAllSkills = () =>
  neo4j.Query(
    `MATCH (s:Skill) RETURN s.skill_id AS skill_id, s.name AS name ORDER BY s.name`
  );

const addStudiedAt = (userId, schoolName) =>
  neo4j.Query(
    `MERGE (s:School {name: $schoolName})
     WITH s
     MATCH (u:User {user_id: $userId})
     MERGE (u)-[:STUDIED_AT]->(s)`,
    { userId: String(userId), schoolName }
  );

const removeStudiedAt = (userId, schoolName) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[r:STUDIED_AT]->(s:School {name: $schoolName})
     DELETE r`,
    { userId: String(userId), schoolName }
  );

const addUserSkill = (userId, skillName) =>
  neo4j.Query(
    `MERGE (s:Skill {name: $name})
     ON CREATE SET s.skill_id = 'skill-' + toLower(replace($name, ' ', '-'))
     WITH s
     MATCH (u:User {user_id: $userId})
     MERGE (u)-[:HAS_SKILL]->(s)`,
    { userId: String(userId), name: skillName }
  );

const removeUserSkill = (userId, skillName) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[r:HAS_SKILL]->(s:Skill {name: $name})
     DELETE r`,
    { userId: String(userId), name: skillName }
  );

const getUserSchools = (userId) =>
  neo4j.Query(
    `MATCH (u:User {user_id: $userId})-[:STUDIED_AT]->(s:School)
     RETURN s.name AS name ORDER BY s.name`,
    { userId: String(userId) }
  );

const getAllSchools = () =>
  neo4j.Query(
    `MATCH (s:School) RETURN s.name AS name ORDER BY s.name`
  );

const getJobSkills = (jobId) =>
  neo4j.Query(
    `MATCH (j:Job {job_id: $jobId})-[:REQUIRES_SKILL]->(s:Skill)
     RETURN s.skill_id AS skill_id, s.name AS name ORDER BY s.name`,
    { jobId: String(jobId) }
  );

const addJobSkill = (jobId, skillName) =>
  neo4j.Query(
    `MERGE (s:Skill {name: $name})
     ON CREATE SET s.skill_id = 'skill-' + toLower(replace($name, ' ', '-'))
     WITH s
     MERGE (j:Job {job_id: $jobId})
     MERGE (j)-[:REQUIRES_SKILL]->(s)`,
    { jobId: String(jobId), name: skillName }
  );

const removeJobSkill = (jobId, skillName) =>
  neo4j.Query(
    `MATCH (j:Job {job_id: $jobId})-[r:REQUIRES_SKILL]->(s:Skill {name: $name})
     DELETE r`,
    { jobId: String(jobId), name: skillName }
  );

const getMultipleJobsSkills = (jobIds) =>
  neo4j.Query(
    `MATCH (j:Job)-[:REQUIRES_SKILL]->(s:Skill)
     WHERE j.job_id IN $jobIds
     RETURN j.job_id AS job_id, collect(s.name) AS skills`,
    { jobIds }
  );

module.exports = {
  getMultipleJobsSkills,
  createUser,
  addStudiedAt,
  removeStudiedAt,
  getSuggestions,
  getSuggestionsAll,
  getHighlyConnectedUsers,
  getMutualConnections,
  getJobRecommendations,
  getBestJobsForUser,
  getBestUsersForJob,
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
  getSuggestJobsForUser,
  getSuggestUsersForJob,
  createJobNode,
  applyJob,
  getUserSkills,
  getAllSkills,
  addUserSkill,
  removeUserSkill,
  getUserSchools,
  getAllSchools,
  getJobSkills,
  addJobSkill,
  removeJobSkill,
  jobNodeExists
};

