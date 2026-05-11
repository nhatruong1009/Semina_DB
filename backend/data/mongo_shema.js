const mongoose = require('mongoose');

// --- AUTHOR SCHEMA ---
const authorSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  headline: String,
  profileImage: String
});

// --- CONTENT SCHEMA ---
const mediaSchema = new mongoose.Schema({
  type: { type: String, enum: ["image", "video"] },
  url: String
});

const linkPreviewSchema = new mongoose.Schema({
  title: String,
  url: String
});

const contentSchema = new mongoose.Schema({
  text: String,
  media: [mediaSchema],
  link_preview: linkPreviewSchema
});

// --- STATS SCHEMA ---
const statsSchema = new mongoose.Schema({
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 }
});

// --- POST SCHEMA ---
const postSchema = new mongoose.Schema({
  author: { type: authorSchema, required: true },
  content: { type: contentSchema, required: true },
  stats: { type: statsSchema, default: () => ({}) },
  visibility: { type: String, enum: ["public", "connections"], default: "public" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// --- COMMENT SCHEMA ---
const commentSchema = new mongoose.Schema({
  post_id: { type: String, required: true },
  user: {
    id: { type: String, required: true },
    name: String
  },
  content: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

// --- REACTION SCHEMA ---
const reactionSchema = new mongoose.Schema({
  post_id: { type: String, required: true },
  user_id: { type: String, required: true },
  type: { type: String, enum: ["like", "share"], required: true },
  created_at: { type: Date, default: Date.now }
});

// Indexes
postSchema.index({ "author.id": 1 });
postSchema.index({ created_at: -1 });
commentSchema.index({ post_id: 1 });
reactionSchema.index({ post_id: 1 });
reactionSchema.index({ post_id: 1, user_id: 1 }, { unique: true });

// --- NOTIFICATION SCHEMA ---
const notificationActorSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String }
});

const notificationEntitySchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ["POST", "COMMENT", "USER", "JOB", "COMPANY", "MESSAGE"], required: true },
  preview: { type: String }
});

const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  
  // List of actors (e.g., people who liked the post)
  actors: [notificationActorSchema],
  
  // Total count of actions (e.g., total likes)
  count: { type: Number, default: 1 },

  type: { 
    type: String, 
    enum: [
      "POST_LIKE", "POST_COMMENT", "POST_SHARE", 
      "USER_FOLLOW", "CONNECTION_REQUEST", "CONNECTION_ACCEPT",
      "MESSAGE_RECEIVE", "JOB_RECOMMENDATION", "COMPANY_HIRING"
    ],
    required: true 
  },

  // The thing being acted upon (Post, Job, etc.)
  entity: { type: notificationEntitySchema },

  is_read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Compound index for aggregation: group by user, type, and entity
// We only aggregate UNREAD notifications to ensure new activity pops up.
notificationSchema.index({ user_id: 1, type: 1, "entity.id": 1, is_read: 1 });
notificationSchema.index({ updated_at: -1 });
notificationSchema.index({ created_at: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

module.exports = { postSchema, commentSchema, reactionSchema, notificationSchema }