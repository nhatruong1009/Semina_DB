const express = require('express');
const router = express.Router();
const { users } = require('../data');
const { verifyToken } = require('../middleware/auth');

router.get('/profile/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, password: undefined });
});

router.get('/all', (req, res) => {
  res.json(users.map(u => ({ ...u, password: undefined })));
});

router.post('/follow/:id', verifyToken, (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const currentUser = users.find(u => u.id === req.userId);
  const targetUser = users.find(u => u.id === targetUserId);

  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  if (!currentUser.following.includes(targetUserId)) {
    currentUser.following.push(targetUserId);
  }
  if (!targetUser.followers.includes(req.userId)) {
    targetUser.followers.push(req.userId);
  }

  res.json({ message: 'Following user', currentUser: { ...currentUser, password: undefined } });
});

router.post('/unfollow/:id', verifyToken, (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const currentUser = users.find(u => u.id === req.userId);
  const targetUser = users.find(u => u.id === targetUserId);

  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  currentUser.following = currentUser.following.filter(id => id !== targetUserId);
  targetUser.followers = targetUser.followers.filter(id => id !== req.userId);

  res.json({ message: 'Unfollowed user', currentUser: { ...currentUser, password: undefined } });
});

module.exports = router;