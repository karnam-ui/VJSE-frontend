const Database = require('better-sqlite3');
const path = require('path');

// Wrap better-sqlite3 with the SQLCipher key wrapper
class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    const key = process.env.SQLCIPHER_KEY || 'my-super-secret-password';
    this.pragma(`key='${key}'`);
  }
}

const betterSqlite3Path = require.resolve('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('./generated/prisma');

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  try {
    const table = process.argv[2];

    if (!table) {
      console.log("\n📁 AVAILABLE TABLES IN DATABASE:");
      console.log("--------------------------------");
      console.log("1. users          (Run: node view-db.js users)");
      console.log("2. leads          (Run: node view-db.js leads)");
      console.log("3. startups       (Run: node view-db.js startups)");
      console.log("4. connections    (Run: node view-db.js connections)");
      console.log("5. chat           (Run: node view-db.js chat)");
      console.log("\nOr run 'node view-db.js all' to print all tables.");
      return;
    }

    if (table === 'users' || table === 'all') {
      console.log("\n=== USERS ===");
      const users = await prisma.user.findMany();
      if (users.length === 0) {
        console.log("(No users found)");
      } else {
        console.table(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
      }
    }

    if (table === 'leads' || table === 'all') {
      console.log("\n=== LEADS ===");
      const leads = await prisma.lead.findMany();
      if (leads.length === 0) {
        console.log("(No leads found)");
      } else {
        console.table(leads.map(l => ({ id: l.id, name: l.name, email: l.email, domain: l.domain, verified: l.verified, status: l.status })));
      }
    }

    if (table === 'startups' || table === 'all') {
      console.log("\n=== STARTUP PROFILES ===");
      const startups = await prisma.startupProfile.findMany();
      if (startups.length === 0) {
        console.log("(No startup profiles found)");
      } else {
        console.table(startups);
      }
    }

    if (table === 'connections' || table === 'all') {
      console.log("\n=== CONNECTION REQUESTS ===");
      const connections = await prisma.connectionRequest.findMany();
      if (connections.length === 0) {
        console.log("(No connection requests found)");
      } else {
        console.table(connections);
      }
    }

    if (table === 'chat' || table === 'all') {
      console.log("\n=== CHAT MESSAGES ===");
      const messages = await prisma.chatMessage.findMany();
      if (messages.length === 0) {
        console.log("(No chat messages found)");
      } else {
        console.table(messages);
      }
    }

  } catch (error) {
    console.error("❌ Error reading database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
