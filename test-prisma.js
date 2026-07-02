const Database = require('better-sqlite3'); // This is the aliased SQLCipher-enabled driver
const path = require('path');

// 1. Create a wrapper class that automatically applies the decryption key on connection
class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    console.log(`🔐 [Interception] Injecting SQLCipher key for database: ${filename}`);
    this.pragma("key='my-super-secret-password'");
  }
}

// 2. Intercept the 'better-sqlite3' module in Node.js's require cache
const betterSqlite3Path = require.resolve('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

// 3. Now import the Prisma adapter and Client (they will transparently use our EncryptedDatabase class!)
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('./generated/prisma');

async function main() {
  console.log("-----------------------------------------");
  console.log("TEST: Accessing SQLCipher database through Prisma Client...");

  // Instantiate the Prisma adapter (it will call new EncryptedDatabase internally)
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("\nCreating a test Lead in the encrypted database...");
    const newLead = await prisma.lead.create({
      data: {
        name: "Akshay SQLCipher",
        email: "akshay@cipher.com",
        domain: "Cybersecurity",
        organization: "Prisma Secure Inc.",
        verified: true
      }
    });
    console.log("✅ Success! Created Lead in SQLCipher DB:", newLead);

    console.log("\nQuerying all Leads from the encrypted database...");
    const allLeads = await prisma.lead.findMany();
    console.log("✅ Success! All Leads from SQLCipher DB:", allLeads);

  } catch (error) {
    console.error("❌ Operations failed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("-----------------------------------------");
  }
}

main().catch(console.error);
