const psql = require('../init_db').psql;

const getProfileByUserId = (userId) => {
  return psql.Query(`
    SELECT p.*, u.email
    FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id = $1
    LIMIT 1
  `, [userId]);
};


const updateProfile = (userId, fullName, headline, bio, location, avatarUrl, coverUrl) => {
  return psql.Query(`
    INSERT INTO profiles (user_id, full_name, headline, bio, location, avatar_url, cover_url, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        headline = EXCLUDED.headline,
        bio = EXCLUDED.bio,
        location = EXCLUDED.location,
        avatar_url = EXCLUDED.avatar_url,
        cover_url = EXCLUDED.cover_url,
        updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [userId, fullName, headline, bio, location, avatarUrl, coverUrl]);
};


module.exports = {
  getProfileByUserId,
  updateProfile,
};
