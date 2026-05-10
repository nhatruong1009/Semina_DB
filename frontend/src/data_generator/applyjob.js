import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userFile = path.join(__dirname, 'created_user.txt');
const jobFile = path.join(__dirname, 'created_jobs.txt');
const API = axios.create({ baseURL: 'http://localhost:9000/api' });

// load users
function loadUsers() {
  const lines = fs.readFileSync(userFile, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
}

// load jobs
function loadJobs() {
  const lines = fs.readFileSync(jobFile, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [jobId, companyId, title, location, description, salaryMin, salaryMax, currency] = line.split(',');
    return { jobId, companyId, title, location, description, salaryMin, salaryMax, currency };
  });
}

// login helper
async function loginUser(email, password = '123456') {
  const res = await API.post('/auth/login', { email, password });
  return { user: res.data.user, token: res.data.token };
}

// apply job helper
async function applyJob(user, jobId) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${user.token}` }
  });

  await authedAPI.post(`/jobs/${jobId}/apply`);
}

// run N applications
async function run(n = 20) {
  const users = loadUsers();
  const jobs = loadJobs();

  for (let i = 0; i < n; i++) {
    const cred = users[Math.floor(Math.random() * users.length)];
    const job = jobs[Math.floor(Math.random() * jobs.length)];

    try {
      const user = await loginUser(cred.email, cred.password);
      await applyJob(user, job.jobId);
    console.log(`📩 ${i}: ${user.user.email} applied to job ${job.jobId}`);
    } catch (err) {
      console.error(`❌ Failed on iteration ${i + 1}`, err.response?.data || err.message);
    }
  }
}

run(50); // simulate 50 random job applications
