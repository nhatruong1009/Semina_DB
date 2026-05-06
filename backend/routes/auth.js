const express = require('express');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { users, nextIds } = require('../data');
const { getUser, GetContent, SaveContent, getUserWorks } = require('../query/example');
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

// --- LOGIN ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Đang đăng nhập với email:", email);

    // 1. Lấy thông tin user từ PostgreSQL
    const result = await getUser(email);
    const user = result.rows[0];

    if (!user) {
      console.log("Lỗi: Không tìm thấy email này trong Postgres");
      return res.status(401).json({ error: 'Email không tồn tại' });
    }

    // 2. Kiểm tra mật khẩu (So sánh trực tiếp chuỗi 'hashed_pass')
    const isMatched = (password === user.password_hash) ||
      (user.password_hash.startsWith('$2') && bcryptjs.compareSync(password, user.password_hash));

    if (!isMatched) {
      console.log("Lỗi: Sai mật khẩu. Bạn nhập:", password, "Trong DB là:", user.password_hash);
      return res.status(401).json({ error: 'Mật khẩu không chính xác' });
    }

    // 3. Lấy thông tin từ Neo4j (Bọc trong try-catch để lỗi Neo4j không làm sập login)
    let userWorks = [];
    try {
      if (user.id) {
        const works = await getUserWorks(user.id);
        userWorks = works.map(record => record.get('company'));
      }
    } catch (e) {
      console.log("Lỗi Neo4j (bỏ qua):", e.message);
    }

    // 4. Tạo JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // 5. Trả về cho FE
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "Người dùng",
        works: userWorks
      }
    });

  } catch (error) {
    console.error("Lỗi server tại Login:", error);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
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


module.exports = router;
