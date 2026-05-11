import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, 'created_user.txt');
const API = axios.create({ baseURL: 'http://localhost:9000/api' });

function loadUsers() {
  const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
}

async function loginUser(email, password) {
  const res = await API.post('/auth/login', { email, password });
  return { user: res.data.user, token: res.data.token };
}

async function connectUsers(user1, userId2) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${user1.token}` }
  });
  await authedAPI.post('/users/connect', { userId1: user1.user.id, userId2 });
}

async function run(n = 100) {
  const users = loadUsers();

  for (let i = 0; i < n; i++) {
    const cred1 = users[Math.floor(Math.random() * users.length)];
    let cred2;
    do {
      cred2 = users[Math.floor(Math.random() * users.length)];
    } while (cred2.email === cred1.email);

    try {
      const user1 = await loginUser(cred1.email, cred1.password);
      const user2 = await loginUser(cred2.email, cred2.password);
      await connectUsers(user1, user2.user.id);
      console.log(`🤝 ${i}: ${user1.user.email} <-> ${user2.user.email}`);
    } catch (err) {
      console.error(`❌ Failed on iteration ${i + 1}`, err.response?.data || err.message);
    }
  }
}

run(100);
