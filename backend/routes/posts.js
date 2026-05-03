const express = require('express');
const router = express.Router();
const { users, posts, nextIds } = require('../data');
const { verifyToken } = require('../middleware/auth');

router.post('/create', verifyToken, (req, res) => {
  const { content, image } = req.body;

  const newPost = {
    id: nextIds.posts++,
    userId: req.userId,
    content,
    image,
    likes: [],
    comments: [],
    shares: 0,
    createdAt: new Date()
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

router.get('/feed', verifyToken, (req, res) => {
  const currentUser = users.find(u => u.id === req.userId);
  const feedPosts = posts
    .filter(p => currentUser.following.includes(p.userId) || p.userId === req.userId)
    .map(p => ({
      ...p,
      author: users.find(u => u.id === p.userId)
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(feedPosts);
});

router.post('/:id/like', verifyToken, (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (!post.likes.includes(req.userId)) {
    post.likes.push(req.userId);
  }

  res.json(post);
});

router.post('/:id/unlike', verifyToken, (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });

  post.likes = post.likes.filter(id => id !== req.userId);
  res.json(post);
});

router.post('/:id/comment', verifyToken, (req, res) => {
  const { text } = req.body;
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const comment = {
    id: nextIds.comments++,
    userId: req.userId,
    text,
    createdAt: new Date()
  };

  post.comments.push(comment);
  res.status(201).json(comment);
});

router.post('/:id/share', verifyToken, (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });

  post.shares++;
  res.json(post);
});

module.exports = router;