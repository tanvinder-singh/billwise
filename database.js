const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://rupiya:rupiya@localhost:5432/rupiya_db'
});

// ─── Schema creation (runs once on startup) ───────────────────
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL DEFAULT '',
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20) UNIQUE,
        password_hash TEXT,
        email_verified BOOLEAN DEFAULT false,
        phone_verified BOOLEAN DEFAULT false,
        business_name VARCHAR(255) DEFAULT '',
        gstin VARCHAR(15) DEFAULT '',
        address TEXT DEFAULT '',
        city VARCHAR(100) DEFAULT '',
        state VARCHAR(100) DEFAULT '',
        pincode VARCHAR(10) DEFAULT '',
        bank_name VARCHAR(255) DEFAULT '',
        account_no VARCHAR(50) DEFAULT '',
        ifsc_code VARCHAR(20) DEFAULT '',
        account_holder VARCHAR(255) DEFAULT '',
        upi_id VARCHAR(255) DEFAULT '',
        upi_qr TEXT DEFAULT '',
        signature TEXT DEFAULT '',
        terms_conditions TEXT DEFAULT '',
        invoice_theme VARCHAR(20) DEFAULT 'classic',
        gstin_api_key VARCHAR(100) DEFAULT '',
        logo TEXT DEFAULT '',
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS item_settings JSONB DEFAULT '{}';

      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invoice_number VARCHAR(50) NOT NULL,
        invoice_date DATE,
        due_date VARCHAR(20) DEFAULT '',
        customer_name VARCHAR(255),
        customer_phone VARCHAR(20) DEFAULT '',
        customer_email VARCHAR(255) DEFAULT '',
        customer_address TEXT DEFAULT '',
        customer_gstin VARCHAR(15) DEFAULT '',
        customer_state VARCHAR(100) DEFAULT '',
        place_of_supply VARCHAR(100) DEFAULT '',
        payment_terms VARCHAR(50) DEFAULT '',
        items JSONB DEFAULT '[]',
        subtotal NUMERIC(12,2) DEFAULT 0,
        cgst NUMERIC(12,2) DEFAULT 0,
        sgst NUMERIC(12,2) DEFAULT 0,
        igst NUMERIC(12,2) DEFAULT 0,
        round_off NUMERIC(8,2) DEFAULT 0,
        total_mrp NUMERIC(12,2) DEFAULT 0,
        discount NUMERIC(12,2) DEFAULT 0,
        total NUMERIC(12,2) DEFAULT 0,
        amount_paid NUMERIC(12,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'unpaid',
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(user_id, invoice_date);

      CREATE TABLE IF NOT EXISTS otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        used BOOLEAN DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_otps_target ON otps(target, type);

      CREATE TABLE IF NOT EXISTS parties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        address TEXT DEFAULT '',
        gstin VARCHAR(15) DEFAULT '',
        state VARCHAR(100) DEFAULT '',
        gst_type VARCHAR(50) DEFAULT '',
        billing_address TEXT DEFAULT '',
        shipping_address TEXT DEFAULT '',
        opening_balance NUMERIC(12,2) DEFAULT 0,
        credit_limit NUMERIC(12,2) DEFAULT 0,
        payment_terms VARCHAR(50) DEFAULT '',
        notes TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_parties_user ON parties(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_user_name ON parties(user_id, name);

      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        hsn VARCHAR(20) DEFAULT '',
        size VARCHAR(50) DEFAULT '',
        mrp NUMERIC(12,2) DEFAULT 0,
        rate NUMERIC(12,2) DEFAULT 0,
        gst NUMERIC(5,2) DEFAULT 0,
        unit VARCHAR(20) DEFAULT 'Pcs',
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_products_user_name ON products(user_id, name);

      -- Item settings: new product columns
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT '';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(12,2) DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold NUMERIC(12,2) DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) DEFAULT '';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS mfg_date DATE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS exp_date DATE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS model_no VARCHAR(100) DEFAULT '';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

      -- Party-wise item rates
      CREATE TABLE IF NOT EXISTS party_item_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        rate NUMERIC(12,2) NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_party_item_rates_unique ON party_item_rates(user_id, party_id, product_id);
    `);
    console.log('  [DB] PostgreSQL tables initialized');
  } finally {
    client.release();
  }
}

// ─── Helper: normalize row (add _id alias for backward compat) ─
// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(val) { return typeof val === 'string' && UUID_REGEX.test(val); }

function norm(row) {
  if (!row) return null;
  // Convert numeric strings back to numbers
  const r = { ...row };
  r._id = r.id; // backward compat for any remaining _id references
  // Parse JSONB items if it's a string
  if (typeof r.items === 'string') {
    try { r.items = JSON.parse(r.items); } catch(e) {}
  }
  // Convert numeric columns from string to number
  ['subtotal','cgst','sgst','igst','round_off','total_mrp','discount','total','amount_paid',
   'opening_balance','credit_limit','mrp','rate','gst','stock_quantity','low_stock_threshold'].forEach(k => {
    if (r[k] !== undefined && r[k] !== null) r[k] = parseFloat(r[k]);
  });
  // Parse JSONB fields
  ['item_settings','custom_fields'].forEach(k => {
    if (typeof r[k] === 'string') {
      try { r[k] = JSON.parse(r[k]); } catch(e) {}
    }
  });
  return r;
}

function normAll(rows) {
  return (rows || []).map(norm);
}

// ─── Collection wrappers ──────────────────────────────────────
// These provide a NeDB-like API so server.js changes are minimal.

function createCollection(tableName) {
  return {
    // findOne(where) → single row or null
    async findOne(where) {
      try {
        const { clause, values } = buildWhere(where);
        const res = await pool.query(`SELECT * FROM ${tableName} WHERE ${clause} LIMIT 1`, values);
        return norm(res.rows[0] || null);
      } catch(e) {
        if (e.code === '22P02') return null; // invalid UUID format → not found
        throw e;
      }
    },

    // find(where) → array of rows  (returns chainable with .sort())
    find(where) {
      const { clause, values } = buildWhere(where);
      const q = {
        _clause: clause, _values: values, _order: null,
        sort(orderObj) {
          // Convert NeDB-style {field: -1} to SQL ORDER BY
          const parts = Object.entries(orderObj).map(([k, v]) => `${k} ${v === -1 ? 'DESC' : 'ASC'}`);
          this._order = parts.join(', ');
          return this;
        },
        async then(resolve, reject) {
          try {
            let sql = `SELECT * FROM ${tableName} WHERE ${this._clause}`;
            if (this._order) sql += ` ORDER BY ${this._order}`;
            const res = await pool.query(sql, this._values);
            resolve(normAll(res.rows));
          } catch(e) {
            if (e.code === '22P02') { resolve([]); return; }
            if (reject) reject(e); else throw e;
          }
        }
      };
      return q;
    },

    // insert(data) → inserted row
    async insert(data) {
      const keys = Object.keys(data);
      const vals = Object.values(data).map(v =>
        v !== null && typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) :
        Array.isArray(v) ? JSON.stringify(v) : v
      );
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const res = await pool.query(sql, vals);
      return norm(res.rows[0]);
    },

    // update(where, update) → number of affected rows
    async update(where, update) {
      try {
        const setData = update.$set || update;
        const setCols = Object.keys(setData);
        if (!setCols.length) return 0;

        const { clause, values: whereVals } = buildWhere(where);
        const setValues = setCols.map(k => {
          const v = setData[k];
          return v !== null && typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) :
                 Array.isArray(v) ? JSON.stringify(v) : v;
        });

        const offset = whereVals.length;
        const setParts = setCols.map((k, i) => `${k} = $${offset + i + 1}`);
        const sql = `UPDATE ${tableName} SET ${setParts.join(', ')} WHERE ${clause}`;
        const res = await pool.query(sql, [...whereVals, ...setValues]);
        return res.rowCount;
      } catch(e) {
        if (e.code === '22P02') return 0;
        throw e;
      }
    },

    // remove(where) → number of deleted rows
    async remove(where) {
      try {
        const { clause, values } = buildWhere(where);
        const sql = `DELETE FROM ${tableName} WHERE ${clause}`;
        const res = await pool.query(sql, values);
        return res.rowCount;
      } catch(e) {
        if (e.code === '22P02') return 0;
        throw e;
      }
    },

    // count(where) → integer
    async count(where) {
      try {
        const { clause, values } = buildWhere(where);
        const res = await pool.query(`SELECT COUNT(*) as cnt FROM ${tableName} WHERE ${clause}`, values);
        return parseInt(res.rows[0].cnt);
      } catch(e) {
        if (e.code === '22P02') return 0;
        throw e;
      }
    }
  };
}

// ─── WHERE clause builder ─────────────────────────────────────
// Translates NeDB-style queries to SQL parameterized clauses
// offset: starting parameter number (for nested $or usage)
function buildWhere(where, offset) {
  if (!where || !Object.keys(where).length) return { clause: 'TRUE', values: [] };

  let paramIdx = offset || 0; // current param counter
  const parts = [];
  const values = [];

  // Handle $or
  if (where.$or) {
    const orParts = [];
    for (const cond of where.$or) {
      const sub = buildWhere(cond, paramIdx);
      orParts.push(`(${sub.clause})`);
      values.push(...sub.values);
      paramIdx += sub.values.length;
    }
    parts.push(`(${orParts.join(' OR ')})`);
  }

  for (const [key, val] of Object.entries(where)) {
    if (key === '$or') continue;

    // Map _id to id for PostgreSQL
    const col = key === '_id' ? 'id' : key;

    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      // Operator queries like { $gt: value }
      for (const [op, opVal] of Object.entries(val)) {
        values.push(opVal);
        paramIdx++;
        switch (op) {
          case '$gt':  parts.push(`${col} > $${paramIdx}`); break;
          case '$gte': parts.push(`${col} >= $${paramIdx}`); break;
          case '$lt':  parts.push(`${col} < $${paramIdx}`); break;
          case '$lte': parts.push(`${col} <= $${paramIdx}`); break;
          case '$ne':  parts.push(`${col} != $${paramIdx}`); break;
          default:     parts.push(`${col} = $${paramIdx}`); break;
        }
      }
    } else if (val === null) {
      parts.push(`${col} IS NULL`);
    } else {
      values.push(val);
      paramIdx++;
      parts.push(`${col} = $${paramIdx}`);
    }
  }

  return { clause: parts.length ? parts.join(' AND ') : 'TRUE', values };
}

// ─── Create collection instances ──────────────────────────────
const users = createCollection('users');
const invoices = createCollection('invoices');
const otps = createCollection('otps');
const parties = createCollection('parties');
const products = createCollection('products');

module.exports = { pool, initDB, users, invoices, otps, parties, products };
