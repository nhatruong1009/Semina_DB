const mongosh = require('../init_db').mongosh
const UserQuery = require('./user')
const mongoose = require('mongoose');

/**
 * Helper to transform and join MongoDB data
 */
const transformPostInternal = async (post) => {
    const p = JSON.parse(JSON.stringify(post));
    const postId = p._id || p.id;

    // Fetch related data from separate collections
    const reactions = await mongosh.Reaction.find({ post_id: postId });
    const commentsList = await mongosh.Comment.find({ post_id: postId }).sort({ created_at: 1 });

    return {
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
        likes: reactions.filter(r => r.type === 'like').map(r => r.user_id),
        likesCount: p.stats?.likes || 0,
        commentsCount: p.stats?.comments || 0,
        sharesCount: p.stats?.shares || 0,
        comments: commentsList.map(c => ({
            id: c._id.toString(),
            userName: c.user?.name || 'User',
            text: c.content,
            createdAt: c.created_at
        })),
        shares: p.stats?.shares || 0,
        createdAt: p.created_at || p.createdAt
    };
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
        console.log('DEBUG: Attempting to save post with data:', JSON.stringify(postData, null, 2));
        const newPost = new mongosh.Post(postData);
        const savedPost = await newPost.save();
        console.log('DEBUG: Post saved successfully with ID:', savedPost._id);
        return await transformPostInternal(savedPost);
    } catch (err) {
      console.error('CRITICAL ERROR: Failed to save post to MongoDB:', err);
      throw err;
    }
}

/**
 * Get feed posts
 */
const GetFeed = async () => {
    const posts = await mongosh.Post.find({ visibility: 'public' }).sort({ created_at: -1 }).limit(50);

    const transformedPosts = [];
    for (const p of posts) {
        try {
            const transformed = await transformPostInternal(p);
            transformedPosts.push(transformed);
        } catch (err) {
            console.error(`ERROR: Failed to transform post ${p._id}:`, err);
            // Skip broken posts instead of failing the whole feed
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

    await mongosh.Post.updateOne(
        { _id: postId, "stats.likes": { $not: { $type: "number" } } },
        { $set: { "stats.likes": 0 } }
    );

    try {
        await mongosh.Reaction.findOneAndUpdate(
            { post_id: pId, user_id: uId, type: 'like' },
            { post_id: pId, user_id: uId, type: 'like', created_at: new Date() },
            { upsert: true }
        );
    } catch (e) {
        if (e.code !== 11000) throw e;
    }
    
    const updatedPost = await mongosh.Post.findByIdAndUpdate(
        postId,
        { 
            $inc: { "stats.likes": 1 },
            $set: { updated_at: new Date() }
        },
        { new: true }
    );
    return await transformPostInternal(updatedPost);
}

/**
 * Unlike a post
 */
const UnlikePost = async (postId, userId) => {
    const pId = postId.toString();
    const uId = userId.toString();

    await mongosh.Post.updateOne(
        { _id: postId, "stats.likes": { $not: { $type: "number" } } },
        { $set: { "stats.likes": 0 } }
    );

    await mongosh.Reaction.deleteOne({ post_id: pId, user_id: uId, type: 'like' });
    
    const updatedPost = await mongosh.Post.findByIdAndUpdate(
        postId,
        { 
            $inc: { "stats.likes": -1 },
            $set: { updated_at: new Date() }
        },
        { new: true }
    );
    return await transformPostInternal(updatedPost);
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
    return await transformPostInternal(updatedPost);
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
    return await transformPostInternal(updatedPost);
}

const GetByIds = async (postIds) => {
    if (!postIds.length) return [];
    const posts = await mongosh.Post.find({ _id: { $in: postIds } });
    return await Promise.all(posts.map(p => transformPostInternal(p)));
}

module.exports = {
    SaveContent,
    GetFeed,
    GetByIds,
    LikePost,
    UnlikePost,
    CommentPost,
    SharePost
}
