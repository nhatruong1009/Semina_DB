const mongosh = require('../init_db').mongosh
const UserQuery = require('./user')
const mongoose = require('mongoose');
const cache = require('./cache')

/**
 * Helper to transform and join MongoDB data
 */

const get_commentsList = async (postId, update = false, commentsLimit = 3, commentsSkip = 0) => {
    // Fetch comments with pagination
    const commentsList = await mongosh.Comment.find({ post_id: postId })
        .sort({ created_at: -1 }) // newest first
        .skip(commentsSkip)
        .limit(commentsLimit);

    const comments_mapped = commentsList.map(c => ({
            id: c._id.toString(),
            userName: c.user?.name || 'User',
            text: c.content,
            createdAt: c.created_at
    }));
    return comments_mapped
}

const transformPostInternal = async (post, { update = false, commentsLimit = 3, commentsSkip = 0, currentUserId = null } = {}) => {
    const p = JSON.parse(JSON.stringify(post));
    const postId = (p._id || p.id).toString();

    let cachedData;
    if (update === false) {
        cachedData = await cache.getCache({
            type:cache.CACHE_TYPE.POST_CONTENT, 
            object_id: postId});
    }

    let basePost;
    if (cachedData) {
        basePost = cachedData;
    } else {
        // Fetch related data from separate collections
        const reactions = await mongosh.Reaction.find({ post_id: postId });
        const likesCount = reactions.filter(r => r.type === 'like').length;
        const commentsList = await get_commentsList(postId, update, commentsLimit, commentsSkip);

        basePost = {
            id: postId,
            author: {
                ...p.author,
                title: p.author.headline || '',
                profileImage: p.author.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.author.name || 'User')}&background=0a66c2&color=fff`
            },
            content: p.content,
            images: Array.isArray(p.content?.media) 
                ? p.content.media.filter(m => m.type === 'image').map(m => m.url) 
                : (p.images || []),
            image: p.content?.media?.[0]?.url || p.image || '',
            likesCount: p.stats?.likes || likesCount,
            commentsCount: p.stats?.comments || 0,
            sharesCount: p.stats?.shares || 0,
            comments: commentsList,
            shares: p.stats?.shares || 0,
            createdAt: p.created_at || p.createdAt
        };
        // Store base post in cache (WITHOUT user-specific state)
        await cache.storeCache(cache.CACHE_TYPE.POST_CONTENT, postId, basePost);
    }

    // Always create a fresh clone for the response to avoid shared state mutations
    const result = { ...basePost };

    // Calculate user-specific state
    if (currentUserId) {
        const uId = currentUserId.toString();
        const reaction = await mongosh.Reaction.findOne({ post_id: postId, user_id: uId, type: 'like' });
        result.didLike = !!reaction;
    } else {
        result.didLike = false;
    }

    return result;
};

/**
 * Save a new post (Integrates Postgres Profile)
 */
const SaveContent = async (userId, text, media) => {
    // 1. Fetch user data from PostgreSQL first
    const userResult = await UserQuery.getUserProfileById(userId);
    if (!userResult || userResult.rowCount === 0) {
        throw new Error("User profile not found in PostgreSQL");
    }
    const profile = userResult.rows[0];

    // Normalize media: if it's a string, convert to [{type: 'image', url: image}]
    let mediaArray = [];
    if (Array.isArray(media)) {
        mediaArray = media;
    } else if (typeof media === 'string' && media.trim()) {
        mediaArray = [{ type: 'image', url: media }];
    }

    const postData = {
        author: {
            id: profile.id.toString(),
            name: profile.full_name,
            headline: profile.headline || 'Member',
            profileImage: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=0a66c2&color=fff`
        },
        content: {
            text: text,
            media: mediaArray,
            link_preview: null
        },
        stats: { likes: 0, comments: 0, shares: 0 },
        visibility: 'public'
    };

    try {
        const newPost = new mongosh.Post(postData);
        const savedPost = await newPost.save();
        return await transformPostInternal(savedPost, {update: true, currentUserId: userId.toString()});
    } catch (err) {
      console.error('CRITICAL ERROR: Failed to save post to MongoDB:', err);
      throw err;
    }
}

/**
 * Get feed posts
 */


