const express = require('express');
const router = express.Router();

router.post('/register', (req, res) => {
  // TODO: Persist a new user record in the database.
  // - Validate email, password, and name.
  // - Hash the password before storing.
  // - Return a JWT token and the created user payload (without password).
  res.status(501).json({ message: 'Register should be handled by the data layer and return token/user.' });
});

router.post('/login', (req, res) => {
  // TODO: Authenticate the user using stored credentials.
  // - Lookup user by email.
  // - Compare password hash.
  // - Return a JWT token and authenticated user payload (without password).
  res.status(501).json({ message: 'Login should be handled by the data layer and return token/user.' });
});

module.exports = router;
