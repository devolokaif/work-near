
// ─── src/utils/seed.js — Seed sample data ───────────────────
const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding WorkNear database...');

  // Create admin user
  await db.query(`
    INSERT INTO users (phone, full_name, role, status, is_verified)
    VALUES ('+919999999999', 'Admin User', 'admin', 'active', true)
    ON CONFLICT (phone) DO NOTHING
  `);

  // Create sample employer
  const employer = await db.query(`
    INSERT INTO users (phone, full_name, role, status, is_verified, email)
    VALUES ('+919876543210', 'Raj Sharma', 'employer', 'active', true, 'raj@example.com')
    ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id
  `).then(r => r.rows[0]);

  // Create sample workers
  const workers = [];
  const workerData = [
    { phone: '+919876543211', name: 'Ramesh Kumar', skills: ['Plumber'] },
    { phone: '+919876543212', name: 'Suresh Verma', skills: ['Electrician'] },
    { phone: '+919876543213', name: 'Mahesh Yadav', skills: ['Carpenter', 'Painter'] },
    { phone: '+919876543214', name: 'Dinesh Singh', skills: ['Cleaner'] },
    { phone: '+919876543215', name: 'Priya Devi', skills: ['Cook'] },
  ];

  for (const w of workerData) {
    const user = await db.query(`
      INSERT INTO users (phone, full_name, role, status, is_verified, rating)
      VALUES ($1, $2, 'worker', 'active', true, $3)
      ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `, [w.phone, w.name, (4 + Math.random()).toFixed(1)]).then(r => r.rows[0]);

    // Create worker profile
    await db.query(`
      INSERT INTO worker_profiles (user_id, hourly_rate, daily_rate, is_available,
        current_location, bio, experience_years)
      VALUES ($1, $2, $3, true,
        ST_MakePoint(82.97 + (random() * 0.1 - 0.05), 25.31 + (random() * 0.1 - 0.05))::geography,
        $4, $5)
      ON CONFLICT (user_id) DO NOTHING
    `, [
      user.id,
      100 + Math.floor(Math.random() * 200),
      700 + Math.floor(Math.random() * 800),
      `Experienced ${w.skills[0]} with proven track record`,
      2 + Math.floor(Math.random() * 8)
    ]);

    // Create wallet
    await db.query(`
      INSERT INTO wallets (user_id, balance) VALUES ($1, $2)
      ON CONFLICT (user_id) DO NOTHING
    `, [user.id, Math.floor(Math.random() * 5000)]);

    workers.push({ ...user, skills: w.skills });
  }

  // Create sample jobs
  const cats = await db.query('SELECT id, name FROM categories LIMIT 10').then(r => r.rows);
  const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]));

  const jobsData = [
    { title: 'Fix kitchen water pipe leak', cat: 'Plumber', budget_min: 500, budget_max: 1200 },
    { title: 'Install 3 ceiling fans', cat: 'Electrician', budget_min: 800, budget_max: 1500 },
    { title: 'Make wooden shelves for bedroom', cat: 'Carpenter', budget_min: 2000, budget_max: 4000 },
    { title: 'Paint 2BHK apartment', cat: 'Painter', budget_min: 5000, budget_max: 10000, workers_needed: 2 },
    { title: 'Deep clean entire house', cat: 'Cleaner', budget_min: 1000, budget_max: 2000, is_urgent: true },
    { title: 'Cook North Indian meals for event', cat: 'Cook', budget_min: 3000, budget_max: 5000 },
  ];

  for (const j of jobsData) {
    if (!catMap[j.cat]) continue;
    await db.query(`
      INSERT INTO jobs (
        employer_id, category_id, title, location, address_text,
        city, state, pincode, budget_min, budget_max,
        workers_needed, is_urgent, status
      ) VALUES (
        $1, $2, $3,
        ST_MakePoint(82.97 + (random() * 0.05), 25.31 + (random() * 0.05))::geography,
        'Varanasi, Uttar Pradesh', 'Varanasi', 'Uttar Pradesh', '221001',
        $4, $5, $6, $7, 'open'
      )
    `, [
      employer.id, catMap[j.cat], j.title,
      j.budget_min, j.budget_max,
      j.workers_needed || 1, j.is_urgent || false
    ]);
  }

  console.log('✅ Seed complete!');
  console.log('   Admin: +919999999999');
  console.log('   Employer: +919876543210 (Raj Sharma)');
  console.log('   Workers: +91987654321[1-5]');
  console.log('   OTP for all: use any 6 digits in development mode');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
