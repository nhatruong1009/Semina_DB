const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { redisMiddleware } = require('../middleware/user');
const { SaveContent, GetContent, LikePost, UnlikePost, AddComment } = require('../query/example');
const mongosh = require('../init_db').mongosh;


router.post('/create', [verifyToken, redisMiddleware], async (req, res) => {
  try {
    const { content, image } = req.body;
    const postData = {
      author: { id: req.userId, name: "Vinh", headline: "Developer" },
      content: { text: content, media: image ? [image] : [] }
    };
    const savedPost = await SaveContent(postData);
    res.status(201).json({ ...savedPost._doc, id: savedPost._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/feed', [verifyToken], async (req, res) => {
  try {
    const mongosh = require('../init_db').mongosh;

    // Sử dụng Aggregate để JOIN hai bảng Posts và Comments
    const allPosts = await mongosh.Post.aggregate([
      { $sort: { created_at: -1 } }, // Sắp xếp bài mới lên đầu
      {
        $addFields: {
          stringId: { $toString: "$_id" } // Chuyển _id thành string để so khớp
        }
      },
      {
        $lookup: {
          from: "comments", // Join với bảng comments
          localField: "stringId",
          foreignField: "post_id",
          as: "postComments"
        }
      }
    ]);

    const formattedPosts = allPosts.map(p => {
      return {
        id: p._id,
        author: {
          name: p.author?.name || "Người dùng",
          title: p.author?.headline || "Thành viên",
          profileImage: `https://ui-avatars.com/api/?name=${p.author?.name || 'U'}&background=random`
        },
        content: p.content?.text || "",
        image: (p.content?.media && p.content.media.length > 0) ? p.content.media[0] : null,
        likes: p.likes || [],
        // Móc comment đã JOIN được vào đây
        comments: (p.postComments || []).map(c => ({
          id: c._id,
          text: c.content,
          user: c.user
        })),
        shares: p.stats?.shares || 0,
        createdAt: p.created_at || new Date()
      };
    });

    res.json(formattedPosts);
  } catch (error) {
    console.error("Lỗi Feed:", error);
    res.status(500).json({ error: error.message });
  }
});



// --- LIKE POST ---
router.post('/:id/like', [verifyToken], async (req, res) => {
  try {
    const mongosh = require('../init_db').mongosh;
    await mongosh.Post.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.userId } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --- UNLIKE POST ---
router.post('/:id/unlike', [verifyToken, redisMiddleware], async (req, res) => {
  try {
    const mongosh = require('../init_db').mongosh;
    // Dùng $pull để xóa ID người dùng ra khỏi mảng likes
    await mongosh.Post.findByIdAndUpdate(
      req.params.id,
      { $pull: { likes: req.userId } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- COMMENT POST ---
router.post('/:id/comment', [verifyToken], async (req, res) => {
  try {
    const { text } = req.body;
    const { AddComment } = require('../query/example');
    // Luôn gửi kèm thông tin user để lưu vào comment
    const comment = await AddComment(req.params.id, { id: req.userId, name: "Người dùng" }, text);
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --- SHARE POST ---
router.post('/:id/share', [verifyToken], async (req, res) => {
  try {
    const mongosh = require('../init_db').mongosh;
    await mongosh.Post.findByIdAndUpdate(req.params.id, { $inc: { "stats.shares": 1 } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;