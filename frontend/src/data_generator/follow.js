import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, 'created_user.txt');
const API = axios.create({ baseURL: 'http://localhost:9000/api' });

// login helper
async function loginUser(email, password) {
  const res = await API.post('/auth/login', { email, password });
  return {
    user: res.data.user,
    token: res.data.token,
    refreshToken: res.data.refreshToken
  };
}

// follow helper
async function followUser(follower, followee) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${follower.token}` }
  });

  await authedAPI.post('/users/follow', {
    followerId: follower.user.id,
    followeeId: followee.user.id
  });
}

// load users from file
function loadUsers() {
  const filePath = path.join(__dirname, 'created_user.txt'); // same folder
  const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
}

// run N times with random users
async function run(n = 10) {
  const users = loadUsers();

  for (let i = 0; i < n; i++) {
    // pick two random distinct users
    const followerCred = users[Math.floor(Math.random() * users.length)];
    let followeeCred;
    do {
      followeeCred = users[Math.floor(Math.random() * users.length)];
    } while (followeeCred.email === followerCred.email);

    try {
      const follower = await loginUser(followerCred.email, followerCred.password);
      const followee = await loginUser(followeeCred.email, followeeCred.password);

      await followUser(follower, followee);
    console.log(`✅ ${i}: ${follower.user.email} --> ${followee.user.email}`);
    } catch (err) {
      console.error(`❌ Failed on iteration ${i + 1}`, err.response?.data || err.message);
    }
  }
}

run(200); // run n random follow actions
