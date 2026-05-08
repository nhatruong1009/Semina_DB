const mongoose = require('mongoose');

// --- AUTHOR SCHEMA ---
const authorSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  headline: String
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

module.exports = { postSchema, commentSchema, reactionSchema }