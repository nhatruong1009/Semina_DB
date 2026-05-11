/**
 * Master seed script — chạy tất cả generators theo đúng thứ tự dependency.
 * Cách dùng: node run_all.js
 *
 * Thứ tự:
 *  1. create_user    — tạo users, ghi created_user.txt
 *  2. company        — tạo companies, ghi created_companies.txt  (cần superadmin)
 *  3. create_job     — tạo jobs, ghi created_jobs.txt            (cần created_companies.txt)
 *  4. add_skill      — gán HAS_SKILL cho users                  (cần created_user.txt)
 *  5. add_job_skill  — gán REQUIRES_SKILL cho jobs              (cần created_jobs.txt + created_companies.txt)
 *  6. add_school     — gán STUDIED_AT cho users                 (cần created_user.txt)
 *  7. follow         — tạo FOLLOWS                              (cần created_user.txt)
 *  8. connect        — tạo CONNECTS                             (cần created_user.txt)
 *  9. post           — tạo posts, ghi created_posts.txt         (cần created_user.txt)
 * 10. likepost       — like + comment posts                     (cần created_posts.txt)
 * 11. share_post     — share posts                              (cần created_posts.txt)
 * 12. applyjob       — apply to jobs                            (cần created_jobs.txt)
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function step(script, label) {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  ${label}`);
  console.log('═'.repeat(55));
  try {
    execSync(`node ${path.join(__dirname, script)}`, { stdio: 'inherit' });
    console.log(`✅ Done: ${label}`);
  } catch (err) {
    console.error(`❌ Error in ${label}:`, err.message);
    process.exit(1);
  }
}

step('create_user.js',   'Step  1 / 12 — Create Users');
step('company.js',       'Step  2 / 12 — Create Companies');
step('create_job.js',    'Step  3 / 12 — Create Jobs');
step('add_skill.js',     'Step  4 / 12 — Add Skills to Users');
step('add_job_skill.js', 'Step  5 / 12 — Add Required Skills to Jobs');
step('add_school.js',    'Step  6 / 12 — Add Schools to Users');
step('follow.js',        'Step  7 / 12 — Follow Users');
step('connect.js',       'Step  8 / 12 — Connect Users');
step('post.js',          'Step  9 / 12 — Create Posts');
step('likepost.js',      'Step 10 / 12 — Like & Comment Posts');
step('share_post.js',    'Step 11 / 12 — Share Posts');
step('applyjob.js',      'Step 12 / 12 — Apply to Jobs');

console.log('\n🎉 All seed data generated successfully!');