const GetFeed = async (userId, limit = 10, skip = 0) => {
    const posts = await mongosh.Post.find({ visibility: 'public' })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
    


    const transformedPosts = [];
    for (const p of posts) {
        try {
            const transformed = await transformPostInternal(p, {currentUserId: userId.toString()});
            transformedPosts.push(transformed);
        } catch (err) {
            console.error(`ERROR: Failed to transform post ${p._id}:`, err);
        }
    }
    return transformedPosts;
}

/**
 * Like a post
 */
const LikePost = async (postId, userId) => {
    const pId = postId.toString();
    const uId = userId.toString();

    // Idempotent like: only increment if not already liked
    const reaction = await mongosh.Reaction.findOneAndUpdate(
        { post_id: pId, user_id: uId, type: 'like' },
        { $setOnInsert: { post_id: pId, user_id: uId, type: 'like', created_at: new Date() } },
        { upsert: true, new: false } // Returns doc BEFORE update
    );

    if (!reaction) {
        await mongosh.Post.findByIdAndUpdate(
            postId,
            { 
                $inc: { "stats.likes": 1 },
                $set: { updated_at: new Date() }
            }
        );
    }
    
    const updatedPost = await mongosh.Post.findById(postId);
    return await transformPostInternal(updatedPost, {update: true, currentUserId: uId});
}

/**
 * Unlike a post
 */
const UnlikePost = async (postId, userId) => {
    const pId = postId.toString();
    const uId = userId.toString();

    // Idempotent unlike: only decrement if reaction existed
    const reaction = await mongosh.Reaction.findOneAndDelete({ post_id: pId, user_id: uId, type: 'like' });
    
    if (reaction) {
        await mongosh.Post.findByIdAndUpdate(
            postId,
            { 
                $inc: { "stats.likes": -1 },
                $set: { updated_at: new Date() }
            }
        );
    }
    
    const updatedPost = await mongosh.Post.findById(postId);
    return await transformPostInternal(updatedPost, {update: true, currentUserId: uId});
}

/**
 * Comment on a post
 */
const CommentPost = async (postId, userId, text) => {
    const pId = postId.toString();
    const uId = userId.toString();

    // Fetch user name from Postgres for the comment record
    const userResult = await UserQuery.getUserProfileById(userId);
    const userName = userResult.rowCount > 0 ? userResult.rows[0].full_name : 'User';

    await mongosh.Post.updateOne(
        { _id: postId, "stats.comments": { $not: { $type: "number" } } },
        { $set: { "stats.comments": 0 } }
    );

    const newComment = new mongosh.Comment({
        post_id: pId,
        user: { id: uId, name: userName },
        content: text,
        created_at: new Date()
    });
    await newComment.save();
    
    const updatedPost = await mongosh.Post.findByIdAndUpdate(
        postId,
        { 
            $inc: { "stats.comments": 1 },
            $set: { updated_at: new Date() }
        },
        { new: true }
    );
    return await transformPostInternal(updatedPost, {update: true, currentUserId: uId});
}

/**
 * Share a post
 */
const SharePost = async (postId, userId) => {
    const pId = postId.toString();
    const uId = userId.toString();

    try {
        await mongosh.Reaction.findOneAndUpdate(
            { post_id: pId, user_id: uId, type: 'share' },
            { post_id: pId, user_id: uId, type: 'share', created_at: new Date() },
            { upsert: true }
        );
    } catch (e) {
        if (e.code !== 11000) throw e;
    }
    
    const updatedPost = await mongosh.Post.findByIdAndUpdate(
        postId,
        { 
            $inc: { "stats.shares": 1 },
            $set: { updated_at: new Date() }
        },
        { new: true }
    );
    return await transformPostInternal(updatedPost, {update: true, currentUserId: uId});
}

const GetByIds = async (postIds, userId, limit, skip) => {
    if (!postIds || postIds.length === 0) return [];
    
    let idsToFetch = postIds;
    if (limit !== undefined && skip !== undefined) {
        idsToFetch = postIds.slice(skip, skip + limit);
    }
    
    if (idsToFetch.length === 0) return [];

    const posts = await mongosh.Post.find({ _id: { $in: idsToFetch } }).sort({ created_at: -1 });
    return await Promise.all(posts.map(p => transformPostInternal(p, {currentUserId: userId.toString()})));
}

module.exports = {
    SaveContent,
    GetFeed,
    GetByIds,
    LikePost,
    UnlikePost,
    CommentPost,
    SharePost,
    get_commentsList
}
