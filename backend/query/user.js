const psql = require('../init_db').psql

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
    SELECT * FROM "users" WHERE email = $1 LIMIT 1;
  `, [email]);
}

const getUserProfileById = (userId) => {
  return psql.Query(`
    SELECT u.id, u.email, p.full_name, p.headline
    FROM "users" u
    JOIN "profiles" p ON u.id = p.user_id
    WHERE u.id = $1
    LIMIT 1;
  `, [userId]);
}

module.exports = {
    createUser,
    getUser,
    getUserProfileById
}