import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const userFile = path.join(__dirname, 'created_user.txt');
const API = axios.create({ baseURL: 'http://localhost:9000/api' });

const SCHOOLS = [
  'HCMUS',
  'HCMUT',
  'UEH',
  'FPT University',
  'Hanoi University of Science and Technology',
  'VNU University of Engineering and Technology',
  'University of Information Technology',
  'Can Tho University',
  'Da Nang University of Science and Technology',
  'Hue University of Sciences',
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

async function addSchool(user, schoolName) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${user.token}` }
  });
  await authedAPI.post(`/users/${user.user.id}/school`, { schoolName });
}

async function run() {
  const users = loadUsers();

  for (const cred of users) {
    try {
      const user = await loginUser(cred.email, cred.password);
      const school = SCHOOLS[Math.floor(Math.random() * SCHOOLS.length)];
      await addSchool(user, school);
      console.log(`🎓 ${user.user.email} → ${school}`);
    } catch (err) {
      console.error(`❌ Failed for ${cred.email}`, err.response?.data || err.message);
    }
  }
}

run();
