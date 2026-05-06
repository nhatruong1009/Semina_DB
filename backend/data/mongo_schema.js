const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  text: String,
  media: [String],
});

const authorSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  headline: String
});

const postSchema = new mongoose.Schema({
  author: { type: authorSchema, required: true },
  content: { type: contentSchema, required: true },
  likes: { type: [String], default: [] }, // SỬA: Lưu mảng ID người dùng đã like
  stats: {
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  },
  created_at: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  post_id: { type: String, required: true },
  user: {
    id: { type: String, required: true },
    name: String
  },
  content: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
const reactionSchema = new mongoose.Schema({
  post_id: { type: String, required: true },
  user_id: { type: String, required: true },
  type: { type: String, enum: ["like", "share"], default: 'like' },
  created_at: { type: Date, default: Date.now }
});

module.exports = { postSchema, commentSchema, reactionSchema };
