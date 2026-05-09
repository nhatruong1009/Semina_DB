const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../query/user');
const { publishUserCreated } = require('../datadriven/data_collector');

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;

router.post('/register', async (req, res) => {
  // TODO: Persist a new user record in the database.
  // - Validate email, password, and name.
  // - Hash the password before storing.
  // - Return a JWT token and the created user payload (without password).
  try {
    const { email, password, name } = req.body;
    const records = await User.createUser(email, bcryptjs.hashSync(password, 10), name, "");
    if (!records || records.rowCount === 0) {
      return res.status(500).json({ success: false, error: "User creation failed" });
    }

    const profile = records.rows[0];
    console.log(`User created: ${profile.email} successfully`);

    const r = await publishUserCreated({
      user_id: profile.user_id || profile.id,
      email: profile.email,
      full_name: profile.full_name,
      headline: profile.headline || '',
      created_at: new Date().toISOString(),
    });

    const token = jwt.sign(
      { id: profile.user_id, 
        email: email,
        is_superadmin: email === SUPERADMIN_EMAIL
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const userPayload = { 
      ...profile, 
      id: profile.user_id, 
      created_at: undefined, 
      password_hash: undefined, 
      is_superadmin: email === SUPERADMIN_EMAIL
    };
    const refreshToken = uuidv4(); // token to refesh jwt
    await User.storeRefreshToken(profile.user_id, refreshToken);
    return res.status(201).json({ token, refreshToken, user: userPayload });
  } catch (err) {
    if (err.message.includes('unique constraint "users_email_key"')) {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});


router.post('/login', async (req, res) => {
  // TODO: Authenticate the user using stored credentials.
  // - Lookup user by email.
  // - Compare password hash.
  // - Return a JWT token and authenticated user payload (without password).
  try{
    const { email, password } = req.body;
    const records = await User.getUser(email);
    if (!records || records.rowCount === 0) {
      return res.status(401).json({ error: 'User not exists' });
    }
    const user = records.rows[0];

    if ( !bcryptjs.compareSync(password, user.password_hash)){
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const userId = user.id || user.user_id;
    const token = jwt.sign(
      { id: userId, 
        email: user.email,
        is_superadmin: user.email === SUPERADMIN_EMAIL
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    const refreshToken = uuidv4(); // token to refesh jwt
    await User.storeRefreshToken(userId, refreshToken);
    console.log(user.is_staff)
    const userPayload = { 
      ...user, 
      id: userId, 
      created_at: undefined, 
      password_hash: undefined, 
      is_superadmin: user.email === SUPERADMIN_EMAIL,
      is_staff: user.is_staff > 0,
    };
    res.json({ token, refreshToken, user: userPayload });

  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/refresh', async (req, res) => {
  // refesh jwt
  const {user_id, refreshToken } = req.body;
  console.log(`refreshToken ${user_id}`);
  const userId = await User.findByRefreshToken(refreshToken);
  if (!userId || userId !== user_id) return res.status(404).json({ error: 'Refresh token not found' });

  // delete the refesh token
  await User.deleteRefreshToken(refreshToken);

  const newAccessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Issue new refresh token
  const newRefreshToken = uuidv4();
  await User.storeRefreshToken(userId, newRefreshToken);
  res.json({ token: newAccessToken, refreshToken: newRefreshToken });
});

router.post('/logout', async (req, res) => {
  try {
    const { user_id, refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'No refresh token provided' });
    }

    // Verify the refresh token belongs to the user
    const storedUserId = await User.findByRefreshToken(refreshToken);
    if (!storedUserId || storedUserId !== user_id) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Delete the refresh token from Redis (invalidate session)
    await User.deleteRefreshToken(refreshToken);
    // Optionally: if you track multiple tokens per user, clear them all
    // await User.deleteTokensByUser(user_id);

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error during logout' });
  }
});

module.exports = router;
