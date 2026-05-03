const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { users } = require('./data');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const jobsRouter = require('./routes/jobs');
const authRouter = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach route groups
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/jobs', jobsRouter);

app.get('/', (req, res) => {
  res.json({ message: 'LinkedIn Clone API' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
