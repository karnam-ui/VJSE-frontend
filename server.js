const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

// 1. Intercept the 'better-sqlite3' connection to auto-inject the decryption key
class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    const key = process.env.SQLCIPHER_KEY || 'my-super-secret-password';
    console.log(`🔐 [Express SQLCipher] Authenticating database: ${filename}`);
    this.pragma(`key='${key}'`);
  }
}

const betterSqlite3Path = require.resolve('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

// 2. Import Prisma
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('./generated/prisma');

// 3. Initialize Express and Prisma
const app = express();
const PORT = process.env.PORT || 3000;

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// POST /api/login - Log in a user and verify credentials + domain constraints
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const lowerEmail = email.toLowerCase();
    
    // Resolve role based on email constraints
    let resolvedRole = 'Student';
    const ALLOWED_FOUNDER_EMAILS = [
      'founder@vnrvjiet.in',
      'founder2@vnrvjiet.in',
      'suhaas@vnrvjiet.in',
      'akshay@vnrvjiet.in'
    ];
    const ALLOWED_ADMIN_EMAILS = [
      'admin@gmail.com',
      'admin@vnrvjiet.in'
    ];

    if (ALLOWED_ADMIN_EMAILS.includes(lowerEmail)) {
      resolvedRole = 'Admin';
    } else if (ALLOWED_FOUNDER_EMAILS.includes(lowerEmail)) {
      resolvedRole = 'Founder';
    } else if (lowerEmail.endsWith('@vnrvjiet.in')) {
      if (lowerEmail.startsWith('volunteer')) {
        resolvedRole = 'Volunteer';
      } else {
        resolvedRole = 'Student';
      }
    } else {
      resolvedRole = 'Mentor';
    }

    // Check if user exists in DB
    let user = await prisma.user.findUnique({
      where: { email: lowerEmail }
    });

    if (!user) {
      // If user doesn't exist, auto-register them
      const derivedName = lowerEmail.split('@')[0].split(/[._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      user = await prisma.user.create({
        data: {
          email: lowerEmail,
          password: password,
          name: derivedName,
          role: resolvedRole
        }
      });
      console.log(`Auto-registered new user on login: ${user.name} (${resolvedRole})`);
    } else {
      // Verify password
      if (user.password !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Enforce email domain role mapping constraint (sync DB if mismatched)
      if (user.role !== resolvedRole) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: resolvedRole }
        });
        console.log(`Updated user ${user.email} role to ${resolvedRole} to match email constraints`);
      }
    }

    console.log(`User logged in: ${user.name} (${user.role})`);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "An unexpected error occurred during login" });
  }
});

// GET /api/leads - Retrieve all leads (optionally filter by domain or verified status)
app.get('/api/leads', async (req, res) => {
  try {
    const { domain, verified } = req.query;
    
    const where = {};
    if (domain) {
      where.domain = String(domain);
    }
    if (verified !== undefined) {
      where.verified = verified === 'true';
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(leads);
  } catch (error) {
    console.error("Error retrieving leads:", error);
    res.status(500).json({ error: "Failed to retrieve leads" });
  }
});

// POST /api/leads - Create a new lead
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, domain, organization } = req.body;

    if (!name || !email || !domain || !organization) {
      return res.status(400).json({ error: "Missing required fields (name, email, domain, organization)" });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        domain,
        organization,
        verified: false
      }
    });

    console.log("Created new lead in SQLCipher:", lead);
    res.status(201).json(lead);
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

// PATCH /api/leads/:id/verify - Update verification status of a lead
app.patch('/api/leads/:id/verify', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { verified } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }
    if (verified === undefined) {
      return res.status(400).json({ error: "Missing 'verified' property in body" });
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { 
        verified: Boolean(verified),
        status: Boolean(verified) ? "Approved" : "Pending"
      }
    });

    console.log("Updated lead verification status:", updatedLead);
    res.json(updatedLead);
  } catch (error) {
    console.error("Error updating lead verification:", error);
    res.status(500).json({ error: "Failed to update lead verification status" });
  }
});

// DELETE /api/leads/:id - Delete a lead
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    await prisma.lead.delete({
      where: { id }
    });

    console.log(`Deleted lead ID: ${id}`);
    res.json({ message: `Successfully deleted lead with ID ${id}` });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

