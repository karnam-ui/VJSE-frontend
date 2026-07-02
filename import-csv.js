require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 1. Intercept better-sqlite3 with the custom encryption wrapper
class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    const key = process.env.SQLCIPHER_KEY || 'my-super-secret-password';
    console.log(`🔐 [Importer] Authenticating database: ${filename}`);
    this.pragma(`key='${key}'`);
  }
}

const betterSqlite3Path = require.resolve('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

// 2. Import Prisma
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('./generated/prisma');

async function importCsv(csvFileName) {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  const csvPath = path.join(__dirname, csvFileName);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: CSV file not found at ${csvPath}`);
    console.log("\nPlease create a CSV file with the following header format:\n");
    console.log("name,email,domain,organization,verified");
    console.log("John Doe,john@example.com,FinTech,Acme Corp,true");
    return;
  }

  console.log(`Reading CSV file: ${csvFileName}...`);
  const fileContent = fs.readFileSync(csvPath, 'utf8');
  
  // Split lines and filter empty lines
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length <= 1) {
    console.log("⚠️ The CSV file is empty or only contains the header.");
    return;
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Map rows
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < header.length) continue; // skip incomplete rows
    
    const record = {};
    header.forEach((colName, index) => {
      let val = values[index];
      // Convert boolean string to actual boolean
      if (colName === 'verified') {
        val = val.toLowerCase() === 'true' || val === '1';
      }
      record[colName] = val;
    });
    records.push(record);
  }

  console.log(`Parsed ${records.length} records. Importing to SQLCipher database...`);

  let successCount = 0;
  try {
    for (const record of records) {
      // Validate minimal fields
      if (!record.name || !record.email) {
        console.warn(`⚠️ Skipping row with missing name or email:`, record);
        continue;
      }

      await prisma.lead.create({
        data: {
          name: record.name,
          email: record.email,
          domain: record.domain || "Other",
          organization: record.organization || "Independent",
          verified: record.verified || false
        }
      });
      successCount++;
    }
    console.log(`🎉 Successfully imported ${successCount} leads into the encrypted database!`);
  } catch (error) {
    console.error("❌ Import failed midway due to error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Read CSV file name from command line arguments or default to 'leads-import.csv'
const targetFile = process.argv[2] || 'leads-import.csv';
importCsv(targetFile);
