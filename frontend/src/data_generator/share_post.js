import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const userFile = path.join(__dirname, 'created_user.txt');
const postFile = path.join(__dirname, 'created_posts.txt');
const API = axios.create({ baseURL: 'http://localhost:9000/api' });

function loadUsers() {
  const lines = fs.readFileSync(userFile, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
}

function loadPosts() {
  return fs.readFileSync(postFile, 'utf-8').trim().split('\n').map(l => l.trim()).filter(Boolean);
}

async function loginUser(email, password) {
  const res = await API.post('/auth/login', { email, password });
  return { user: res.data.user, token: res.data.token };
}

async function sharePost(user, postId) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${user.token}` }
  });
  await authedAPI.post(`/posts/${postId}/share`);
}

async function run(n = 100) {
  const users = loadUsers();
  const posts = loadPosts();

  for (let i = 0; i < n; i++) {
    const cred = users[Math.floor(Math.random() * users.length)];
    const postId = posts[Math.floor(Math.random() * posts.length)];

    try {
      const user = await loginUser(cred.email, cred.password);
      await sharePost(user, postId);
      console.log(`🔁 ${i}: ${user.user.email} shared post ${postId}`);
    } catch (err) {
      console.error(`❌ Failed on iteration ${i + 1}`, err.response?.data || err.message);
    }
  }
}

run(100);
