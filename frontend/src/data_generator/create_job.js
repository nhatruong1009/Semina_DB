import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { faker } from '@faker-js/faker';
import { Country, City } from 'country-state-city';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const companyFile = path.join(__dirname, 'created_companies.txt');
const jobFile = path.join(__dirname, 'created_jobs.txt');
const API = axios.create({ baseURL: 'http://localhost:9000/api' });

// load companies
function loadCompanies() {
  const lines = fs.readFileSync(companyFile, 'utf-8').trim().split('\n');
  return lines.map(line => {
    const [companyId, contactEmail] = line.split(',');
    return { companyId, contactEmail };
  });
}

// login helper
async function loginUser(email, password = '123456') {
  const res = await API.post('/auth/login', { email, password });
  return { user: res.data.user, token: res.data.token };
}

// create job helper
async function createJob(user, companyId, title, location, description, salaryRange) {
  const authedAPI = axios.create({
    baseURL: 'http://localhost:9000/api',
    headers: { Authorization: `Bearer ${user.token}` }
  });

  const res = await authedAPI.post('/jobs/create', {
    title,
    company_id: companyId,
    location,
    description,
    salary_range: salaryRange
  });

  const jobId = res.data.id;

  // Save job info to file
  const jobLine = [
    jobId,
    companyId,
    title.replace(/,/g, ''), // strip commas to keep CSV clean
    location.replace(/,/g, ''),
    description.replace(/,/g, ''),
    salaryRange.min,
    salaryRange.max,
    salaryRange.currency
  ].join(',');

  fs.appendFileSync(jobFile, jobLine + '\n');

  console.log(`💼 ${user.user.email} created job ${jobId}: ${title} at company ${companyId}`);
  return jobId;
}

// run N jobs per company
// run: pick random companies, each with 1–5 jobs
async function run(numCompanies = 3) {
  const companies = loadCompanies();

  // shuffle companies and take numCompanies
  const shuffled = companies.sort(() => 0.5 - Math.random());
  const selectedCompanies = shuffled.slice(0, numCompanies);

  for (const company of selectedCompanies) {
    try {
      const user = await loginUser(company.contactEmail);

      // random number of jobs between 1 and 5
      const numJobs = Math.floor(Math.random() * 5) + 1;

      for (let i = 0; i < numJobs; i++) {
        const title = faker.person.jobTitle();
        const description = faker.lorem.paragraph();

        const countries = Country.getAllCountries();
        const randomCountry = countries[Math.floor(Math.random() * countries.length)];
        const cities = City.getCitiesOfCountry(randomCountry.isoCode);
        const randomCity = cities.length > 0
          ? cities[Math.floor(Math.random() * cities.length)].name
          : 'Unknown City';
        const location = `${randomCity}, ${randomCountry.name}`;

        const salaryMin = faker.number.int({ min: 500, max: 2000 }) * 1000;
        const salaryMax = salaryMin + faker.number.int({ min: 500, max: 1500 }) * 1000;
        const currency = faker.helpers.arrayElement(['USD', 'EUR', 'VND']);
        const salaryRange = { min: salaryMin, max: salaryMax, currency };

        await createJob(user, company.companyId, title, location, description, salaryRange);
      }
    } catch (err) {
      console.error(`❌ Failed for company ${company.companyId}`, err.response?.data || err.message);
    }
  }
}

// Example: pick 3 random companies, each gets 1–5 jobs
run(5);