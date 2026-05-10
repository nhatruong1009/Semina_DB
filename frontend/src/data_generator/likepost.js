import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { faker } from '@faker-js/faker'; // ✅ faker import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userFile = path.join(__dirname, 'created_user.txt');
const postFile = path.join(__dirname, 'created_posts.txt');
const API = axios.create({ baseURL: 'http://localhost:9000/api' });

// load users
function loadUsers() {
  const lines = fs.readFileSync(userFile, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
}

// load posts
function loadPosts() {
  const lines = fs.readFileSync(postFile, 'utf-8').trim().split('\n');
  return lines.map(line => line.trim()).filter(Boolean);
}

// login helper
async function loginUser(email, password) {
  const res = await API.post('/auth/login', { email, password });
  return { user: res.data.user, token: res.data.token };
}

// like helper
async function likePost(user, postId) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${user.token}` }
  });
  await authedAPI.post(`/posts/${postId}/like`);
  console.log(`❤️ ${user.user.email} liked post ${postId}`);
}

// comment helper
async function commentPost(user, postId, text) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${user.token}` }
  });
  await authedAPI.post(`/posts/${postId}/comment`, { text });
  console.log(`💬 ${user.user.email} commented on post ${postId}: "${text}"`);
}

// run N random like/comment actions
async function run(n = 20) {
  const users = loadUsers();
  const posts = loadPosts();

  for (let i = 0; i < n; i++) {
    const cred = users[Math.floor(Math.random() * users.length)];
    const postId = posts[Math.floor(Math.random() * posts.length)];

    try {
      const user = await loginUser(cred.email, cred.password);

      await likePost(user, postId);
      console.log(`❤️  ${i}: ${user.user.email} like on post ${postId}`);

      // 50% chance to also comment
      if (Math.random() < 0.5) {
        const fakeComment = faker.lorem.sentence(); // realistic comment text
        await commentPost(user, postId, fakeComment);
      }
    } catch (err) {
      console.error(`❌ Failed on iteration ${i + 1}`, err.response?.data || err.message);
    }
  }
}

run(1000); // run 100 random like/comment actions
