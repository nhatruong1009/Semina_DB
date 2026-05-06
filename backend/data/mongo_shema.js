const mongoose = require('mongoose');

// define mongodb schema here
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

const statsSchema = new mongoose.Schema({
  likes: Number,
  comments: Number,
  shares: Number
});

const authorSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  headline: String
});

const postSchema = new mongoose.Schema({
  author: { type: authorSchema, required: true },
  content: { type: contentSchema, required: true },
  stats: statsSchema,
  visibility: { type: String, enum: ["public", "connections"] },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

postSchema.index({ "author.id": 1 });
postSchema.index({ created_at: -1 });

module.exports = { postSchema }