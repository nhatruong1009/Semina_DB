const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { redisMiddleware } = require('../middleware/user');

router.post('/create', [verifyToken, redisMiddleware], (req, res) => {
  // TODO: Persist a new post in the database.
  // - Use req.userId as the author.
  // - Store content, image, likes, comments, shares, createdAt.
  // - Return the created post record.
  res.status(501).json({ message: 'Post creation should be handled by the data layer and return the new post.' });
});

router.get('/feed', [verifyToken], (req, res) => {
  // TODO: Retrieve feed posts for the authenticated user.
  // - Include posts by followed users and the current user.
  // - Return each post with author metadata.
  res.status(501).json({ message: 'Feed retrieval should be handled by the data layer and return feed posts with author metadata.' });
});

router.post('/:id/like', [verifyToken, redisMiddleware], (req, res) => {
  // TODO: Add a like for the current user on the specified post.
  // - Validate the post exists.
  // - Persist like state in the database.
  // - Return the updated post.
  res.status(501).json({ message: 'Post like should be handled by the data layer and return the updated post.' });
});

router.post('/:id/unlike', [verifyToken, redisMiddleware], (req, res) => {
  // TODO: Remove the current user like from the specified post.
  // - Validate the post exists.
  // - Persist unlike state in the database.
  // - Return the updated post.
  res.status(501).json({ message: 'Post unlike should be handled by the data layer and return the updated post.' });
});

router.post('/:id/comment', [verifyToken], (req, res) => {
  // TODO: Add a comment to the specified post.
  // - Validate the post exists.
  // - Persist the comment with userId and createdAt.
  // - Return the created comment.
  res.status(501).json({ message: 'Post comment should be handled by the data layer and return the new comment.' });
});

router.post('/:id/share', [verifyToken], (req, res) => {
  // TODO: Increment share count for the specified post.
  // - Validate the post exists.
  // - Persist the updated share count.
  // - Return the updated post.
  res.status(501).json({ message: 'Post share should be handled by the data layer and return the updated post.' });
});

module.exports = router;