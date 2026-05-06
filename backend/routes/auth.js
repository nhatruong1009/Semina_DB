const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser } = require('../query/user');
const { publishUserCreated } = require('../datadriven/data_collector');

router.post('/register', async (req, res) => {
  // TODO: Persist a new user record in the database.
  // - Validate email, password, and name.
  // - Hash the password before storing.
  // - Return a JWT token and the created user payload (without password).
  try {
    const { email, password, name } = req.body;
    const records = await createUser(email, bcryptjs.hashSync(password, 10), name, "");
    if (!records || records.length === 0) {
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
      { id: profile.user_id, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.status(201).json({ token, user: { ...profile, password: undefined } });
  } catch (err) {
    if (err.code === '23505' && err.detail && err.detail.includes('(email)')) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});


router.post('/login', (req, res) => {
  // TODO: Authenticate the user using stored credentials.
  // - Lookup user by email.
  // - Compare password hash.
  // - Return a JWT token and authenticated user payload (without password).
  res.status(501).json({ message: 'Login should be handled by the data layer and return token/user.' });
});

module.exports = router;
