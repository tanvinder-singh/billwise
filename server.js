require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { initDB, users, invoices, otps, parties, products, saleDocuments, paymentsIn, purchaseDocuments, paymentsOut, expenses } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rupiya-dev-secret-2024';
const IS_DEV = !process.env.SMTP_HOST;

app.use(express.json({ limit: '5mb' }));

// Static files — cache JS/CSS (versioned via ?v=) but never cache HTML
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: function (res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// ─── Email Transporter ──────────────────────────────────────
let transporter = null;
async function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  } else {
    const test = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587,
      auth: { user: test.user, pass: test.pass }
    });
  }
  return transporter;
}

// ─── Helpers ─────────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
}

function safeUser(u) {
  if (!u) return null;
  const copy = { ...u };
  delete copy.password_hash;
  delete copy._id;
  return copy;
}

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Admin middleware
function adminAuth(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ─── AUTH ROUTES ─────────────────────────────────────────────

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });

    const emailLower = email.toLowerCase();
    const existing = await users.findOne({ email: emailLower });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    if (phone) {
      const phoneExists = await users.findOne({ phone });
      if (phoneExists) return res.status(409).json({ error: 'An account with this phone already exists' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const user = await users.insert({
      name, email: emailLower, phone: phone || null,
      password_hash: hash,
      business_name: '', gstin: '', address: '', city: '', state: '', pincode: '',
      bank_name: '', account_no: '', ifsc_code: '', account_holder: '', terms_conditions: '',
      upi_id: '', upi_qr: '', signature: '',
      email_verified: false, phone_verified: false,
      created_at: new Date()
    });

    // Send email OTP
    const otp = generateOTP();
    await otps.insert({ target: emailLower, type: 'email', otp, expires_at: new Date(Date.now() + 10 * 60000), used: false });
    console.log(`[DEV] Email OTP for ${emailLower}: ${otp}`);

    if (!IS_DEV) {
      try {
        const t = await getTransporter();
        await t.sendMail({
          from: process.env.SMTP_FROM || 'noreply@rupiya.in', to: email,
          subject: 'Rupiya - Verify your email',
          html: `<h2>Welcome to Rupiya!</h2><p>Your OTP: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`
        });
      } catch (e) { console.error('Email send failed:', e.message); }
    }

    const token = signToken(user);
    res.json({ token, user: safeUser(user), otp: IS_DEV ? otp : undefined, message: 'Account created!' });
  } catch (e) {
    console.error(e);
    if (e.code === '23505' || e.errorType === 'uniqueViolated') return res.status(409).json({ error: 'Account already exists with this email or phone' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Email/phone and password are required' });

    const idLower = identifier.toLowerCase();
    const user = await users.findOne({ $or: [{ email: idLower }, { phone: identifier }] });
    if (!user) return res.status(401).json({ error: 'No account found with this email/phone' });
    if (!user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { target, type } = req.body;
    if (!target || !type) return res.status(400).json({ error: 'Target and type are required' });

    const otp = generateOTP();
    await otps.insert({ target, type, otp, expires_at: new Date(Date.now() + 10 * 60000), used: false });
    console.log(`[DEV] ${type.toUpperCase()} OTP for ${target}: ${otp}`);

    if (type === 'email' && !IS_DEV) {
      try {
        const t = await getTransporter();
        await t.sendMail({
          from: process.env.SMTP_FROM || 'noreply@rupiya.in', to: target,
          subject: 'Rupiya - Your OTP',
          html: `<p>Your OTP: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`
        });
      } catch (e) { console.error('Email send failed:', e.message); }
    }

    if (type === 'phone' && process.env.TWILIO_SID) {
      try {
        const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
        await twilio.messages.create({ body: `Your Rupiya OTP: ${otp}`, from: process.env.TWILIO_PHONE, to: `+91${target}` });
      } catch (e) { console.error('SMS send failed:', e.message); }
    }

    res.json({ message: `OTP sent to ${target}`, otp: IS_DEV ? otp : undefined });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { target, type, otp } = req.body;
    if (!target || !type || !otp) return res.status(400).json({ error: 'Target, type and OTP are required' });

    const record = await otps.findOne({
      target, type, otp, used: false,
      expires_at: { $gt: new Date() }
    });
    if (!record) return res.status(400).json({ error: 'Invalid or expired OTP' });

    await otps.update({ id: record.id }, { $set: { used: true } });

    if (type === 'phone') {
      let user = await users.findOne({ phone: target });
      if (!user) {
        user = await users.insert({
          name: `User-${target.slice(-4)}`, email: null, phone: target,
          password_hash: null, business_name: '', gstin: '', address: '',
          city: '', state: '', pincode: '',
          bank_name: '', account_no: '', ifsc_code: '', account_holder: '', terms_conditions: '',
          upi_id: '', upi_qr: '', signature: '',
          email_verified: false, phone_verified: true,
          created_at: new Date()
        });
      } else {
        await users.update({ id: user.id }, { $set: { phone_verified: true } });
      }
      const token = signToken(user);
      return res.json({ token, user: safeUser(user), message: 'Phone verified!' });
    }

    if (type === 'email') {
      await users.update({ email: target }, { $set: { email_verified: true } });
      return res.json({ message: 'Email verified!' });
    }

    res.json({ message: 'OTP verified' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Current user
app.get('/api/auth/me', auth, async (req, res) => {
  const user = await users.findOne({ id: req.user.id });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: safeUser(user) });
});

// Update profile
app.put('/api/auth/profile', auth, async (req, res) => {
  const b = req.body;
  const setData = {};
  // Only update fields that are explicitly sent in the request body
  const textFields = ['name', 'business_name', 'gstin', 'address', 'city', 'state', 'pincode',
    'bank_name', 'account_no', 'ifsc_code', 'account_holder', 'terms_conditions',
    'upi_id', 'upi_qr', 'signature', 'logo', 'invoice_theme', 'gstin_api_key'];
  textFields.forEach(f => { if (b[f] !== undefined) setData[f] = b[f] || ''; });
  if (b.item_settings !== undefined) setData.item_settings = b.item_settings;
  if (Object.keys(setData).length > 0) {
    await users.update({ id: req.user.id }, { $set: setData });
  }
  const user = await users.findOne({ id: req.user.id });
  res.json({ user: safeUser(user), message: 'Profile updated' });
});

// ─── PARTY & PRODUCT AUTOCOMPLETE ────────────────────────────

// Search saved parties (customers)
app.get('/api/parties', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const { pool } = require('./database');
    let sql, params;
    if (q) {
      sql = `SELECT * FROM parties WHERE user_id = $1 AND name ILIKE $2 ORDER BY updated_at DESC LIMIT 20`;
      params = [req.user.id, '%' + q + '%'];
    } else {
      sql = `SELECT * FROM parties WHERE user_id = $1 ORDER BY name ASC`;
      params = [req.user.id];
    }
    const result = await pool.query(sql, params);
    const list = result.rows.map(r => { r._id = r.id; return r; });
    res.json({ parties: list });
  } catch (e) {
    console.error(e);
    res.json({ parties: [] });
  }
});

// Get single party
app.get('/api/parties/:id', auth, async (req, res) => {
  try {
    const { pool } = require('./database');
    const result = await pool.query('SELECT * FROM parties WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Party not found' });
    const party = result.rows[0];
    party._id = party.id;
    ['opening_balance','credit_limit'].forEach(k => { if (party[k] !== undefined) party[k] = parseFloat(party[k]); });
    res.json({ party });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch party' });
  }
});

// Search saved products (items)
app.get('/api/products', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const { pool } = require('./database');
    let sql, params;
    if (q) {
      sql = `SELECT * FROM products WHERE user_id = $1 AND name ILIKE $2 ORDER BY updated_at DESC LIMIT 20`;
      params = [req.user.id, '%' + q + '%'];
    } else {
      sql = `SELECT * FROM products WHERE user_id = $1 ORDER BY name ASC`;
      params = [req.user.id];
    }
    const result = await pool.query(sql, params);
    const list = result.rows.map(r => {
      r._id = r.id;
      ['mrp','rate','gst'].forEach(k => { if (r[k] !== undefined) r[k] = parseFloat(r[k]); });
      return r;
    });
    res.json({ products: list });
  } catch (e) {
    console.error(e);
    res.json({ products: [] });
  }
});

// Get single product
app.get('/api/products/:id', auth, async (req, res) => {
  try {
    const { pool } = require('./database');
    const result = await pool.query('SELECT * FROM products WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    const product = result.rows[0];
    product._id = product.id;
    ['mrp','rate','gst'].forEach(k => { if (product[k] !== undefined) product[k] = parseFloat(product[k]); });
    res.json({ product });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// GSTIN Lookup – extract state & attempt public API lookup
const GSTIN_STATE_MAP = {
  '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
  '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
  '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
  '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
  '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat',
  '25':'Daman & Diu','26':'Dadra & Nagar Haveli','27':'Maharashtra','29':'Karnataka',
  '30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry',
  '35':'Andaman & Nicobar','36':'Telangana','37':'Andhra Pradesh'
};

// Helper: HTTP GET that returns a promise
function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    const request = mod.get(url, { timeout: timeoutMs }, (response) => {
      // Follow redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return httpGet(response.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { resolve(body); }
      });
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('timeout')); });
  });
}

