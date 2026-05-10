import { authAPI } from '../api.js';
import { faker } from '@faker-js/faker';
import { LocalStorage } from 'node-localstorage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'created_user.txt');
// create a localStorage instance pointing to a folder
global.localStorage = new LocalStorage('./scratch');

async function createTestAccounts(count = 1000) {
  for (let i = 0; i < count; i++) {
    const name = faker.person.fullName();
    const email = faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] });
    const password = '123456';

    try {
      const res = await authAPI.register(email, password, name);
      console.log(`✅ Created account ${i + 1}: ${email}`);
      fs.appendFileSync(filePath, `${email},${password}\n`);
    } catch (err) {
      console.error(`❌ Failed to create account ${i + 1}: ${email}`, err.response?.data || err.message);
    }
  }
}

createTestAccounts(50);