// --- STARTUP PROFILE ENDPOINTS ---

// GET /api/startup - Get startup profile for a user
app.get('/api/startup', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    const profile = await prisma.startupProfile.findUnique({
      where: { userId: parseInt(userId) }
    });

    res.json(profile || null);
  } catch (error) {
    console.error("Error fetching startup profile:", error);
    res.status(500).json({ error: "Failed to fetch startup profile" });
  }
});

// POST /api/startup - Create or update startup profile
app.post('/api/startup', async (req, res) => {
  try {
    const { userId, name, stage, focus, currentGoal } = req.body;
    if (!userId || !name || !stage || !focus || !currentGoal) {
      return res.status(400).json({ error: "Missing required fields (userId, name, stage, focus, currentGoal)" });
    }

    const uId = parseInt(userId);
    const profile = await prisma.startupProfile.upsert({
      where: { userId: uId },
      update: { name, stage, focus, currentGoal },
      create: { userId: uId, name, stage, focus, currentGoal }
    });

    console.log("Upserted startup profile:", profile);
    res.json(profile);
  } catch (error) {
    console.error("Error saving startup profile:", error);
    res.status(500).json({ error: "Failed to save startup profile" });
  }
});


// --- APPROVED LEADS ENDPOINTS ---

// GET /api/approved-leads - Get verified/approved leads with filters
app.get('/api/approved-leads', async (req, res) => {
  try {
    const { domain, organization, skills } = req.query;

    const where = { verified: true };
    if (domain) {
      where.domain = String(domain);
    }
    if (organization) {
      where.organization = { contains: String(organization) };
    }

    let leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    if (skills) {
      const searchSkill = String(skills).toLowerCase();
      leads = leads.filter(l => l.skills.toLowerCase().includes(searchSkill));
    }

    res.json(leads);
  } catch (error) {
    console.error("Error fetching approved leads:", error);
    res.status(500).json({ error: "Failed to fetch approved leads" });
  }
});


// GET /api/connections - Retrieve connections (optionally filtered by userId)
app.get('/api/connections', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const where = {};
    if (userId) {
      where.userId = parseInt(userId);
    }

    const connections = await prisma.connectionRequest.findMany({
      where,
      include: { 
        lead: true,
        user: true // Include Founder details for Admin view
      }
    });

    res.json(connections);
  } catch (error) {
    console.error("Error retrieving connection requests:", error);
    res.status(500).json({ error: "Failed to retrieve connection requests" });
  }
});

// POST /api/connections - Send connection request to a lead
app.post('/api/connections', async (req, res) => {
  try {
    const { userId, leadId } = req.body;
    if (!userId || !leadId) {
      return res.status(400).json({ error: "Missing userId or leadId" });
    }

    const conn = await prisma.connectionRequest.upsert({
      where: {
        userId_leadId: {
          userId: parseInt(userId),
          leadId: parseInt(leadId)
        }
      },
      update: { status: "Pending" }, // Reset to pending if it exists
      create: {
        userId: parseInt(userId),
        leadId: parseInt(leadId),
        status: "Pending"
      }
    });

    console.log("Created connection request:", conn);
    res.status(201).json(conn);
  } catch (error) {
    console.error("Error sending connection request:", error);
    res.status(500).json({ error: "Failed to send connection request" });
  }
});

// PATCH /api/connections/:id - Update connection status (e.g. Mock accept)
app.patch('/api/connections/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Missing status" });
    }

    const updated = await prisma.connectionRequest.update({
      where: { id },
      data: { status }
    });

    console.log(`Updated connection request ${id} to status ${status}`);
    res.json(updated);
  } catch (error) {
    console.error("Error updating connection status:", error);
    res.status(500).json({ error: "Failed to update connection status" });
  }
});


// --- CHAT ENDPOINTS ---

