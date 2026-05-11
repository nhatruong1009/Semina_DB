import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jobFile = path.join(__dirname, 'created_jobs.txt');
const companyFile = path.join(__dirname, 'created_companies.txt');
const API = axios.create({ baseURL: 'http://localhost:9000/api' });

// Must match the same pool as add_skill.js so recommendations actually work
const SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'SQL',
  'React', 'Node.js', 'Docker', 'AWS', 'Machine Learning',
  'Data Analysis', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL',
  'Kafka', 'Kubernetes', 'Git', 'REST API', 'Communication',
  'Project Management', 'Agile', 'Figma', 'Vue.js', 'Go',
  'C++', 'Spring Boot', 'Django', 'TensorFlow', 'Linux',
];

function loadJobs() {
  const lines = fs.readFileSync(jobFile, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [jobId, companyId] = line.split(',');
    return { jobId, companyId };
  });
}

function loadCompanyMap() {
  const lines = fs.readFileSync(companyFile, 'utf-8').trim().split('\n');
  const map = {};
  for (const line of lines) {
    const [companyId, contactEmail] = line.split(',');
    map[companyId] = contactEmail;
  }
  return map;
}

async function loginUser(email, password = '123456') {
  const res = await API.post('/auth/login', { email, password });
  return { user: res.data.user, token: res.data.token };
}

async function addJobSkill(user, jobId, skillName) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${user.token}` }
  });
  await authedAPI.post(`/jobs/${jobId}/skills`, { name: skillName });
}

async function run() {
  const jobs = loadJobs();
  const companyMap = loadCompanyMap();

  for (const job of jobs) {
    const contactEmail = companyMap[job.companyId];
    if (!contactEmail) {
      console.warn(`⚠️  No contact for company ${job.companyId}, skipping job ${job.jobId}`);
      continue;
    }

    try {
      const user = await loginUser(contactEmail);

      // pick 2-4 required skills per job
      const shuffled = [...SKILLS].sort(() => 0.5 - Math.random());
      const count = Math.floor(Math.random() * 3) + 2;
      const picked = shuffled.slice(0, count);

      for (const skill of picked) {
        await addJobSkill(user, job.jobId, skill);
      }
      console.log(`💼 Job ${job.jobId} → [${picked.join(', ')}]`);
    } catch (err) {
      console.error(`❌ Failed for job ${job.jobId}`, err.response?.data || err.message);
    }
  }
}

run();
