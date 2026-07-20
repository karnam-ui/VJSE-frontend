require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

// 1. Intercept better-sqlite3 with the custom encryption wrapper
class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    const key = process.env.SQLCIPHER_KEY || 'my-super-secret-password';
    console.log(`🔐 [Seeder] Authenticating database: ${filename}`);
    this.pragma(`key='${key}'`);
  }
}

const betterSqlite3Path = require.resolve('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

// 2. Import Prisma
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('./generated/prisma');

async function seed() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  console.log("Starting database seeding for user accounts...");

  const demoUsers = [
    {
      name: "Rohan Kumar",
      email: "student@vnrvjiet.in",
      password: "student123",
      role: "Student"
    },
    {
      name: "Anjali Dev",
      email: "volunteer@vnrvjiet.in",
      password: "volunteer123",
      role: "Volunteer"
    },
    {
      name: "Kabir Mehta",
      email: "founder@vnrvjiet.in",
      password: "founder123",
      role: "Founder"
    },
    {
      name: "Suresh Menon",
      email: "lead@gmail.com",
      password: "lead123",
      role: "Mentor"
    },
    {
      name: "Karnam Suhaas",
      email: "karnamsuhaas@gmail.com",
      password: "VJSEeco@2026",
      role: "Admin"
    },
    {
      name: "Shubham",
      email: "shubham202098@gmail.com",
      password: "VJSEeco@2026",
      role: "Admin"
    },
    {
      name: "Akshay Nerella",
      email: "akshaynerella9@gmail.com",
      password: "VJSEeco@2026",
      role: "Admin"
    }
  ];

  try {
    for (const u of demoUsers) {
      const existing = await prisma.user.findUnique({
        where: { email: u.email }
      });

      if (!existing) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        const created = await prisma.user.create({ 
          data: {
            ...u,
            password: hashedPassword
          } 
        });
        console.log(`✅ Seeded ${u.role}: ${u.email}`);
      } else {
        console.log(`ℹ️ User ${u.email} already exists.`);
      }
    }
    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
