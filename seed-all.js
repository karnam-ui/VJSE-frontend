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

  console.log("Starting comprehensive seeding...");

  try {
    // Clean up existing tables to prevent unique constraint errors in seed
    console.log("Cleaning up tables...");
    await prisma.chatMessage.deleteMany();
    await prisma.connectionRequest.deleteMany();
    await prisma.startupProfile.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();

    // 1. Seed Users
    const usersData = [
      { name: "Rohan Kumar", email: "student@vnrvjiet.in", password: "student123", role: "Student" },
      { name: "Anjali Dev", email: "volunteer@vnrvjiet.in", password: "volunteer123", role: "Volunteer" },
      { name: "Kabir Mehta", email: "founder@vnrvjiet.in", password: "founder123", role: "Founder" },
      { name: "Suresh Menon", email: "lead@gmail.com", password: "lead123", role: "Mentor" },
      { name: "Karnam Suhaas", email: "karnamsuhaas@gmail.com", password: "VJSEeco@2026", role: "Admin" },
      { name: "Shubham", email: "shubham202098@gmail.com", password: "VJSEeco@2026", role: "Admin" },
      { name: "Akshay Nerella", email: "akshaynerella9@gmail.com", password: "VJSEeco@2026", role: "Admin" }
    ];

    const users = {};
    for (const u of usersData) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      const created = await prisma.user.create({ 
        data: {
          ...u,
          password: hashedPassword
        } 
      });
      users[u.email] = created;
      console.log(`✅ Seeded User (${u.role}): ${u.email}`);
    }

    // 2. Seed Leads
    const leadsData = [
      { name: "Rakesh Menon", email: "rakesh@globallogic.com", domain: "EdTech", organization: "GlobalLogic", skills: "Advisory, Early Feedback", verified: true, status: "Approved" },
      { name: "Sneha Bhat", email: "sneha@brightbridge.com", domain: "HealthTech", organization: "BrightBridge Labs", skills: "Pilot Partnership, Product Demo", verified: false, status: "Pending" },
      { name: "Arjun Verma", email: "arjun@iiit.ac.in", domain: "EdTech", organization: "IIIT Hyderabad", skills: "Advisory, Early Feedback", verified: true, status: "Approved" },
      { name: "Neha Sinha", email: "neha@lti.com", domain: "FinTech", organization: "LTI Mindtree", skills: "Product Demo, Advisory", verified: true, status: "Approved" },
      { name: "Priyanka Rao", email: "priyanka@apollo.com", domain: "HealthTech", organization: "Apollo Hospitals", skills: "Pilot Partnership, Advisory", verified: true, status: "Approved" },
      { name: "Vikram Joshi", email: "vikram@eventhive.com", domain: "Events", organization: "EventHive", skills: "Product Demo, Advisory", verified: true, status: "Approved" },
      { name: "Divya Patel", email: "divya@patel.com", domain: "RetailTech", organization: "Patel Consulting", skills: "Early Feedback, Advisory", verified: false, status: "Pending" },
      { name: "Kabir Shah", email: "kabir@farmchain.com", domain: "AgriTech", organization: "FarmChain", skills: "Pilot Partnership, Advisory", verified: true, status: "Approved" },
      { name: "Neelam Gupta", email: "neelam@bits.ac.in", domain: "EdTech", organization: "BITS Pilani", skills: "Advisory, Early Feedback", verified: true, status: "Approved" },
      { name: "Amit Desai", email: "amit@google.com", domain: "FinTech", organization: "Google India", skills: "Pilot Partnership, Advisory", verified: false, status: "Pending" }
    ];

    const leads = {};
    for (const l of leadsData) {
      const created = await prisma.lead.create({ data: l });
      leads[l.email] = created;
      console.log(`✅ Seeded Lead: ${l.name} (${l.verified ? 'Verified' : 'Pending'})`);
    }

    // 3. Seed StartupProfiles
    const startupsData = [
      { userId: users["founder@vnrvjiet.in"].id, name: "VentureSpark", stage: "MVP", focus: "EdTech", currentGoal: "Find pilot partners and advisory in EdTech." }
    ];

    for (const s of startupsData) {
      await prisma.startupProfile.create({ data: s });
      console.log(`✅ Seeded Startup Profile for User ID: ${s.userId}`);
    }

    // 4. Seed ConnectionRequests
    // Let's create a pending request to Rakesh Menon, and an accepted one to Arjun Verma (from Kabir)
    const req1 = await prisma.connectionRequest.create({
      data: {
        userId: users["founder@vnrvjiet.in"].id,
        leadId: leads["rakesh@globallogic.com"].id,
        status: "Pending"
      }
    });
    console.log(`✅ Seeded ConnectionRequest (Pending)`);

    const req2 = await prisma.connectionRequest.create({
      data: {
        userId: users["founder@vnrvjiet.in"].id,
        leadId: leads["arjun@iiit.ac.in"].id,
        status: "Accepted"
      }
    });
    console.log(`✅ Seeded ConnectionRequest (Accepted)`);

    // 5. Seed ChatMessages
    const chatsData = [
      {
        userId: users["founder@vnrvjiet.in"].id,
        leadId: leads["arjun@iiit.ac.in"].id,
        sender: "Founder",
        content: "Hi Arjun, thanks for accepting my connection request!"
      },
      {
        userId: users["founder@vnrvjiet.in"].id,
        leadId: leads["arjun@iiit.ac.in"].id,
        sender: "Lead",
        content: "Hello Kabir! Happy to connect. I see you are working on VentureSpark. How can I help you today?"
      },
      {
        userId: users["founder@vnrvjiet.in"].id,
        leadId: leads["arjun@iiit.ac.in"].id,
        sender: "Founder",
        content: "We're looking for feedback on our core learning algorithm. Since you're at IIIT-H, your advisory would be invaluable."
      }
    ];

    for (const c of chatsData) {
      await prisma.chatMessage.create({ data: c });
    }
    console.log(`✅ Seeded Chat Messages`);

    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
