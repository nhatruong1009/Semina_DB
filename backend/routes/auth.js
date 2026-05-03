const express = require('express');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { users, nextIds } = require('../data');
const router = express.Router();
const MongoDB = require('../data/mongo')
const postgresQL = require('../data/postgresql')
const neo4j = require('../data/neo4j')
const redis = require('../data/redis')

router.post('/register', (req, res) => {
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

router.post('/login', (req, res) => {
  console.log(MongoDB.isReady())
  MongoDB.sayHi()
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !bcryptjs.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { ...user, password: undefined } });
});

module.exports = router;
