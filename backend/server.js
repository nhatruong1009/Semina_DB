const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Temporary in-memory data storage
let users = [
  {
    id: 1,
    email: 'john@example.com',
    password: bcryptjs.hashSync('password123', 10),
    name: 'John Doe',
    title: 'Software Engineer',
    bio: 'Passionate about coding',
    followers: [2],
    following: [2],
    profileImage: 'https://via.placeholder.com/150?text=John'
  },
  {
    id: 2,
    email: 'jane@example.com',
    password: bcryptjs.hashSync('password123', 10),
    name: 'Jane Smith',
    title: 'Product Manager',
    bio: 'Building great products',
    followers: [1],
    following: [1],
    profileImage: 'https://via.placeholder.com/150?text=Jane'
  }
];

let posts = [
  {
    id: 1,
    userId: 1,
    content: 'Just launched my new project!',
    image: null,
    likes: [2],
    comments: [
      { userId: 2, text: 'Awesome work!', id: 1 }
    ],
    shares: 0,
    createdAt: new Date()
  }
];

let jobs = [
  {
    id: 1,
    postedBy: 2,
    title: 'React Developer',
    company: 'Tech Corp',
    location: 'San Francisco',
    description: 'We are looking for an experienced React developer',
    salary: '$120k-150k',
    applications: [],
    createdAt: new Date()
  }
];

let nextIds = {
  users: 3,
  posts: 2,
  jobs: 2,
  comments: 2
};

// AUTH Routes
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const newUser = {
    id: nextIds.users++,
    email,
    password: bcryptjs.hashSync(password, 10),
    name,
    title: 'Job Title',
    bio: '',
    followers: [],
    following: [],
    profileImage: 'https://via.placeholder.com/150?text=' + name.replace(' ', '+')
  };

  users.push(newUser);

  const token = jwt.sign({ id: newUser.id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { ...newUser, password: undefined } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email);
  if (!user || !bcryptjs.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { ...user, password: undefined } });
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// USER Routes
app.get('/api/users/profile/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, password: undefined });
});

app.get('/api/users/all', (req, res) => {
  res.json(users.map(u => ({ ...u, password: undefined })));
});

app.post('/api/users/follow/:id', verifyToken, (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const currentUser = users.find(u => u.id === req.userId);
  const targetUser = users.find(u => u.id === targetUserId);

  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  if (!currentUser.following.includes(targetUserId)) {
    currentUser.following.push(targetUserId);
  }
  if (!targetUser.followers.includes(req.userId)) {
    targetUser.followers.push(req.userId);
  }

  res.json({ message: 'Following user', currentUser: { ...currentUser, password: undefined } });
});

app.post('/api/users/unfollow/:id', verifyToken, (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const currentUser = users.find(u => u.id === req.userId);
  const targetUser = users.find(u => u.id === targetUserId);

  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  
  currentUser.following = currentUser.following.filter(id => id !== targetUserId);
  targetUser.followers = targetUser.followers.filter(id => id !== req.userId);

  res.json({ message: 'Unfollowed user', currentUser: { ...currentUser, password: undefined } });
});

// POST Routes
app.post('/api/posts/create', verifyToken, (req, res) => {
  const { content, image } = req.body;
  
  const newPost = {
    id: nextIds.posts++,
    userId: req.userId,
    content,
    image,
    likes: [],
    comments: [],
    shares: 0,
    createdAt: new Date()
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

app.get('/api/posts/feed', verifyToken, (req, res) => {
  const currentUser = users.find(u => u.id === req.userId);
  const feedPosts = posts
    .filter(p => currentUser.following.includes(p.userId) || p.userId === req.userId)
    .map(p => ({
      ...p,
      author: users.find(u => u.id === p.userId)
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json(feedPosts);
});

app.post('/api/posts/:id/like', verifyToken, (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (!post.likes.includes(req.userId)) {
    post.likes.push(req.userId);
  }

  res.json(post);
});

app.post('/api/posts/:id/unlike', verifyToken, (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });

  post.likes = post.likes.filter(id => id !== req.userId);
  res.json(post);
});

app.post('/api/posts/:id/comment', verifyToken, (req, res) => {
  const { text } = req.body;
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const comment = {
    id: nextIds.comments++,
    userId: req.userId,
    text,
    createdAt: new Date()
  };

  post.comments.push(comment);
  res.status(201).json(comment);
});

app.post('/api/posts/:id/share', verifyToken, (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });

  post.shares++;
  res.json(post);
});

// JOB Routes
app.post('/api/jobs/create', verifyToken, (req, res) => {
  const { title, company, location, description, salary } = req.body;
  
  const newJob = {
    id: nextIds.jobs++,
    postedBy: req.userId,
    title,
    company,
    location,
    description,
    salary,
    applications: [],
    createdAt: new Date()
  };

  jobs.push(newJob);
  res.status(201).json(newJob);
});

app.get('/api/jobs', (req, res) => {
  const jobsWithAuthor = jobs.map(j => ({
    ...j,
    author: users.find(u => u.id === j.postedBy)
  }));
  res.json(jobsWithAuthor);
});

app.post('/api/jobs/:id/apply', verifyToken, (req, res) => {
  const job = jobs.find(j => j.id === parseInt(req.params.id));
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (!job.applications.includes(req.userId)) {
    job.applications.push(req.userId);
  }

  res.json({ message: 'Applied to job', job });
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
