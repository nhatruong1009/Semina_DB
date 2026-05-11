import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const userFile = path.join(__dirname, 'created_user.txt');
const API = axios.create({ baseURL: 'http://localhost:9000/api' });

const SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'SQL',
  'React', 'Node.js', 'Docker', 'AWS', 'Machine Learning',
  'Data Analysis', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL',
  'Kafka', 'Kubernetes', 'Git', 'REST API', 'Communication',
  'Project Management', 'Agile', 'Figma', 'Vue.js', 'Go',
  'C++', 'Spring Boot', 'Django', 'TensorFlow', 'Linux',
];

function loadUsers() {
  const lines = fs.readFileSync(userFile, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
}

async function loginUser(email, password) {
  const res = await API.post('/auth/login', { email, password });
  return { user: res.data.user, token: res.data.token };
}

async function addSkill(user, skillName) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${user.token}` }
  });
  await authedAPI.post(`/users/${user.user.id}/skills`, { name: skillName });
}

async function run() {
  const users = loadUsers();

  for (const cred of users) {
    try {
      const user = await loginUser(cred.email, cred.password);

      // pick 2-5 random skills per user
      const shuffled = [...SKILLS].sort(() => 0.5 - Math.random());
      const count = Math.floor(Math.random() * 4) + 2;
      const picked = shuffled.slice(0, count);

      for (const skill of picked) {
        await addSkill(user, skill);
      }
      console.log(`🎯 ${user.user.email} → [${picked.join(', ')}]`);
    } catch (err) {
      console.error(`❌ Failed for ${cred.email}`, err.response?.data || err.message);
    }
  }
}

run();
