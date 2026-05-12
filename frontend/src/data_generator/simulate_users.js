import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { faker } from '@faker-js/faker';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userFile = path.join(__dirname, 'created_user.txt');
const postFile = path.join(__dirname, 'created_posts.txt');
const jobFile = path.join(__dirname, 'created_jobs.txt');
const companyFile = path.join(__dirname, 'created_companies.txt');

const API = axios.create({ baseURL: 'http://localhost:9000/api' });

// Load data
function loadUsers() {
  const lines = fs.readFileSync(userFile, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
}

function loadPosts() {
  const lines = fs.readFileSync(postFile, 'utf-8').trim().split('\n').filter(l => l);
  return lines;
}

function loadJobs() {
  const lines = fs.readFileSync(jobFile, 'utf-8').trim().split('\n').filter(l => l);
  return lines.map(line => {
    const parts = line.split(',');
    return { id: parts[0], companyId: parts[1], title: parts[2], location: parts[3], description: parts[4], salaryMin: parts[5], salaryMax: parts[6], currency: parts[7] };
  });
}

function loadCompanies() {
  const lines = fs.readFileSync(companyFile, 'utf-8').trim().split('\n').filter(l => l);
  return lines.map(line => {
    const [companyId, email] = line.split(',');
    return { companyId, email };
  });
}

// Login helper
async function loginUser(email, password) {
  const res = await API.post('/auth/login', { email, password });
  return { user: res.data.user, token: res.data.token };
}

// Create authed API
function createAuthedAPI(token) {
  return axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Actions
const actions = [];

// Get feed
actions.push(async (user, data) => {
  const api = createAuthedAPI(user.token);
  const start = Date.now();
  await api.get('/posts/feed?page=1&limit=10');
  const time = Date.now() - start;
  return { endpoint: 'getFeed', time };
});

// Get jobs
actions.push(async (user, data) => {
  const api = createAuthedAPI(user.token);
  const start = Date.now();
  await api.get('/jobs');
  const time = Date.now() - start;
  return { endpoint: 'getJobs', time };
});

// Like a post
actions.push(async (user, data) => {
  const postId = data.posts[Math.floor(Math.random() * data.posts.length)];
  const api = createAuthedAPI(user.token);
  const start = Date.now();
  await api.post(`/posts/${postId}/like`);
  const time = Date.now() - start;
  return { endpoint: 'likePost', time };
});

// Comment on post
actions.push(async (user, data) => {
  const postId = data.posts[Math.floor(Math.random() * data.posts.length)];
  const comment = faker.lorem.sentence();
  const api = createAuthedAPI(user.token);
  const start = Date.now();
  await api.post(`/posts/${postId}/comment`, { text: comment });
  const time = Date.now() - start;
  return { endpoint: 'commentPost', time };
});

// Share post
actions.push(async (user, data) => {
  const postId = data.posts[Math.floor(Math.random() * data.posts.length)];
  const api = createAuthedAPI(user.token);
  const start = Date.now();
  await api.post(`/posts/${postId}/share`);
  const time = Date.now() - start;
  return { endpoint: 'sharePost', time };
});

// Apply for job
actions.push(async (user, data) => {
  const job = data.jobs[Math.floor(Math.random() * data.jobs.length)];
  const api = createAuthedAPI(user.token);
  const start = Date.now();
  await api.post(`/jobs/${job.id}/apply`);
  const time = Date.now() - start;
  return { endpoint: 'applyJob', time };
});

// Follow user
actions.push(async (user, data) => {
  const followee = data.users[Math.floor(Math.random() * data.users.length)];
  if (followee.id === user.user.id) return { endpoint: 'followUser', time: 0 }; // skip self
  const api = createAuthedAPI(user.token);
  const start = Date.now();
  await api.post('/users/follow', { followerId: user.user.id, followeeId: followee.id });
  const time = Date.now() - start;
  return { endpoint: 'followUser', time };
});

// Get profile
actions.push(async (user, data) => {
  const profileUser = data.users[Math.floor(Math.random() * data.users.length)];
  const api = createAuthedAPI(user.token);
  const start = Date.now();
  await api.get(`/profiles/${profileUser.id}`);
  const time = Date.now() - start;
  return { endpoint: 'getProfile', time };
});

// Create post
actions.push(async (user, data) => {
  const content = faker.lorem.paragraph();
  const api = createAuthedAPI(user.token);
  const start = Date.now();
  const res = await api.post('/posts/create', { content });
  const time = Date.now() - start;
  const postId = res.data.id;
  fs.appendFileSync(postFile, `${postId}\n`);
  return { endpoint: 'createPost', time };
});

// Get notifications
actions.push(async (user, data) => {
  const api = createAuthedAPI(user.token);
  const start = Date.now();
  await api.get('/notifications?limit=10');
  const time = Date.now() - start;
  return { endpoint: 'getNotifications', time };
});

// Simulate one user
async function simulateUser(userCred, data, actionsPerUser = 500) {
  const user = await loginUser(userCred.email, userCred.password);
  const results = [];
  for (let i = 0; i < actionsPerUser; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    try {
      const result = await action(user, data);
      results.push(result);
    } catch (err) {
      console.error(`Error in action for user ${user.user.email}:`, err.message);
    }
  }
  return results;
}

// Main
async function main(n = 10) {
  const users = loadUsers();
  const posts = loadPosts();
  const jobs = loadJobs();
  const companies = loadCompanies();

  // Get user IDs by logging in all? Wait, to get IDs, perhaps assume or load from somewhere.
  // For simplicity, since follow needs user ID, and profile, let's login all users to get IDs.
  // But to save time, perhaps pick random emails for follow, but need IDs.
  // Actually, for follow, the API is /users/follow with followerId, followeeId, so need IDs.
  // So, I need to get user IDs.
  // Perhaps load from a file or assume.
  // Since created_user.txt has emails, but not IDs.
  // I can modify to login all and get IDs, but for n users, login n.
  // For follow, pick random from the n users' IDs.

  const selectedUsers = [];
  for (let i = 0; i < n; i++) {
    selectedUsers.push(users[Math.floor(Math.random() * users.length)]);
  }

  // Login selected users to get IDs
  const loggedUsers = [];
  for (const cred of selectedUsers) {
    try {
      const user = await loginUser(cred.email, cred.password);
      loggedUsers.push(user);
    } catch (err) {
      console.error(`Failed to login ${cred.email}:`, err.message);
    }
  }

  const data = {
    users: loggedUsers.map(u => u.user),
    posts,
    jobs,
    companies
  };

  // Run simulations concurrently
  const promises = selectedUsers.map((cred, index) => simulateUser(cred, data));
  const allResults = await Promise.all(promises);

  // Flatten results
  const flatResults = allResults.flat();

  // Group by endpoint
  const endpointTimes = {};
  flatResults.forEach(({ endpoint, time }) => {
    if (!endpointTimes[endpoint]) endpointTimes[endpoint] = [];
    endpointTimes[endpoint].push(time);
  });

  // Compute averages
  console.log('Average response times:');
  for (const [endpoint, times] of Object.entries(endpointTimes)) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`${endpoint}: ${avg.toFixed(2)} ms (${times.length} calls)`);
  }
}

// Run with n from args
const n = process.argv[2] ? parseInt(process.argv[2]) : 10;
main(n).catch(console.error);