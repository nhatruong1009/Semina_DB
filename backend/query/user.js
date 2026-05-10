const psql = require('../init_db').psql
const redis = require('../init_db').redis;

const createUser = (email, password_hash, full_name, headline) => {
  return psql.Query(`
    WITH new_user AS (
      INSERT INTO "users" (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email
    ),
    new_profile AS (
      INSERT INTO profiles (user_id, full_name, headline)
      SELECT id, $3, $4 FROM new_user
      RETURNING user_id, full_name, headline
    )
    SELECT 
      new_user.id AS user_id,
      new_user.email,
      new_profile.full_name,
      new_profile.headline
    FROM new_user
    JOIN new_profile ON new_profile.user_id = new_user.id;
  `, [email, password_hash, full_name, headline]);
};

const getUser = (email) => {
  return psql.Query(`
    SELECT u.*, p.full_name, p.headline, p.avatar_url, p.cover_url, p.location, p.bio,
           COALESCE(
             (SELECT COUNT(*) 
              FROM company_users cu 
              WHERE cu.user_id = u.id 
                AND cu.active = true), 0
           ) AS is_staff
    FROM "users" u
    LEFT JOIN "profiles" p ON u.id = p.user_id
    WHERE u.email = $1 
    LIMIT 1;
  `, [email]);
};


const getUserProfileById = (userId) => {
  return psql.Query(`
    SELECT u.id, u.email, p.full_name, p.headline, p.avatar_url, p.cover_url, p.location, p.bio
    FROM "users" u
    LEFT JOIN "profiles" p ON u.id = p.user_id
    WHERE u.id = $1
    LIMIT 1;
  `, [userId]);
}

const getUserById = (userId) => {
  return psql.Query(`
    SELECT id, email FROM "users" WHERE id = $1 LIMIT 1;
  `, [userId]);
}


// for jwt token
async function storeRefreshToken(userId, token) {
  const client = redis.getClient();
  if (!client) throw new Error('Redis not connected');

  const ttlSeconds = 7 * 24 * 60 * 60; // 7 days
  await client.set(`session:refresh:${token}`, userId, 'EX', ttlSeconds);
  await client.sadd(`session:user:${userId}`, token); // track all tokens for this user
}

async function findByRefreshToken(token) {
  const client = redis.getClient();
  if (!client) throw new Error('Redis not connected');

  const userId = await client.get(`session:refresh:${token}`);
  return userId; // null if not found/expired
}

async function deleteRefreshToken(token) {
  const client = redis.getClient();
  if (!client) throw new Error('Redis not connected');

  await client.del(`session:refresh:${token}`);
}

module.exports = {
    createUser,
    getUser,
    getUserProfileById,
    getUserById,
    storeRefreshToken,

    findByRefreshToken,
    deleteRefreshToken,
}