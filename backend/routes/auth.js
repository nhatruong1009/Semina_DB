const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../query/user');
const Neo4j = require('../query/neo4j');
const { publishUserCreated } = require('../datadriven/data_collector');

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

    // sync to neo4j only after postgres insert succeeds
    await Neo4j.createUser(profile.user_id, profile.full_name, profile.headline || '');

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
    const userPayload = { ...profile, id: profile.user_id, password: undefined };
    return res.status(201).json({ token, user: userPayload });
  } catch (err) {
    if (err.code === '23505' && err.detail && err.detail.includes('(email)')) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
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
      { id: userId, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    const userPayload = { ...user, id: userId, password: undefined };
    res.json({ token, user: userPayload });

  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
