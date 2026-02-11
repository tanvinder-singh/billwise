const Datastore = require('nedb-promises');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

const users = Datastore.create({ filename: path.join(dataDir, 'users.db'), autoload: true });
const invoices = Datastore.create({ filename: path.join(dataDir, 'invoices.db'), autoload: true });
const otps = Datastore.create({ filename: path.join(dataDir, 'otps.db'), autoload: true });
const parties = Datastore.create({ filename: path.join(dataDir, 'parties.db'), autoload: true });
const products = Datastore.create({ filename: path.join(dataDir, 'products.db'), autoload: true });

// Unique indexes
users.ensureIndex({ fieldName: 'email', unique: true, sparse: true });
users.ensureIndex({ fieldName: 'phone', unique: true, sparse: true });

module.exports = { users, invoices, otps, parties, products };