app.get('/api/gstin-lookup/:gstin', auth, async (req, res) => {
  const gstin = (req.params.gstin || '').toUpperCase().trim();
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
  if (!gstinRegex.test(gstin)) {
    return res.status(400).json({ error: 'Invalid GSTIN format' });
  }

  const stateCode = gstin.substring(0, 2);
  const stateName = GSTIN_STATE_MAP[stateCode] || '';
  const stateWithCode = stateName ? (stateCode + '-' + stateName) : '';

  // Check if user has a GSTIN API key configured (fallback to default)
  const user = await users.findOne({ id: req.user.id });
  const apiKey = (user && user.gstin_api_key ? user.gstin_api_key.trim() : '') || '73bab7f23f2742306a1dccbd2d8874ec';

  if (apiKey) {
    // Try gstincheck.co.in with user's API key
    try {
      console.log(`[GSTIN] Trying gstincheck with user API key for ${gstin}...`);
      const raw = await httpGet(`https://sheet.gstincheck.co.in/check/${apiKey}/${gstin}`, 8000);
      if (raw && raw.flag && raw.data) {
        const d = raw.data;
        const addr = d.pradr && d.pradr.addr ? d.pradr.addr : {};
        const parts = [addr.bno, addr.flno, addr.bnm, addr.st, addr.loc, addr.dst, addr.stcd, addr.pncd].filter(Boolean);
        console.log(`[GSTIN] gstincheck returned data for ${gstin}`);
        return res.json({
          valid: true, gstin, state: stateWithCode, state_name: stateName,
          legal_name: d.lgnm || '', trade_name: d.tradeNam || '',
          gst_type: d.dty || '', status: d.sts || '',
          address: parts.join(', '), pincode: addr.pncd || ''
        });
      }
      console.log(`[GSTIN] gstincheck response:`, JSON.stringify(raw).substring(0, 200));
    } catch(e) {
      console.log(`[GSTIN] gstincheck failed: ${e.message}`);
    }
  } else {
    console.log(`[GSTIN] No API key configured. Returning state from GSTIN code only.`);
  }

  // Fallback — return state extracted from GSTIN code
  res.json({
    valid: true, gstin, state: stateWithCode, state_name: stateName,
    legal_name: '', trade_name: '', gst_type: '', status: '',
    address: '', pincode: '',
    needs_api_key: !apiKey
  });
});

