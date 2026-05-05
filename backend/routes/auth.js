const express = require('express');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { users, nextIds } = require('../data');
const {getUser, GetContent, SaveContent, getUserWorks} = require('../query/example');
const router = express.Router();

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

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const r = await getUser(email);
  console.log(r.rows)
  const p = await GetContent("user124")
  console.log(p)

  const w = await getUserWorks("<UUID_USER_1>")
  w.forEach(record => {
		console.log(record.get('user'), "--->" , record.get('company'));
	});
  
  // const client = postgresQL.getClient();
  // if (!client) {
  //   return res.status(500).json({ error: 'Database connection failed' });
  // }

  // client.query('SELECT * FROM "users" WHERE email = $1', [email], (err, result) => {
  //   if (err) {
  //     console.log(err)
  //   }
  //   const user = result.rows[0];
  //   console.log(` ${user.email}, ${user.password_hash}` )

  //   if (!user || password !== user.password_hash) {
  //     return res.status(401).json({ error: 'Invalid credentials' });
  //   }

  //   const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  //   res.json({ token, user: { ...user, password: undefined } });
  // })
  // const user = users.find(u => u.email === email);
  // if (!user || !bcryptjs.compareSync(password, user.password)) {
  //   return res.status(401).json({ error: 'Invalid credentials' });
  // }

  // const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  // res.json({ token, user: { ...user, password: undefined } });
});

module.exports = router;
