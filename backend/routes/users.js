const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

router.get('/profile/:id', (req, res) => {
  // TODO: Fetch user profile from the database by ID.
  // - Return user details without the password.
  res.status(501).json({ message: 'Profile retrieval should be handled by the data layer and return the user profile.' });
});

router.get('/all', (req, res) => {
  // TODO: Fetch all users from the database.
  // - Return user list without passwords.
  res.status(501).json({ message: 'User list retrieval should be handled by the data layer and return all users.' });
});

router.post('/follow/:id', [verifyToken], (req, res) => {
  // TODO: Add target user to current user's following list.
  // - Validate target user exists.
  // - Persist follower/following relationships.
  // - Return confirmation and updated current user.
  res.status(501).json({ message: 'Follow action should be handled by the data layer and return the updated current user.' });
});

router.post('/unfollow/:id', [verifyToken], (req, res) => {
  // TODO: Remove target user from current user's following list.
  // - Validate target user exists.
  // - Persist follower/following relationships.
  // - Return confirmation and updated current user.
  res.status(501).json({ message: 'Unfollow action should be handled by the data layer and return the updated current user.' });
});

module.exports = router;