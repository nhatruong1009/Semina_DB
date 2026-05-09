const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/auth');

const fs = require('fs')
const upload_dir = path.join(__dirname, '../uploads');
if (!fs.existsSync(upload_dir)) {
  fs.mkdirSync(upload_dir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, upload_dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|webm/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Error: File upload only supports images and videos!"));
  }
});

router.post('/', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const fileUrl = `http://localhost:9000/uploads/${req.file.filename}`;
  const fileType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
  
  res.json({ 
    url: fileUrl,
    type: fileType,
    filename: req.file.filename
  });
});

module.exports = router;
