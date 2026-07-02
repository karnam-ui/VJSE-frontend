require('dotenv').config();
const Database = require('better-sqlite3-multiple-ciphers');

console.log("Opening dev.db...");
const db = new Database('dev.db');

const key = process.env.SQLCIPHER_KEY || 'my-super-secret-password';
console.log(`Setting encryption key to '${key}'...`);
// For a new unencrypted database, key is empty. Setting rekey encrypts it.
db.pragma(`rekey='${key}'`);

console.log("Closing database...");
db.close();
console.log("dev.db has been successfully encrypted with SQLCipher!");