// Create a party
app.post('/api/parties', auth, async (req, res) => {
  try {
    const { name, phone, email, address, gstin, state, gst_type, billing_address,
            shipping_address, opening_balance, credit_limit, payment_terms, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Party name is required' });
    const existing = await parties.findOne({ user_id: req.user.id, name });
    if (existing) return res.status(409).json({ error: 'Party with this name already exists' });
    const party = await parties.insert({
      user_id: req.user.id, name, phone: phone || '', email: email || '',
      address: address || '', gstin: gstin || '', state: state || '',
      gst_type: gst_type || '', billing_address: billing_address || '',
      shipping_address: shipping_address || '',
      opening_balance: opening_balance || 0, credit_limit: credit_limit || 0,
      payment_terms: payment_terms || '', notes: notes || '',
      updated_at: new Date()
    });
    res.json({ party, message: 'Party added!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add party' });
  }
});

// Create a product
app.post('/api/products', auth, async (req, res) => {
  try {
    const { name, hsn, size, mrp, rate, gst, unit, category, description,
            stock_quantity, low_stock_threshold, batch_no, mfg_date, exp_date,
            model_no, custom_fields } = req.body;
    if (!name) return res.status(400).json({ error: 'Item name is required' });
    const existing = await products.findOne({ user_id: req.user.id, name });
    if (existing) return res.status(409).json({ error: 'Item with this name already exists' });
    const insertData = {
      user_id: req.user.id, name, hsn: hsn || '', size: size || '', mrp: mrp || 0,
      rate: rate || 0, gst: gst != null ? gst : 0, unit: unit || 'Pcs',
      category: category || '', description: description || '',
      stock_quantity: stock_quantity || 0, low_stock_threshold: low_stock_threshold || 0,
      batch_no: batch_no || '', model_no: model_no || '',
      custom_fields: custom_fields || {},
      updated_at: new Date()
    };
    if (mfg_date) insertData.mfg_date = mfg_date;
    if (exp_date) insertData.exp_date = exp_date;
    const product = await products.insert(insertData);
    res.json({ product, message: 'Item added!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update a party
app.put('/api/parties/:id', auth, async (req, res) => {
  try {
    const { name, phone, email, address, gstin, state, gst_type, billing_address,
            shipping_address, opening_balance, credit_limit, payment_terms, notes } = req.body;
    await parties.update({ id: req.params.id, user_id: req.user.id }, {
      $set: { name: name || '', phone: phone || '', email: email || '',
        address: address || '', gstin: gstin || '', state: state || '',
        gst_type: gst_type || '', billing_address: billing_address || '',
        shipping_address: shipping_address || '',
        opening_balance: opening_balance || 0, credit_limit: credit_limit || 0,
        payment_terms: payment_terms || '', notes: notes || '',
        updated_at: new Date() }
    });
    const party = await parties.findOne({ id: req.params.id });
    res.json({ party, message: 'Party updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update party' });
  }
});

// Delete a party
app.delete('/api/parties/:id', auth, async (req, res) => {
  const removed = await parties.remove({ id: req.params.id, user_id: req.user.id });
  if (removed === 0) return res.status(404).json({ error: 'Party not found' });
  res.json({ message: 'Party deleted' });
});

// Update a product
app.put('/api/products/:id', auth, async (req, res) => {
  try {
    const { name, hsn, size, mrp, rate, gst, unit, category, description,
            stock_quantity, low_stock_threshold, batch_no, mfg_date, exp_date,
            model_no, custom_fields } = req.body;
    const setData = {
      name: name || '', hsn: hsn || '', size: size || '', mrp: mrp || 0,
      rate: rate || 0, gst: gst != null ? gst : 0, unit: unit || 'Pcs',
      category: category || '', description: description || '',
      stock_quantity: stock_quantity || 0, low_stock_threshold: low_stock_threshold || 0,
      batch_no: batch_no || '', model_no: model_no || '',
      custom_fields: custom_fields || {},
      updated_at: new Date()
    };
    if (mfg_date !== undefined) setData.mfg_date = mfg_date || null;
    if (exp_date !== undefined) setData.exp_date = exp_date || null;
    await products.update({ id: req.params.id, user_id: req.user.id }, { $set: setData });
    const product = await products.findOne({ id: req.params.id });
    res.json({ product, message: 'Product updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete a product
app.delete('/api/products/:id', auth, async (req, res) => {
  const removed = await products.remove({ id: req.params.id, user_id: req.user.id });
  if (removed === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted' });
});

// ─── PARTY-WISE ITEM RATES ───────────────────────────────────

// Get all custom rates for a party
app.get('/api/party-rates/:party_id', auth, async (req, res) => {
  try {
    const { pool } = require('./database');
    const result = await pool.query(
      'SELECT pr.*, p.name as product_name FROM party_item_rates pr LEFT JOIN products p ON pr.product_id = p.id WHERE pr.user_id = $1 AND pr.party_id = $2 ORDER BY p.name',
      [req.user.id, req.params.party_id]
    );
    res.json({ rates: result.rows.map(r => { r._id = r.id; r.rate = parseFloat(r.rate); return r; }) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch party rates' });
  }
});

// Set/update a party-item rate
app.put('/api/party-rates', auth, async (req, res) => {
  try {
    const { party_id, product_id, rate } = req.body;
    if (!party_id || !product_id || rate === undefined) return res.status(400).json({ error: 'party_id, product_id, and rate are required' });
    const { pool } = require('./database');
    await pool.query(
      `INSERT INTO party_item_rates (user_id, party_id, product_id, rate) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, party_id, product_id) DO UPDATE SET rate = $4, updated_at = NOW()`,
      [req.user.id, party_id, product_id, rate]
    );
    res.json({ message: 'Party rate saved' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save party rate' });
  }
});

// Delete a party-item rate
app.delete('/api/party-rates/:id', auth, async (req, res) => {
  try {
    const { pool } = require('./database');
    await pool.query('DELETE FROM party_item_rates WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Party rate deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete party rate' });
  }
});

// Get rate for a specific party + product combo (used in invoice form)
app.get('/api/party-rates/:party_id/:product_id', auth, async (req, res) => {
  try {
    const { pool } = require('./database');
    const result = await pool.query(
      'SELECT rate FROM party_item_rates WHERE user_id = $1 AND party_id = $2 AND product_id = $3',
      [req.user.id, req.params.party_id, req.params.product_id]
    );
    if (result.rows.length) {
      res.json({ rate: parseFloat(result.rows[0].rate), found: true });
    } else {
      res.json({ rate: null, found: false });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch party rate' });
  }
});

// ─── INVOICE ROUTES ──────────────────────────────────────────

// Stats
app.get('/api/invoices/stats', auth, async (req, res) => {
  const all = await invoices.find({ user_id: req.user.id });
  const stats = {
    total_invoices: all.length,
    total_amount: all.reduce((s, i) => s + (i.total || 0), 0),
    paid_amount: all.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
    unpaid_amount: all.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0)
  };
  res.json({ stats });
});

// List
app.get('/api/invoices', auth, async (req, res) => {
  const list = await invoices.find({ user_id: req.user.id }).sort({ created_at: -1 });
  res.json({ invoices: list });
});

// List unpaid/partial invoices (for payment-in form) — must be before /:id
app.get('/api/invoices/unpaid', auth, async (req, res) => {
  try {
    const { pool } = require('./database');
    const partyName = req.query.party || '';
    let sql, params;
    if (partyName) {
      sql = `SELECT * FROM invoices WHERE user_id = $1 AND status != 'paid' AND customer_name ILIKE $2 ORDER BY created_at DESC`;
      params = [req.user.id, '%' + partyName + '%'];
    } else {
      sql = `SELECT * FROM invoices WHERE user_id = $1 AND status != 'paid' ORDER BY created_at DESC`;
      params = [req.user.id];
    }
    const result = await pool.query(sql, params);
    const list = result.rows.map(r => {
      r._id = r.id;
      ['subtotal','total','amount_paid','discount'].forEach(k => {
        if (r[k] !== undefined && r[k] !== null) r[k] = parseFloat(r[k]);
      });
      if (typeof r.items === 'string') { try { r.items = JSON.parse(r.items); } catch(e) {} }
      return r;
    });
    res.json({ invoices: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch unpaid invoices' });
  }
});

// Create
app.post('/api/invoices', auth, async (req, res) => {
  try {
    const {
      invoice_date, due_date, customer_name, customer_phone, customer_email,
      customer_address, customer_gstin, customer_state, place_of_supply,
      items, subtotal, cgst, sgst, igst, total, round_off, total_mrp, notes, status
    } = req.body;

    if (!customer_name || !items || !items.length) {
      return res.status(400).json({ error: 'Customer name and at least one item are required' });
    }

    const count = await invoices.count({ user_id: req.user.id });
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const num = String(count + 1).padStart(4, '0');
    const invoice_number = `${prefix}-${num}`;

    const inv = await invoices.insert({
      user_id: req.user.id, invoice_number,
      invoice_date: invoice_date || now.toISOString().slice(0, 10),
      due_date: due_date || '', customer_name,
      customer_phone: customer_phone || '', customer_email: customer_email || '',
      customer_address: customer_address || '', customer_gstin: customer_gstin || '',
      customer_state: customer_state || '', place_of_supply: place_of_supply || '',
      items, subtotal: subtotal || 0, cgst: cgst || 0, sgst: sgst || 0,
      igst: igst || 0, total: total || 0, round_off: round_off || 0, total_mrp: total_mrp || 0,
      amount_paid: 0, notes: notes || '', status: status || 'unpaid',
      created_at: now
    });

    // Auto-save party and items for future autocomplete
    try {
      const partyData = {
        user_id: req.user.id, name: customer_name,
        phone: customer_phone || '', email: customer_email || '',
        address: customer_address || '', gstin: customer_gstin || '',
        state: customer_state || '', updated_at: now
      };
      const existingParty = await parties.findOne({ user_id: req.user.id, name: customer_name });
      if (existingParty) await parties.update({ id: existingParty.id }, { $set: partyData });
      else await parties.insert(partyData);

      for (const item of items) {
        const productData = {
          user_id: req.user.id, name: item.name,
          hsn: item.hsn || '', size: item.size || '', mrp: item.mrp || 0,
          rate: item.rate || 0, gst: item.gst || 0, unit: item.unit || 'Pcs',
          updated_at: now
        };
        const existingProduct = await products.findOne({ user_id: req.user.id, name: item.name });
        if (existingProduct) await products.update({ id: existingProduct.id }, { $set: productData });
        else await products.insert(productData);
      }
    } catch (autoErr) {
      console.error('Auto-save error (non-critical):', autoErr);
    }

    res.json({ invoice: inv, message: 'Invoice created!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Get one
app.get('/api/invoices/:id', auth, async (req, res) => {
  const inv = await invoices.findOne({ id: req.params.id, user_id: req.user.id });
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ invoice: inv });
});

// Update status
app.patch('/api/invoices/:id', auth, async (req, res) => {
  const { status, amount_paid } = req.body;
  await invoices.update({ id: req.params.id, user_id: req.user.id },
    { $set: { status: status || 'unpaid', amount_paid: amount_paid || 0 } });
  const inv = await invoices.findOne({ id: req.params.id, user_id: req.user.id });
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ invoice: inv, message: 'Invoice updated' });
});

// Delete
app.delete('/api/invoices/:id', auth, async (req, res) => {
  const removed = await invoices.remove({ id: req.params.id, user_id: req.user.id });
  if (removed === 0) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ message: 'Invoice deleted' });
});

// ─── SALE DOCUMENTS (estimates, proforma, challan, sale_return) ──

// Prefix map for doc numbering
const DOC_PREFIXES = { estimate: 'EST', proforma: 'PI', challan: 'DC', sale_return: 'SR' };
const DOC_TITLES = { estimate: 'Estimate', proforma: 'Proforma Invoice', challan: 'Delivery Challan', sale_return: 'Credit Note' };

// List sale documents by type
app.get('/api/sale-docs', auth, async (req, res) => {
  try {
    const docType = req.query.type || 'estimate';
    const list = await saleDocuments.find({ user_id: req.user.id, doc_type: docType }).sort({ created_at: -1 });
    res.json({ documents: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get single sale document
app.get('/api/sale-docs/:id', auth, async (req, res) => {
  try {
    const doc = await saleDocuments.findOne({ id: req.params.id, user_id: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Create sale document
app.post('/api/sale-docs', auth, async (req, res) => {
  try {
    const {
      doc_type, doc_date, due_date, customer_name, customer_phone, customer_email,
      customer_address, customer_gstin, customer_state, place_of_supply, payment_terms,
      items, subtotal, cgst, sgst, igst, total, round_off, total_mrp, discount,
      notes, status, reference_id, reason
    } = req.body;

    if (!doc_type || !DOC_PREFIXES[doc_type]) {
      return res.status(400).json({ error: 'Invalid document type' });
    }
    if (!customer_name || !items || !items.length) {
      return res.status(400).json({ error: 'Customer name and at least one item are required' });
    }

    // Auto-generate doc number
    const { pool } = require('./database');
    const now = new Date();
    const prefix = DOC_PREFIXES[doc_type];
    const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countRes = await pool.query(
      `SELECT COUNT(*) as cnt FROM sale_documents WHERE user_id = $1 AND doc_type = $2 AND doc_number LIKE $3`,
      [req.user.id, doc_type, `${prefix}-${monthStr}-%`]
    );
    const num = String(parseInt(countRes.rows[0].cnt) + 1).padStart(4, '0');
    const doc_number = `${prefix}-${monthStr}-${num}`;

    const doc = await saleDocuments.insert({
      user_id: req.user.id, doc_type, doc_number,
      doc_date: doc_date || now.toISOString().slice(0, 10),
      due_date: due_date || null,
      customer_name, customer_phone: customer_phone || '', customer_email: customer_email || '',
      customer_address: customer_address || '', customer_gstin: customer_gstin || '',
      customer_state: customer_state || '', place_of_supply: place_of_supply || '',
      payment_terms: payment_terms || '',
      items, subtotal: subtotal || 0, cgst: cgst || 0, sgst: sgst || 0,
      igst: igst || 0, total: total || 0, round_off: round_off || 0,
      total_mrp: total_mrp || 0, discount: discount || 0,
      status: status || 'draft', reference_id: reference_id || null,
      reason: reason || '', notes: notes || '',
      created_at: now
    });

    res.json({ document: doc, message: DOC_TITLES[doc_type] + ' ' + doc_number + ' created!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update sale document
app.put('/api/sale-docs/:id', auth, async (req, res) => {
  try {
    const {
      doc_date, due_date, customer_name, customer_phone, customer_email,
      customer_address, customer_gstin, customer_state, place_of_supply, payment_terms,
      items, subtotal, cgst, sgst, igst, total, round_off, total_mrp, discount,
      notes, status, reference_id, reason
    } = req.body;

    const setData = {};
    if (doc_date !== undefined) setData.doc_date = doc_date;
    if (due_date !== undefined) setData.due_date = due_date;
    if (customer_name !== undefined) setData.customer_name = customer_name;
    if (customer_phone !== undefined) setData.customer_phone = customer_phone;
    if (customer_email !== undefined) setData.customer_email = customer_email;
    if (customer_address !== undefined) setData.customer_address = customer_address;
    if (customer_gstin !== undefined) setData.customer_gstin = customer_gstin;
    if (customer_state !== undefined) setData.customer_state = customer_state;
    if (place_of_supply !== undefined) setData.place_of_supply = place_of_supply;
    if (payment_terms !== undefined) setData.payment_terms = payment_terms;
    if (items !== undefined) setData.items = items;
    if (subtotal !== undefined) setData.subtotal = subtotal;
    if (cgst !== undefined) setData.cgst = cgst;
    if (sgst !== undefined) setData.sgst = sgst;
    if (igst !== undefined) setData.igst = igst;
    if (total !== undefined) setData.total = total;
    if (round_off !== undefined) setData.round_off = round_off;
    if (total_mrp !== undefined) setData.total_mrp = total_mrp;
    if (discount !== undefined) setData.discount = discount;
    if (notes !== undefined) setData.notes = notes;
    if (status !== undefined) setData.status = status;
    if (reference_id !== undefined) setData.reference_id = reference_id;
    if (reason !== undefined) setData.reason = reason;

    await saleDocuments.update({ id: req.params.id, user_id: req.user.id }, { $set: setData });
    const doc = await saleDocuments.findOne({ id: req.params.id });
    res.json({ document: doc, message: 'Document updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete sale document
app.delete('/api/sale-docs/:id', auth, async (req, res) => {
  try {
    const removed = await saleDocuments.remove({ id: req.params.id, user_id: req.user.id });
    if (removed === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Document deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Convert sale document to invoice
app.post('/api/sale-docs/:id/convert', auth, async (req, res) => {
  try {
    const doc = await saleDocuments.findOne({ id: req.params.id, user_id: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.status === 'converted') return res.status(400).json({ error: 'Already converted to invoice' });

    // Generate invoice number
    const count = await invoices.count({ user_id: req.user.id });
    const now = new Date();
    const invPrefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const invNum = String(count + 1).padStart(4, '0');
    const invoice_number = `${invPrefix}-${invNum}`;

    // Create invoice from document data
    const inv = await invoices.insert({
      user_id: req.user.id, invoice_number,
      invoice_date: now.toISOString().slice(0, 10),
      due_date: doc.due_date || '',
      customer_name: doc.customer_name,
      customer_phone: doc.customer_phone || '',
      customer_email: doc.customer_email || '',
      customer_address: doc.customer_address || '',
      customer_gstin: doc.customer_gstin || '',
      customer_state: doc.customer_state || '',
      place_of_supply: doc.place_of_supply || '',
      items: doc.items || [],
      subtotal: doc.subtotal || 0, cgst: doc.cgst || 0, sgst: doc.sgst || 0,
      igst: doc.igst || 0, total: doc.total || 0, round_off: doc.round_off || 0,
      total_mrp: doc.total_mrp || 0, discount: doc.discount || 0,
      amount_paid: 0, notes: doc.notes || '', status: 'unpaid',
      created_at: now
    });

    // Mark document as converted
    await saleDocuments.update({ id: doc.id }, {
      $set: { status: 'converted', reference_id: inv.id }
    });

    res.json({ invoice: inv, message: 'Converted to Invoice ' + invoice_number + '!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to convert document' });
  }
});

// ─── PAYMENTS IN ────────────────────────────────────────────

// List all payments-in
app.get('/api/payments-in', auth, async (req, res) => {
  try {
    const list = await paymentsIn.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json({ payments: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get single payment
app.get('/api/payments-in/:id', auth, async (req, res) => {
  try {
    const pay = await paymentsIn.findOne({ id: req.params.id, user_id: req.user.id });
    if (!pay) return res.status(404).json({ error: 'Payment not found' });
    res.json({ payment: pay });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Record payment-in (also updates invoice)
app.post('/api/payments-in', auth, async (req, res) => {
  try {
    const { invoice_id, party_name, party_id, amount, payment_date, payment_mode, reference_number, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    // Auto-generate payment number
    const now = new Date();
    const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await paymentsIn.count({ user_id: req.user.id });
    const num = String(count + 1).padStart(4, '0');
    const payment_number = `PAY-${monthStr}-${num}`;

    const pay = await paymentsIn.insert({
      user_id: req.user.id, payment_number,
      invoice_id: invoice_id || null,
      party_name: party_name || '',
      party_id: party_id || null,
      amount: amount,
      payment_date: payment_date || now.toISOString().slice(0, 10),
      payment_mode: payment_mode || 'cash',
      reference_number: reference_number || '',
      notes: notes || '',
      created_at: now
    });

    // Update invoice amount_paid and status if invoice_id provided
    if (invoice_id) {
      const inv = await invoices.findOne({ id: invoice_id, user_id: req.user.id });
      if (inv) {
        const newPaid = (inv.amount_paid || 0) + parseFloat(amount);
        const newStatus = newPaid >= inv.total ? 'paid' : 'partial';
        await invoices.update({ id: invoice_id }, {
          $set: { amount_paid: Math.round(newPaid * 100) / 100, status: newStatus }
        });
      }
    }

    res.json({ payment: pay, message: 'Payment ' + payment_number + ' recorded!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Delete payment-in (reverses invoice amount_paid)
app.delete('/api/payments-in/:id', auth, async (req, res) => {
  try {
    const pay = await paymentsIn.findOne({ id: req.params.id, user_id: req.user.id });
    if (!pay) return res.status(404).json({ error: 'Payment not found' });

    // Reverse invoice amount_paid
    if (pay.invoice_id) {
      const inv = await invoices.findOne({ id: pay.invoice_id, user_id: req.user.id });
      if (inv) {
        const newPaid = Math.max(0, (inv.amount_paid || 0) - (pay.amount || 0));
        const newStatus = newPaid <= 0 ? 'unpaid' : (newPaid >= inv.total ? 'paid' : 'partial');
        await invoices.update({ id: pay.invoice_id }, {
          $set: { amount_paid: Math.round(newPaid * 100) / 100, status: newStatus }
        });
      }
    }

    await paymentsIn.remove({ id: req.params.id, user_id: req.user.id });
    res.json({ message: 'Payment deleted and invoice updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// ─── PURCHASE DOCUMENTS (purchase_bill, purchase_order, purchase_return) ──

const PURCHASE_PREFIXES = { purchase_bill: 'PB', purchase_order: 'PO', purchase_return: 'PR' };
const PURCHASE_TITLES = { purchase_bill: 'Purchase Bill', purchase_order: 'Purchase Order', purchase_return: 'Purchase Return' };

// List
app.get('/api/purchase-docs', auth, async (req, res) => {
  try {
    const docType = req.query.type || 'purchase_bill';
    const list = await purchaseDocuments.find({ user_id: req.user.id, doc_type: docType }).sort({ created_at: -1 });
    res.json({ documents: list });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch documents' }); }
});

// List unpaid purchase bills (for payment-out form) — must be before /:id
app.get('/api/purchase-docs/unpaid', auth, async (req, res) => {
  try {
    const { pool } = require('./database');
    const partyName = req.query.party || '';
    let sql, params;
    if (partyName) {
      sql = `SELECT * FROM purchase_documents WHERE user_id = $1 AND doc_type = 'purchase_bill' AND status != 'paid' AND supplier_name ILIKE $2 ORDER BY created_at DESC`;
      params = [req.user.id, '%' + partyName + '%'];
    } else {
      sql = `SELECT * FROM purchase_documents WHERE user_id = $1 AND doc_type = 'purchase_bill' AND status != 'paid' ORDER BY created_at DESC`;
      params = [req.user.id];
    }
    const result = await pool.query(sql, params);
    const list = result.rows.map(r => {
      r._id = r.id;
      ['subtotal','total','amount_paid','discount'].forEach(k => { if (r[k] !== undefined && r[k] !== null) r[k] = parseFloat(r[k]); });
      if (typeof r.items === 'string') { try { r.items = JSON.parse(r.items); } catch(e) {} }
      return r;
    });
    res.json({ documents: list });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch unpaid bills' }); }
});

// Get one
app.get('/api/purchase-docs/:id', auth, async (req, res) => {
  try {
    const doc = await purchaseDocuments.findOne({ id: req.params.id, user_id: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: doc });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch document' }); }
});

// Create
app.post('/api/purchase-docs', auth, async (req, res) => {
  try {
    const {
      doc_type, doc_date, due_date, supplier_name, supplier_phone, supplier_email,
      supplier_address, supplier_gstin, supplier_state, place_of_supply, payment_terms,
      items, subtotal, cgst, sgst, igst, total, round_off, discount,
      notes, status, reference_id, reference_number
    } = req.body;
    if (!doc_type || !PURCHASE_PREFIXES[doc_type]) return res.status(400).json({ error: 'Invalid document type' });
    if (!supplier_name) return res.status(400).json({ error: 'Supplier name is required' });

    const { pool } = require('./database');
    const now = new Date();
    const prefix = PURCHASE_PREFIXES[doc_type];
    const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countRes = await pool.query(
      `SELECT COUNT(*) as cnt FROM purchase_documents WHERE user_id = $1 AND doc_type = $2 AND doc_number LIKE $3`,
      [req.user.id, doc_type, `${prefix}-${monthStr}-%`]
    );
    const num = String(parseInt(countRes.rows[0].cnt) + 1).padStart(4, '0');
    const doc_number = `${prefix}-${monthStr}-${num}`;

    const doc = await purchaseDocuments.insert({
      user_id: req.user.id, doc_type, doc_number,
      doc_date: doc_date || now.toISOString().slice(0, 10),
      due_date: due_date || null, supplier_name,
      supplier_phone: supplier_phone || '', supplier_email: supplier_email || '',
      supplier_address: supplier_address || '', supplier_gstin: supplier_gstin || '',
      supplier_state: supplier_state || '', place_of_supply: place_of_supply || '',
      payment_terms: payment_terms || '', items: items || [],
      subtotal: subtotal || 0, cgst: cgst || 0, sgst: sgst || 0,
      igst: igst || 0, total: total || 0, round_off: round_off || 0,
      discount: discount || 0, amount_paid: 0,
      status: status || 'unpaid', reference_id: reference_id || null,
      reference_number: reference_number || '', notes: notes || '', created_at: now
    });
    res.json({ document: doc, message: PURCHASE_TITLES[doc_type] + ' ' + doc_number + ' created!' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create document' }); }
});

// Update
app.put('/api/purchase-docs/:id', auth, async (req, res) => {
  try {
    const allowed = ['doc_date','due_date','supplier_name','supplier_phone','supplier_email',
      'supplier_address','supplier_gstin','supplier_state','place_of_supply','payment_terms',
      'items','subtotal','cgst','sgst','igst','total','round_off','discount','amount_paid',
      'notes','status','reference_id','reference_number'];
    const setData = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) setData[k] = req.body[k]; });
    await purchaseDocuments.update({ id: req.params.id, user_id: req.user.id }, { $set: setData });
    const doc = await purchaseDocuments.findOne({ id: req.params.id });
    res.json({ document: doc, message: 'Document updated' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update document' }); }
});

// Delete
app.delete('/api/purchase-docs/:id', auth, async (req, res) => {
  try {
    const removed = await purchaseDocuments.remove({ id: req.params.id, user_id: req.user.id });
    if (removed === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Document deleted' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete document' }); }
});

// Mark purchase bill as paid
app.patch('/api/purchase-docs/:id', auth, async (req, res) => {
  try {
    const { status, amount_paid } = req.body;
    await purchaseDocuments.update({ id: req.params.id, user_id: req.user.id },
      { $set: { status: status || 'unpaid', amount_paid: amount_paid || 0 } });
    const doc = await purchaseDocuments.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: doc, message: 'Document updated' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update document' }); }
});

// ─── PAYMENTS OUT ───────────────────────────────────────────

app.get('/api/payments-out', auth, async (req, res) => {
  try {
    const list = await paymentsOut.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json({ payments: list });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch payments' }); }
});

app.post('/api/payments-out', auth, async (req, res) => {
  try {
    const { purchase_id, party_name, party_id, amount, payment_date, payment_mode, reference_number, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const now = new Date();
    const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await paymentsOut.count({ user_id: req.user.id });
    const num = String(count + 1).padStart(4, '0');
    const payment_number = `POUT-${monthStr}-${num}`;

    const pay = await paymentsOut.insert({
      user_id: req.user.id, payment_number, purchase_id: purchase_id || null,
      party_name: party_name || '', party_id: party_id || null,
      amount, payment_date: payment_date || now.toISOString().slice(0, 10),
      payment_mode: payment_mode || 'cash', reference_number: reference_number || '',
      notes: notes || '', created_at: now
    });

    // Update purchase bill amount_paid if linked
    if (purchase_id) {
      const pdoc = await purchaseDocuments.findOne({ id: purchase_id, user_id: req.user.id });
      if (pdoc) {
        const newPaid = (pdoc.amount_paid || 0) + parseFloat(amount);
        const newStatus = newPaid >= pdoc.total ? 'paid' : 'partial';
        await purchaseDocuments.update({ id: purchase_id }, {
          $set: { amount_paid: Math.round(newPaid * 100) / 100, status: newStatus }
        });
      }
    }
    res.json({ payment: pay, message: 'Payment ' + payment_number + ' recorded!' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to record payment' }); }
});

app.delete('/api/payments-out/:id', auth, async (req, res) => {
  try {
    const pay = await paymentsOut.findOne({ id: req.params.id, user_id: req.user.id });
    if (!pay) return res.status(404).json({ error: 'Payment not found' });
    if (pay.purchase_id) {
      const pdoc = await purchaseDocuments.findOne({ id: pay.purchase_id, user_id: req.user.id });
      if (pdoc) {
        const newPaid = Math.max(0, (pdoc.amount_paid || 0) - (pay.amount || 0));
        const newStatus = newPaid <= 0 ? 'unpaid' : (newPaid >= pdoc.total ? 'paid' : 'partial');
        await purchaseDocuments.update({ id: pay.purchase_id }, {
          $set: { amount_paid: Math.round(newPaid * 100) / 100, status: newStatus }
        });
      }
    }
    await paymentsOut.remove({ id: req.params.id, user_id: req.user.id });
    res.json({ message: 'Payment deleted' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete payment' }); }
});


// ─── EXPENSES ───────────────────────────────────────────────

app.get('/api/expenses', auth, async (req, res) => {
  try {
    const list = await expenses.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json({ expenses: list });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch expenses' }); }
});

app.get('/api/expenses/:id', auth, async (req, res) => {
  try {
    const exp = await expenses.findOne({ id: req.params.id, user_id: req.user.id });
    if (!exp) return res.status(404).json({ error: 'Expense not found' });
    res.json({ expense: exp });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch expense' }); }
});

app.post('/api/expenses', auth, async (req, res) => {
  try {
    const { expense_date, category, description, amount, payment_mode, reference_number,
            party_name, gst_applicable, gst_amount, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const now = new Date();
    const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await expenses.count({ user_id: req.user.id });
    const num = String(count + 1).padStart(4, '0');
    const expense_number = `EXP-${monthStr}-${num}`;

    const exp = await expenses.insert({
      user_id: req.user.id, expense_number,
      expense_date: expense_date || now.toISOString().slice(0, 10),
      category: category || 'General', description: description || '',
      amount, payment_mode: payment_mode || 'cash',
      reference_number: reference_number || '', party_name: party_name || '',
      gst_applicable: gst_applicable || false, gst_amount: gst_amount || 0,
      notes: notes || '', created_at: now
    });
    res.json({ expense: exp, message: 'Expense ' + expense_number + ' recorded!' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to record expense' }); }
});

app.put('/api/expenses/:id', auth, async (req, res) => {
  try {
    const allowed = ['expense_date','category','description','amount','payment_mode',
      'reference_number','party_name','gst_applicable','gst_amount','notes'];
    const setData = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) setData[k] = req.body[k]; });
    await expenses.update({ id: req.params.id, user_id: req.user.id }, { $set: setData });
    const exp = await expenses.findOne({ id: req.params.id });
    res.json({ expense: exp, message: 'Expense updated' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update expense' }); }
});

app.delete('/api/expenses/:id', auth, async (req, res) => {
  try {
    const removed = await expenses.remove({ id: req.params.id, user_id: req.user.id });
    if (removed === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete expense' }); }
});

// ─── REPORTS ────────────────────────────────────────────────
app.get('/api/reports', auth, async (req, res) => {
  try {
    const { from, to, customer, status } = req.query;
    let allInvoices = await invoices.find({ user_id: req.user.id }).sort({ invoice_date: -1 });
    if (from || to) {
      allInvoices = allInvoices.filter(inv => {
        if (from && inv.invoice_date < from) return false;
        if (to && inv.invoice_date > to) return false;
        return true;
      });
    }
    if (customer) {
      const cLower = customer.toLowerCase();
      allInvoices = allInvoices.filter(inv => (inv.customer_name || '').toLowerCase().includes(cLower));
    }
    if (status) {
      allInvoices = allInvoices.filter(inv => inv.status === status);
    }
    const hsnMap = {};
    allInvoices.forEach(inv => {
      const isIntra = !inv.igst || inv.igst === 0;
      (inv.items || []).forEach(item => {
        const hsn = item.hsn || 'N/A';
        const key = hsn + '|' + (item.gst || 0);
        if (!hsnMap[key]) {
          hsnMap[key] = { hsn, gst_rate: item.gst || 0, taxable: 0, cgst_rate: 0, cgst: 0, sgst_rate: 0, sgst: 0, igst_rate: 0, igst: 0, total_tax: 0 };
        }
        const taxable = (item.qty || 0) * (item.rate || 0);
        const gstAmt = taxable * (item.gst || 0) / 100;
        hsnMap[key].taxable += taxable;
        if (isIntra) {
          hsnMap[key].cgst_rate = (item.gst || 0) / 2;
          hsnMap[key].sgst_rate = (item.gst || 0) / 2;
          hsnMap[key].cgst += gstAmt / 2;
          hsnMap[key].sgst += gstAmt / 2;
        } else {
          hsnMap[key].igst_rate = item.gst || 0;
          hsnMap[key].igst += gstAmt;
        }
        hsnMap[key].total_tax += gstAmt;
      });
    });
    const summary = {
      total_invoices: allInvoices.length,
      total_amount: allInvoices.reduce((s, i) => s + (i.total || 0), 0),
      total_tax: allInvoices.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0), 0),
      paid_amount: allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
      unpaid_amount: allInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0),
    };
    res.json({ invoices: allInvoices, summary, hsn_summary: Object.values(hsnMap) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ─── ADMIN ROUTES ───────────────────────────────────────────

// List all users (with search)
app.get('/api/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const { pool } = require('./database');
    let sql, params;
    if (q) {
      sql = `SELECT id, name, email, phone, business_name, role, created_at
             FROM users WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
             ORDER BY created_at DESC`;
      params = ['%' + q + '%'];
    } else {
      sql = `SELECT id, name, email, phone, business_name, role, created_at
             FROM users ORDER BY created_at DESC`;
      params = [];
    }
    const result = await pool.query(sql, params);
    res.json({ users: result.rows, total: result.rows.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user details + counts
app.get('/api/admin/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await users.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const invCount = await invoices.count({ user_id: req.params.id });
    const partyCount = await parties.count({ user_id: req.params.id });
    const productCount = await products.count({ user_id: req.params.id });
    const safe = safeUser(user);
    res.json({ user: safe, invoice_count: invCount, party_count: partyCount, product_count: productCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Edit user
app.put('/api/admin/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const { name, email, phone, role, business_name } = req.body;
    const setData = {};
    if (name !== undefined) setData.name = name;
    if (email !== undefined) setData.email = email;
    if (phone !== undefined) setData.phone = phone;
    if (role !== undefined) setData.role = role;
    if (business_name !== undefined) setData.business_name = business_name;
    if (!Object.keys(setData).length) return res.status(400).json({ error: 'No fields to update' });
    await users.update({ id: req.params.id }, { $set: setData });
    const user = await users.findOne({ id: req.params.id });
    res.json({ user: safeUser(user), message: 'User updated' });
  } catch (e) {
    console.error(e);
    if (e.code === '23505') return res.status(409).json({ error: 'Email or phone already in use' });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (cascades via FK)
app.delete('/api/admin/users/:id', auth, adminAuth, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const removed = await users.remove({ id: req.params.id });
    if (removed === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User and all their data deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── SPA fallback ────────────────────────────────────────────
app.get('/dashboard', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  Rupiya server running at http://localhost:${PORT}`);
    console.log(`  Dashboard: http://localhost:${PORT}/dashboard`);
    if (IS_DEV) console.log(`  [DEV MODE] OTPs will be logged here & returned in API responses\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err.message);
  console.error('Make sure PostgreSQL is running and DATABASE_URL is configured in .env');
  process.exit(1);
});
