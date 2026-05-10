import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authAPI, adminCompanyAPI } from '../api.js'; // import your API layer
import { LocalStorage } from 'node-localstorage';
import { faker } from '@faker-js/faker'; // ✅ faker import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userFile = path.join(__dirname, 'created_user.txt');
const companyFile = path.join(__dirname, 'created_companies.txt');

// 🔑 Hard‑coded superadmin credentials
const SUPERADMIN_EMAIL = 'nhattruong1009@gmail.com';
const SUPERADMIN_PASSWORD = '123456';

// emulate browser localStorage for Node
global.localStorage = new LocalStorage('./scratch');

// load users
function loadUsers() {
  const lines = fs.readFileSync(userFile, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
}

async function run(n = 5) {
  try {
    // login superadmin
    const res = await authAPI.login(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    const superadmin = { user: res.data.user, token: res.data.token };

    // save tokens for API wrapper to use
    localStorage.setItem('token', superadmin.token);
    if (res.data.refreshToken) {
      localStorage.setItem('refreshToken', res.data.refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(superadmin.user));

    const users = loadUsers();

    for (let i = 0; i < n; i++) {
      // ✅ use faker for realistic data
      const companyName = faker.company.name();
      const industry = faker.commerce.department();
      const description = faker.company.catchPhrase();

      // pick random contact email from created users
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const contactEmail = randomUser.email;

      // call your API wrapper
      const companyRes = await adminCompanyAPI.createCompanyWithAdmin(
        companyName,
        industry,
        description,
        contactEmail
      );

      const companyId = companyRes.data.company.id;

      // Save both companyId and contact email
      fs.appendFileSync(companyFile, `${companyId},${contactEmail}\n`);

      console.log(`🏢 ${SUPERADMIN_EMAIL} created company ${companyId}: ${companyName} (contact: ${contactEmail})`);
    }
  } catch (err) {
    console.error(`❌ Failed to create companies`, err.response?.data || err.message);
  }
}

run(5); // create 5 companies with superadmin