// GET /api/chats - Get messages between founder and lead
app.get('/api/chats', async (req, res) => {
  try {
    const { userId, leadId } = req.query;
    if (!userId || !leadId) {
      return res.status(400).json({ error: "Missing userId or leadId query parameters" });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        userId: parseInt(userId),
        leadId: parseInt(leadId)
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

// POST /api/chats - Send a message and generate a mock response
app.post('/api/chats', async (req, res) => {
  try {
    const { userId, leadId, sender, content } = req.body;
    if (!userId || !leadId || !sender || !content) {
      return res.status(400).json({ error: "Missing required chat message fields" });
    }

    const message = await prisma.chatMessage.create({
      data: {
        userId: parseInt(userId),
        leadId: parseInt(leadId),
        sender,
        content
      }
    });

    console.log(`Saved chat message: ${sender} -> ${content}`);

    // If message is sent by the Founder, generate a mock response from the Lead after a brief delay
    if (sender === "Founder") {
      setTimeout(async () => {
        try {
          const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
          const startup = await prisma.startupProfile.findUnique({ where: { userId: parseInt(userId) } });
          
          let responseContent = "Thanks for reaching out! Let's connect and discuss this further.";
          
          const lowerContent = content.toLowerCase();
          if (lowerContent.includes("pilot") || lowerContent.includes("partnership")) {
            responseContent = `I'd love to learn more about a pilot partnership with ${startup ? startup.name : "your startup"}. What timeline are you thinking?`;
          } else if (lowerContent.includes("advisory") || lowerContent.includes("advice") || lowerContent.includes("feedback")) {
            responseContent = `Sure, I'd be happy to provide some feedback on your product or advise your team on ${startup ? startup.focus : "your industry"}. Let's set up a call.`;
          } else if (lowerContent.includes("hello") || lowerContent.includes("hi")) {
            responseContent = `Hello! How can I help you and ${startup ? startup.name : "your startup"} today?`;
          }

          await prisma.chatMessage.create({
            data: {
              userId: parseInt(userId),
              leadId: parseInt(leadId),
              sender: "Lead",
              content: responseContent
            }
          });
          console.log(`Sent mock Lead reply: ${responseContent}`);
        } catch (err) {
          console.error("Error generating mock Lead response:", err);
        }
      }, 1500); // 1.5 second delay for real-time feel
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending chat message:", error);
    res.status(500).json({ error: "Failed to send chat message" });
  }
});

// --- VOLUNTEER REVIEW ENDPOINTS ---

// PATCH /api/leads/:id/approve - Approve a lead submission
app.patch('/api/leads/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        verified: true,
        status: "Approved",
        rejectionReason: "" // clear rejection reason
      }
    });

    console.log(`Lead ID ${id} approved by volunteer`);
    res.json(updated);
  } catch (error) {
    console.error("Error approving lead:", error);
    res.status(500).json({ error: "Failed to approve lead" });
  }
});

// PATCH /api/leads/:id/reject - Reject a lead submission with a written reason
app.patch('/api/leads/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }
    if (!reason) {
      return res.status(400).json({ error: "Missing rejection reason" });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        verified: false,
        status: "Rejected",
        rejectionReason: reason
      }
    });

    console.log(`Lead ID ${id} rejected by volunteer. Reason: ${reason}`);
    res.json(updated);
  } catch (error) {
    console.error("Error rejecting lead:", error);
    res.status(500).json({ error: "Failed to reject lead" });
  }
});

// POST /api/leads/:id/invite - Send email invitation to approved lead
app.post('/api/leads/:id/invite', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    if (lead.status !== "Approved") {
      return res.status(400).json({ error: "Only approved leads can be invited" });
    }

    // Simulate sending email invitation
    console.log(`\n✉️  [EMAIL INVITE SENT]`);
    console.log(`To: ${lead.name} <${lead.email}>`);
    console.log(`Subject: Invitation to join VJ Startups Platform`);
    console.log(`Body: Hello ${lead.name},\nWe are pleased to invite you to join the VJ Startups Platform as an approved mentor/lead for ${lead.domain}. Register today to connect with active student founders!\n`);

    const updated = await prisma.lead.update({
      where: { id },
      data: { invited: true }
    });

    res.json({ message: "Invite sent successfully", lead: updated });
  } catch (error) {
    console.error("Error sending invite:", error);
    res.status(500).json({ error: "Failed to send invitation" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Express API server running on http://localhost:${PORT}`);
  console.log(`📂 Connected to SQLCipher-encrypted SQLite DB (dev.db)`);
});
