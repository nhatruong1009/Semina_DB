const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { redisMiddleware } = require('../middleware/user');
const PostQuery = require('../query/post');
const { publishPostEvent, POSTS_EVENT_TYPE } = require('../datadriven/data_collector');
const graphQuery = require('../query/neo4j');
const cache = require('../query/cache')
/**
 * Create a new post
 */
router.post('/create', [verifyToken, redisMiddleware], async (req, res) => {
    try {
        const { content, image, media } = req.body;
        const result = await PostQuery.SaveContent(req.userId, content, media || image);
        publishPostEvent(POSTS_EVENT_TYPE.CREATE, { author_id: req.userId, post_id: result.id }).catch(console.error);
        // New post invalidates author's feed caches so they see it immediately
        cache.invalidateCache(cache.CACHE_TYPE.FEED_PUBLIC,  req.userId);
        cache.invalidateCache(cache.CACHE_TYPE.FEED_NETWORK, req.userId);
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
    const start = Date.now(); // capture start time
    is_cache = false;
    try {
        const ids = await cache.getCache(cache.CACHE_TYPE.FEED_PUBLIC, req.userId);
        if (ids !== null) {
            is_cache = true;
            const records = await PostQuery.GetByIds(ids, req.userId);
            res.json(records);
        } else {
            const transformedFeed = await PostQuery.GetFeed(req.userId);
            const Post_ids = transformedFeed.map(p=>p.id);
            cache.storeCache(cache.CACHE_TYPE.FEED_PUBLIC, req.userId, Post_ids)
            res.json(transformedFeed);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        const end = Date.now();
        console.log(`get feed${is_cache ? "" :" no"} cache: ${end - start} ms`);
    }
});

/**
 * Get network feed (posts from people user follows/connects)
 */
router.get('/feed/network', [verifyToken], async (req, res) => {
    const start = Date.now(); // capture start time
    is_cache = false;
    try {
        const ids = await cache.getCache(cache.CACHE_TYPE.FEED_NETWORK, req.userId);
        if (ids !== null) {
            is_cache = true;
            const records = await PostQuery.GetByIds(ids, req.userId);
            res.json(records);
        } else {
            const records = await graphQuery.getFeedByNetwork(String(req.userId));
            const postIds = records.map(r => r.toObject().post_id);
            const posts = await PostQuery.GetByIds(postIds, req.userId);
            cache.storeCache(cache.CACHE_TYPE.FEED_NETWORK, req.userId, postIds)
            res.json(posts);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        const end = Date.now();
        console.log(`get feed${is_cache ? "" :" no"} cache: ${end - start} ms`);
    }
});

/**
 * Get post interactions (who liked/commented/shared)
 */
router.get('/:id/interactions', [verifyToken], async (req, res) => {
    try {
        const records = await graphQuery.getPostInteractions(req.params.id);
        res.json(records.map(r => r.toObject()));
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
        publishPostEvent(POSTS_EVENT_TYPE.LIKE, { user_id: req.userId, post_id: req.params.id }).catch(console.error);
        // Like count changed — invalidate cached post content
        cache.invalidateCache(cache.CACHE_TYPE.POST_CONTENT, req.params.id);
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
        publishPostEvent(POSTS_EVENT_TYPE.UNLIKE, { user_id: req.userId, post_id: req.params.id }).catch(console.error);
        // Like count changed — invalidate cached post content
        cache.invalidateCache(cache.CACHE_TYPE.POST_CONTENT, req.params.id);
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
        const lastComment = result.comments[result.comments.length - 1];
        publishPostEvent(POSTS_EVENT_TYPE.COMMENT_ADD, {
            user_id: req.userId,
            post_id: req.params.id,
            comment_id: lastComment.id,
        }).catch(console.error);
        // Comment count changed — invalidate cached post content
        cache.invalidateCache(cache.CACHE_TYPE.POST_CONTENT, req.params.id);
        res.status(201).json(result);
    } catch (err) {
        console.error('DEBUG: Error in /posts/comment:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { limit = 10, skip = 0 } = req.query;
  try {
    const comments = await PostQuery.get_commentsList(id, false, parseInt(limit), parseInt(skip));
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * Share a post
 */
router.post('/:id/share', [verifyToken], async (req, res) => {
    try {
        const result = await PostQuery.SharePost(req.params.id, req.userId);
        publishPostEvent(POSTS_EVENT_TYPE.SHARE, { user_id: req.userId, post_id: req.params.id }).catch(console.error);
        // Share count changed + sharer's feed now includes this post
        cache.invalidateCache(cache.CACHE_TYPE.POST_CONTENT,  req.params.id);
        cache.invalidateCache(cache.CACHE_TYPE.FEED_PUBLIC,   req.userId);
        cache.invalidateCache(cache.CACHE_TYPE.FEED_NETWORK,  req.userId);
        res.json(result);
    } catch (err) {
        console.error('DEBUG: Error in /posts/share:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
