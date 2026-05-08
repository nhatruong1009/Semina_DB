const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { redisMiddleware } = require('../middleware/user');
const PostQuery = require('../query/post');

/**
 * Create a new post
 */
router.post('/create', [verifyToken, redisMiddleware], async (req, res) => {
    try {
        const { content, image } = req.body;
        const result = await PostQuery.SaveContent(req.userId, content, image);
        res.status(201).json(result);
    } catch (err) {
        console.error('DEBUG: Error in /posts/create:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get feed posts
 */
router.get('/feed', [verifyToken], async (req, res) => {
    try {
        const transformedFeed = await PostQuery.GetFeed();
        res.json(transformedFeed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Like a post
 */
router.post('/:id/like', [verifyToken, redisMiddleware], async (req, res) => {
    try {
        const result = await PostQuery.LikePost(req.params.id, req.userId);
        res.json(result);
    } catch (err) {
        console.error('DEBUG: Error in /posts/like:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Unlike a post
 */
router.post('/:id/unlike', [verifyToken, redisMiddleware], async (req, res) => {
    try {
        const result = await PostQuery.UnlikePost(req.params.id, req.userId);
        res.json(result);
    } catch (err) {
        console.error('DEBUG: Error in /posts/unlike:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Comment on a post
 */
router.post('/:id/comment', [verifyToken], async (req, res) => {
    try {
        const { text } = req.body;
        const result = await PostQuery.CommentPost(req.params.id, req.userId, text);
        res.status(201).json(result);
    } catch (err) {
        console.error('DEBUG: Error in /posts/comment:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Share a post
 */
router.post('/:id/share', [verifyToken], async (req, res) => {
    try {
        const result = await PostQuery.SharePost(req.params.id, req.userId);
        res.json(result);
    } catch (err) {
        console.error('DEBUG: Error in /posts/share:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;