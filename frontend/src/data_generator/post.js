import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { faker } from '@faker-js/faker'; // ✅ faker import

// emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userFile = path.join(__dirname, 'created_user.txt');
const postFile = path.join(__dirname, 'created_posts.txt');
const API = axios.create({ baseURL: 'http://localhost:9000/api' });

// load users from file
function loadUsers() {
  const lines = fs.readFileSync(userFile, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
}

// login helper
async function loginUser(email, password) {
  const res = await API.post('/auth/login', { email, password });
  return { user: res.data.user, token: res.data.token };
}

// create post helper
async function createPost(user, content, media = null) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${user.token}` }
  });

  const res = await authedAPI.post('/posts/create', { content, media });
  const postId = res.data.id;

  // append postId to file
  fs.appendFileSync(postFile, `${postId}\n`);
  return postId;
}

// run N times with random users
async function run(n = 10) {
  const users = loadUsers();

  for (let i = 0; i < n; i++) {
    const cred = users[Math.floor(Math.random() * users.length)];
    try {
      const user = await loginUser(cred.email, cred.password);

      // pick a random number between 1 and 5
      const numPosts = Math.floor(Math.random() * 5) + 1;

      for (let j = 0; j < numPosts; j++) {
        // ✅ use faker for realistic post content
        const fakeContent = faker.lorem.sentence(); // or faker.lorem.paragraph()
        // optionally simulate media with a fake image URL
        const fakeMedia = faker.image.urlPicsumPhotos();

        const postId = await createPost(user, fakeContent, fakeMedia);
        console.log(`📝 ${user.user.email} created post ${postId}: "${fakeContent}"`);
      }
    } catch (err) {
      console.error(`❌ Failed on iteration ${i + 1}`, err.response?.data || err.message);
    }
  }
}

run(20); // create random users posts
