#!/usr/bin/env node
// ─────────────────────────────────────────────
// Promote a user to superadmin by email
// Usage: node create-admin.js user@email.com
// ─────────────────────────────────────────────
require('dotenv').config();
const { Pool } = require('pg');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node create-admin.js <email>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://rupiya:rupiya@localhost:5432/rupiya_db'
});

(async () => {
  try {
    const res = await pool.query('SELECT id, name, email, role FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!res.rows.length) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    const user = res.rows[0];
    if (user.role === 'superadmin') {
      console.log(`User "${user.name}" (${user.email}) is already a superadmin.`);
      process.exit(0);
    }
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['superadmin', user.id]);
    console.log(`Success! User "${user.name}" (${user.email}) is now a superadmin.`);
    console.log('They will see the Admin Panel after logging in again.');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
