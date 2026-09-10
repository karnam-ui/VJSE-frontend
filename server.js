require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { OAuth2Client } = require('google-auth-library');
const { sendLeadInviteEmail, sendSourcerNotificationEmail, sendWelcomeEmail, sendLeadPlatformInviteEmail } = require('./mailer');

const Database = require('better-sqlite3');

// 1. Intercept the 'better-sqlite3' connection to auto-inject the decryption key and set up pragmas
class EncryptedDatabase extends Database {
  constructor(filename, options) {
    super(filename, options);
    const key = process.env.DB_ENCRYPTION_KEY;
    if (!key) throw new Error('FATAL: DB_ENCRYPTION_KEY environment variable is required');
    console.log(`[Express SQLCipher] Authenticating database: ${filename}`);
    this.pragma("cipher='sqlcipher'");
    this.pragma(`key='${key}'`);
    // Enable WAL mode and busy_timeout for concurrency
    this.pragma('journal_mode=WAL');
    this.pragma('busy_timeout=5000');
  }
}

const betterSqlite3Path = require.resolve('better-sqlite3');
require.cache[betterSqlite3Path].exports = EncryptedDatabase;

const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('./generated/prisma');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const realPrisma = new PrismaClient({ adapter });

// 2. Import Mock Prisma
const mockPrisma = require('./mock-prisma');

// Use Real DB if USE_REAL_DB=true
const useRealDb = process.env.USE_REAL_DB === 'true';
const prisma = useRealDb ? realPrisma : mockPrisma;

if (useRealDb) {
  console.log(`[Express] Using REAL database with SQLCipher encryption.`);
} else {
  console.log(`[Express] WARNING: Using in-memory mock database.`);
}

// 3. Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Load Passport Configuration
require('./passport')(prisma);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [
  FRONTEND_URL,
  FRONTEND_URL.replace('localhost', '127.0.0.1'),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
];

// --- SECURITY MIDDLEWARE ---
app.use(helmet());
app.use(compression());

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// --- RATE LIMITERS ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,                    // 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 login attempts per 15 min
  message: { error: 'Too many login attempts. Please try again later.' },
  skipSuccessfulRequests: true,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,                    // 10 email-triggering requests per hour per IP
  message: { error: 'Too many requests. Please try again later.' },
});

// Configure Sessions and Passport Middlewares
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret === 'a-fallback-session-secret' || sessionSecret === 'a-secure-random-session-secret-key') {
  console.error('WARNING: SESSION_SECRET is weak or missing. Generate a strong random secret for production.');
}

app.use(session({
  secret: sessionSecret || 'dev-only-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    httpOnly: true,                                   // Prevent JS access to cookie
    sameSite: 'lax',                                  // CSRF protection
    maxAge: 24 * 60 * 60 * 1000,                      // 24 hour expiry
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Log incoming requests with timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// --- AUTHENTICATION & AUTHORIZATION MIDDLEWARE ---
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user && !(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userRole = req.session?.user?.role || req.user?.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Google OAuth token verification (cryptographically verified)
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (e) {
    console.error('Google token verification failed:', e.message);
    return null;
  }
}

// Utility to normalize Gmail addresses by removing dots
function normalizeEmail(email) {
  if (!email) return '';
  const lower = email.toLowerCase().trim();
  if (lower.endsWith('@gmail.com')) {
    const parts = lower.split('@');
    const local = parts[0].replace(/\./g, '');
    return local + '@gmail.com';
  }
  return lower;
}

// --- LOCAL MOCK AUTHENTICATION APIS ---

// GET /api/config - Return Google Client ID dynamically
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    frontendUrl: FRONTEND_URL,
  });
});

app.post('/api/chat/token', async (req, res) => {
  try {
    const { userId, userName } = req.body;
    if (!userId || !userName) {
      return res.status(400).json({ error: 'userId and userName are required' });
    }
    const serverClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY,
      process.env.STREAM_API_SECRET
    );
    await serverClient.upsertUser({ id: userId, name: userName, role: 'user' });
    const token = serverClient.createToken(userId);
    res.json({ token });
  } catch (err) {
    console.error('Stream token error:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// GET /health - Health check with DB connectivity test
app.get('/health', async (req, res) => {
  try {
    // Verify database is responsive
    await prisma.user.count();
    res.json({ ok: true, db: 'connected', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'disconnected', uptime: process.uptime() });
  }
});

// POST /auth/google - Authenticate Google ID token (cryptographically verified)
app.post('/auth/google', authLimiter, async (req, res) => {
  try {
    const token = req.body.token || req.body.idToken || req.body.credential;
    if (!token) {
      return res.status(400).json({ error: "Missing Google ID token" });
    }

    const profile = await verifyGoogleToken(token);
    if (!profile || !profile.email) {
      return res.status(401).json({ error: "Invalid or expired Google ID token" });
    }

    const email = profile.email;
    const normalized = normalizeEmail(email);
    
    console.log("Verified Google profile for:", profile.email);

    if (!profile.sub) {
      return res.status(400).json({ error: "Invalid Google ID token: Missing subject (sub) identifier" });
    }

    // 1. Check if user already has their googleId linked
    let user = await prisma.user.findUnique({
      where: { googleId: profile.sub },
    });

    if (!user) {
      // 2. Otherwise, check if user exists by email but isn't linked to Google yet
      user = await prisma.user.findUnique({
        where: { email: normalized },
      });

      if (user) {
        // Link the googleId to the existing account
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.sub },
        });
        console.log(`🔗 Linked Google authentication to existing user: ${user.email}`);
      } else {
        // 3. Auto-resolve role
        let resolvedRole = 'Mentor';
        if (
          normalized === 'karnamsuhaas@gmail.com' ||
          normalized === 'suhaaskarnam@gmail.com' ||
          normalized === 'shubham202098@gmail.com' ||
          normalized === 'akshaynerella9@gmail.com'
        ) {
          resolvedRole = 'Admin';
        } else if (normalized === 'founder@vnrvjiet.in') {
          resolvedRole = 'Founder';
        } else if (normalized.endsWith('@vnrvjiet.in')) {
          const prefix = normalized.split('@')[0];
          if (prefix.startsWith('volunteer')) {
            resolvedRole = 'Volunteer';
          } else {
            resolvedRole = 'Student';
          }
        }

        // 4. Create the new user record
        user = await prisma.user.create({
          data: {
            email: normalized,
            name: profile.name || 'VJ User',
            role: resolvedRole,
            googleId: profile.sub,
          },
        });
        console.log(`🆕 Auto-registered new Google user: ${user.name} (${user.role})`);
      }
    }

    // Fix 4 — Block suspended users before session creation
    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact the VJ Startups team.' });
    }

    // Save user details to the session
    req.session.user = {
      id: user.id,
      name: user.name,
      fullName: user.name,
      email: user.email,
      role: user.role,
      profileCompleted: Boolean(user.profileCompleted)
    };

    res.json({ user: req.session.user });
  } catch (error) {
    console.error("Error in /auth/google:", error);
    res.status(500).json({ error: "Authentication failed. Please try again." });
  }
});

// GET /check-auth - Verify existing session (always fetch fresh from DB)
app.get('/check-auth', async (req, res) => {
  if (req.session && req.session.user) {
    try {
      const freshUser = await prisma.user.findUnique({
        where: { id: req.session.user.id }
      });
      if (freshUser) {
        // Refresh the session with latest DB data
        req.session.user = {
          id: freshUser.id,
          name: freshUser.name,
          email: freshUser.email,
          role: freshUser.role,
          profileCompleted: freshUser.profileCompleted,
          hasSeenWelcome: freshUser.hasSeenWelcome,
          hasLinkedAccount: freshUser.hasLinkedAccount
        };
        return res.json({ user: req.session.user });
      }
    } catch (err) {
      console.error('Error refreshing session from DB:', err);
    }
  }
  res.status(401).json({ error: "Not authenticated" });
});

// POST /logout - Destroy local session
app.post('/logout', (req, res) => {
  req.session.user = null;
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to log out" });
    }
    res.clearCookie('connect.sid');
    res.json({ message: "Successfully logged out" });
  });
});

// --- GOOGLE OAUTH ROUTES ---

// GET /auth/google - Trigger Google Authentication
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// GET /auth/google/callback - Google Redirect Destination
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Redirect to the frontend application dashboard upon successful login
    res.redirect('http://localhost:5173/');
  }
);

// GET /api/current-user - Retrieve session user info
app.get('/api/current-user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// POST /api/logout - Log out and destroy session
app.post('/api/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.json({ message: "Successfully logged out" });
  });
});

// POST /api/login - Log in user or auto-signup new @vnrvjiet.in accounts
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalized = normalizeEmail(email);

    // Check if user exists in DB
    let user = await prisma.user.findUnique({
      where: { email: normalized }
    });

    if (user) {
      // User exists - check if blacklisted
      if (user.isBlocked) {
        return res.status(403).json({ error: "Your account has been blacklisted. Please contact an Admin." });
      }

      // Check password (bcrypt only — no plaintext fallback)
      if (user.password) {
        let passwordMatch = false;
        try {
          passwordMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
          passwordMatch = false;
        }
        if (!passwordMatch) {
          return res.status(401).json({ error: "Invalid email or password" });
        }
      }
    } else {
      // User does NOT exist in DB - check if @vnrvjiet.in or eligible domain for auto-signup
      if (normalized.endsWith("@vnrvjiet.in") || normalized.endsWith("@gmail.com")) {
        let resolvedRole = 'Mentor';
        if (
          normalized === 'karnamsuhaas@gmail.com' ||
          normalized === 'suhaaskarnam@gmail.com' ||
          normalized === 'akshaynerella9@gmail.com'
        ) {
          resolvedRole = 'Admin';
        } else if (normalized === 'founder@vnrvjiet.in') {
          resolvedRole = 'Founder';
        } else if (normalized.endsWith('@vnrvjiet.in')) {
          const prefix = normalized.split('@')[0];
          if (prefix.startsWith('volunteer')) {
            resolvedRole = 'Volunteer';
          } else {
            resolvedRole = 'Student';
          }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const namePrefix = normalized.split('@')[0];
        const formattedName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);

        user = await prisma.user.create({
          data: {
            email: normalized,
            password: hashedPassword,
            name: formattedName,
            role: resolvedRole,
          }
        });
        console.log(`🆕 Auto-registered new account on first login: ${user.name} (${user.email}) as ${user.role}`);
      } else {
        return res.status(401).json({ error: "Invalid email or password" });
      }
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      fullName: user.name,
      email: user.email,
      role: user.role,
      profileCompleted: Boolean(user.profileCompleted)
    };

    console.log(`User logged in: ${user.name} (${user.role}) - profileCompleted: ${Boolean(user.profileCompleted)}`);
    res.json({ user: req.session.user });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "An unexpected error occurred during login" });
  }
});

// POST /api/users/complete-profile — Student fills in phone, year, branch on first login
app.post('/api/users/complete-profile', requireAuth, async (req, res) => {
  try {
    const { phone, year, branch } = req.body;
    const userId = req.session?.user?.id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required. Please log in again.' });
    }

    if (!phone || !year || !branch) {
      return res.status(400).json({ error: 'Phone, year, and branch are required.' });
    }

    // Phone validation
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        phone: phone.trim(),
        year: year.trim(),
        branch: branch.trim(),
        profileCompleted: true
      }
    });

    const sessionPayload = {
      id: updatedUser.id,
      name: updatedUser.name,
      fullName: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profileCompleted: true
    };

    if (req.session) {
      req.session.user = sessionPayload;
    }
    if (req.user) {
      req.user = { ...req.user, ...sessionPayload };
    }

    console.log(`Profile completed for user: ${updatedUser.name} (${updatedUser.email})`);
    res.json({ message: 'Profile completed successfully', user: sessionPayload });
  } catch (error) {
    console.error('Error completing profile:', error);
    res.status(500).json({ error: 'Failed to complete profile. Please try again.' });
  }
});

// GET /api/leads - Retrieve all leads (optionally filter by domain or verified status)
app.get('/api/leads', requireAuth, async (req, res) => {
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
      orderBy: { createdAt: 'desc' },
      include: {
        sourcer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            year: true,
            branch: true,
            rejectionCount: true,
            isBlocked: true
          }
        },
        approvedByVolunteer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(leads);
  } catch (error) {
    console.error("Error retrieving leads:", error);
    res.status(500).json({ error: "Failed to retrieve leads" });
  }
});

// POST /api/leads - Create a new lead
app.post('/api/leads', requireAuth, async (req, res) => {
  try {
    const { name, email, domain, organization, city, skills, sourcerId } = req.body;

    if (!name || !email || !domain || !organization) {
      return res.status(400).json({ error: "Missing required fields (name, email, domain, organization)" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const sId = sourcerId ? parseInt(sourcerId) : (req.session?.user?.id ? parseInt(req.session.user.id) : null);

    const lead = await prisma.lead.create({
      data: {
        name,
        email: normalizedEmail,
        domain,
        organization,
        city: city || '',
        skills: skills || '',
        verified: false,
        sourcerId: sId
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
app.patch('/api/leads/:id/verify', requireRole('Admin', 'Volunteer'), async (req, res) => {
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
app.delete('/api/leads/:id', requireRole('Admin', 'Volunteer'), async (req, res) => {
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

// --- MENTOR APIS ---

// POST /api/users/link-mentor-account
// Called when mentor logs in and confirms their lead record matches them
app.post('/api/users/link-mentor-account', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { leadId, confirmed } = req.body;

    if (!leadId || confirmed === undefined) {
      return res.status(400).json({ error: 'leadId and confirmed are required' });
    }

    if (!confirmed) {
      return res.json({ linked: false, message: 'Account not linked' });
    }

    // Link lead record to user account
    await prisma.lead.update({
      where: { id: parseInt(leadId) },
      data: { mentorUserId: userId }
    });

    // Mark user as having linked their account
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { hasLinkedAccount: true }
    });

    req.session.user = {
      ...req.session.user,
      hasLinkedAccount: true
    };

    console.log(`Mentor account linked: userId=${userId} leadId=${leadId}`);
    res.json({ linked: true, user: req.session.user });
  } catch (error) {
    console.error('Error linking mentor account:', error);
    res.status(500).json({ error: 'Failed to link account' });
  }
});

// GET /api/users/check-mentor-match
// Checks if logged in user email matches any lead record
app.get('/api/users/check-mentor-match', requireAuth, async (req, res) => {
  try {
    const userEmail = req.session.user.email;

    const matchedLead = await prisma.lead.findFirst({
      where: {
        email: userEmail,
        mentorUserId: null
      },
      include: {
        sourcer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            year: true,
            branch: true
          }
        }
      }
    });

    res.json({ matched: !!matchedLead, lead: matchedLead || null });
  } catch (error) {
    console.error('Error checking mentor match:', error);
    res.status(500).json({ error: 'Failed to check mentor match' });
  }
});

// POST /api/users/mark-welcome-seen
app.post('/api/users/mark-welcome-seen', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    await prisma.user.update({
      where: { id: userId },
      data: { hasSeenWelcome: true }
    });
    req.session.user = { ...req.session.user, hasSeenWelcome: true };
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking welcome seen:', error);
    res.status(500).json({ error: 'Failed to mark welcome seen' });
  }
});

// GET /api/mentor/dashboard
// Returns only data relevant to the logged in mentor
// Mentors cannot see other mentors
app.get('/api/mentor/dashboard', requireRole('Mentor'), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userEmail = req.session.user.email;

    // Find mentor's lead record
    const myLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { mentorUserId: userId },
          { email: userEmail }
        ]
      },
      include: {
        sourcer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            year: true,
            branch: true
          }
        },
        connections: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Get all startup profiles for mentor to browse
    const startups = await prisma.startupProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get notifications for this mentor
    const notifications = [];
    if (myLead?.sourcer) {
      notifications.push({
        id: 'sourcer-info',
        type: 'info',
        message: `Your contact details were shared by ${myLead.sourcer.name}. They will reach out to you personally once a startup requests an introduction.`,
        sourcerName: myLead.sourcer.name,
        createdAt: myLead.createdAt,
        permanent: true
      });
    }

    res.json({
      myLead,
      startups,
      notifications,
      connections: myLead?.connections || []
    });
  } catch (error) {
    console.error('Error fetching mentor dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch mentor dashboard' });
  }
});

// POST /api/mentor/profile
app.post('/api/mentor/profile', requireRole('Mentor'), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { designation, experience, linkedIn, bio } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        designation: designation?.trim(),
        experience: experience?.trim(),
        linkedIn: linkedIn?.trim(),
        bio: bio?.trim(),
        profileCompleted: true
      }
    });

    req.session.user = {
      ...req.session.user,
      profileCompleted: true
    };

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating mentor profile:', error);
    res.status(500).json({ error: 'Failed to update mentor profile' });
  }
});


// --- STARTUP PROFILE ENDPOINTS ---

// GET /api/startup - Get startup profile for a user
app.get('/api/startup', requireAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    const profile = await prisma.startupProfile.findUnique({
      where: { userId: parseInt(userId) },
      select: {
        id: true,
        userId: true,
        name: true,
        stage: true,
        focus: true,
        currentGoal: true,
        tagline: true,
        problemStatement: true,
        solution: true,
        teamSize: true,
        helpNeeded: true,
        website: true,
        demoLink: true,
        achievement: true,
        trlLevel: true
      }
    });

    res.json(profile || null);
  } catch (error) {
    console.error("Error fetching startup profile:", error);
    res.status(500).json({ error: "Failed to fetch startup profile" });
  }
});

// POST /api/startup - Create or update startup profile
app.post('/api/startup', requireRole('Founder'), async (req, res) => {
  try {
    const {
      userId, name, stage, focus, currentGoal,
      tagline, problemStatement, solution,
      teamSize, helpNeeded, website, demoLink,
      achievement, trlLevel
    } = req.body;
    if (!userId || !name || !stage || !focus || !currentGoal) {
      return res.status(400).json({ error: "Missing required fields (userId, name, stage, focus, currentGoal)" });
    }

    const uId = parseInt(userId);
    const profileData = {
      name, stage, focus, currentGoal,
      tagline, problemStatement, solution,
      teamSize, helpNeeded, website, demoLink,
      achievement, trlLevel
    };

    const profile = await prisma.startupProfile.upsert({
      where: { userId: uId },
      update: profileData,
      create: { userId: uId, ...profileData }
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
app.get('/api/approved-leads', requireAuth, async (req, res) => {
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
      include: { sourcer: true },
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


// GET /api/connections - Retrieve connections (optionally filtered by userId or leadId)
app.get('/api/connections', requireAuth, async (req, res) => {
  try {
    const { userId, leadId } = req.query;
    
    const where = {};
    if (userId) {
      where.userId = parseInt(userId);
    }
    if (leadId) {
      where.leadId = parseInt(leadId);
    }

    const connections = await prisma.connectionRequest.findMany({
      where,
      include: {
        lead: {
          include: {
            sourcer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                year: true,
                branch: true,
                rejectionCount: true,
                isBlocked: true
              }
            },
            approvedByVolunteer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(connections);
  } catch (error) {
    console.error("Error retrieving connection requests:", error);
    res.status(500).json({ error: "Failed to retrieve connection requests" });
  }
});

// POST /api/connections - Send connection request to a lead
app.post('/api/connections', requireRole('Founder'), emailLimiter, async (req, res) => {
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

    // Generate invite token and send emails
    try {
      const crypto = require('crypto');
      const sourcerInviteToken = crypto.randomBytes(32).toString('hex');

      const lead = await prisma.lead.findUnique({
        where: { id: parseInt(leadId) },
        include: {
          sourcer: true,
          approvedByVolunteer: true
        }
      });

      const founder = await prisma.user.findUnique({
        where: { id: parseInt(userId) }
      });

      // Save sourcer invite token and set sourcer response to pending
      await prisma.connectionRequest.update({
        where: { id: conn.id },
        data: {
          sourcerInviteToken,
          sourcerResponse: 'pending'
        }
      });

      // Send email to SOURCER first — not mentor
      if (lead?.sourcer?.email) {
        await sendSourcerIntroRequestEmail({
          sourcerEmail: lead.sourcer.email,
          sourcerName: lead.sourcer.name,
          founderName: founder?.name || 'A VJ Startup Founder',
          startupName: founder?.name || 'VJ Startup',
          mentorName: lead.name,
          sourcerInviteToken,
          connectionId: conn.id
        });
      }

      // Notify all volunteers and admin via email
      try {
        const volunteersAndAdmins = await prisma.user.findMany({
          where: {
            role: { in: ['Volunteer', 'Admin'] },
            isBlocked: false
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });

        const { sendVolunteerNotificationEmail } = require('./mailer');
        for (const staff of volunteersAndAdmins) {
          await sendVolunteerNotificationEmail({
            staffEmail: staff.email,
            staffName: staff.name,
            staffRole: staff.role,
            founderName: founder?.name || 'A Founder',
            startupName: founder?.name || 'A VJ Startup',
            mentorName: lead.name,
            mentorDomain: lead.domain,
            sourcerName: lead.sourcer?.name || 'Unknown',
            sourcerEmail: lead.sourcer?.email || 'Unknown',
            sourcerPhone: lead.sourcer?.phone || 'Not provided',
            sourcerYear: lead.sourcer?.year || 'Not provided',
            sourcerBranch: lead.sourcer?.branch || 'Not provided'
          });
        }
      } catch (volErr) {
        console.error('Volunteer notification email failed:', volErr.message);
      }
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr.message);
    }

    res.status(201).json(conn);
  } catch (error) {
    console.error("Error sending connection request:", error);
    res.status(500).json({ error: "Failed to send connection request" });
  }
});

// GET /api/users - Fetch all users for Admin Manage Access
app.get('/api/users', requireRole('Admin'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        rejectionCount: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// PATCH /api/users/:id/role - Update user role
app.patch('/api/users/:id/role', requireRole('Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    const allowedRoles = ["Student", "Mentor", "Founder", "Volunteer", "Admin"];

    if (isNaN(id) || !role || !allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid user ID or role parameter." });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role }
    });

    console.log(`Updated user ${updatedUser.name} role to ${role}`);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// PATCH /api/users/:id/blacklist - Blacklist or un-blacklist user
// Fix 3 — Accepts both `blocked` (from flagged sourcer UI) and `isBlocked` (from main user table)
app.patch('/api/users/:id/blacklist', requireRole('Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Accept either `blocked` or `isBlocked` for flexibility
    const blockedValue = req.body.blocked !== undefined ? req.body.blocked : req.body.isBlocked;

    if (isNaN(id) || blockedValue === undefined) {
      return res.status(400).json({ error: "Invalid parameters. 'blocked' field is required." });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isBlocked: Boolean(blockedValue) }
    });

    console.log(`Updated user ${updatedUser.name} blocked status to: ${Boolean(blockedValue)}`);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user blacklist status:", error);
    res.status(500).json({ error: "Failed to update blocked status" });
  }
});

// DELETE /api/users/:id - Kick / delete user account
app.delete('/api/users/:id', requireRole('Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    await prisma.user.delete({
      where: { id }
    });

    console.log(`Deleted / Kicked user ID ${id}`);
    res.json({ message: `User ${id} removed successfully` });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to remove user account" });
  }
});

// PATCH /api/connections/:id - Update connection status
app.patch('/api/connections/:id', requireAuth, async (req, res) => {
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

// POST /api/connection-requests/:id/respond - Respond (Accept/Decline) to a connection request for a mentor
app.post('/api/connection-requests/:id/respond', requireRole('Mentor'), async (req, res) => {
  try {
    const connId = parseInt(req.params.id);
    const { action } = req.body; // 'Accept' or 'Decline'

    if (isNaN(connId) || !['Accept', 'Decline'].includes(action)) {
      return res.status(400).json({ error: "Invalid connection ID or action" });
    }

    const conn = await prisma.connectionRequest.findUnique({
      where: { id: connId },
      include: { lead: true }
    });

    if (!conn) {
      return res.status(404).json({ error: "Connection request not found" });
    }

    // Verify current mentor owns the lead record
    if (conn.lead.email.toLowerCase() !== req.session.user.email.toLowerCase()) {
      return res.status(403).json({ error: "You are not authorized to respond to this request" });
    }

    const newStatus = action === 'Accept' ? 'Accepted' : 'Declined';
    const updated = await prisma.connectionRequest.update({
      where: { id: connId },
      data: { status: newStatus }
    });

    console.log(`Mentor ${req.session.user.email} ${action}ed connection request #${connId}`);
    res.json(updated);
  } catch (error) {
    console.error("Error responding to connection request:", error);
    res.status(500).json({ error: "Failed to respond to connection request" });
  }
});


// --- CHAT ENDPOINTS ---

// GET /api/chats - Get messages between founder and lead
app.get('/api/chats', requireAuth, async (req, res) => {
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
app.post('/api/chats', requireAuth, async (req, res) => {
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
app.patch('/api/leads/:id/approve', requireRole('Admin', 'Volunteer'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        verified: true,
        status: 'Approved',
        rejectionReason: '',
        approvedByVolunteerId: req.session.user.id,
        approvedAt: new Date()
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
app.patch('/api/leads/:id/reject', requireRole('Admin', 'Volunteer'), async (req, res) => {
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
app.post('/api/leads/:id/invite', requireRole('Admin', 'Volunteer'), emailLimiter, async (req, res) => {
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

    // Send the actual email invitation
    await sendLeadPlatformInviteEmail({
      leadEmail: lead.email,
      leadName: lead.name,
      domain: lead.domain || 'your domain'
    });

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

// --- ADDITIONAL API ENDPOINTS ---

// GET /api/startups - Retrieve all startup profiles
app.get('/api/startups', requireAuth, async (req, res) => {
  try {
    const profiles = await prisma.startupProfile.findMany({
      include: {
        user: true
      }
    });
    res.json(profiles);
  } catch (error) {
    console.error("Error fetching startup profiles:", error);
    res.status(500).json({ error: "Failed to fetch startup profiles" });
  }
});

// GET /api/stats - Retrieve platform-wide stats (public)
app.get('/api/stats', async (req, res) => {
  try {
    const totalLeads = await prisma.lead.count();
    const verifiedLeads = await prisma.lead.count({ where: { verified: true } });
    const totalStartups = await prisma.startupProfile.count();

    res.json({
      totalLeads,
      verifiedLeads,
      totalStartups
    });
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    res.status(500).json({ error: "Failed to fetch platform stats" });
  }
});

app.get('/api/invite/respond', async (req, res) => {
  try {
    const { token, response, connectionId } = req.query;

    if (!token || !response || !connectionId) {
      return res.status(400).send('Invalid invite link.');
    }

    // Find lead by invite token
    const lead = await prisma.lead.findFirst({
      where: { inviteToken: token },
      include: { sourcer: true, connections: true }
    });

    if (!lead) {
      return res.status(404).send('This invite link is invalid or has already been used.');
    }

    // Find the connection request
    const connection = await prisma.connectionRequest.findUnique({
      where: { id: parseInt(connectionId) },
      include: { user: true }
    });

    if (!connection) {
      return res.status(404).send('Connection request not found.');
    }

    if (response === 'yes') {
      // Mark lead as invite accepted
      await prisma.lead.update({
        where: { id: lead.id },
        data: { inviteAccepted: true, inviteToken: null }
      });

      // Update connection status to Intro Made
      await prisma.connectionRequest.update({
        where: { id: parseInt(connectionId) },
        data: { status: 'Intro Made' }
      });

      // Send welcome email to lead
      await sendWelcomeEmail({
        leadEmail: lead.email,
        leadName: lead.name,
        founderName: connection.user?.name || 'The Founder',
        startupName: connection.user?.name || 'VJ Startup'
      });

      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 60px;">
            <h2 style="color: #1D9E75;">Thank you for your response!</h2>
            <p>You have agreed to connect. The student who referred you will be in touch shortly to make the introduction.</p>
            <p style="color: #6B7280; font-size: 14px;">You may close this tab.</p>
          </body>
        </html>
      `);
    }

    if (response === 'no') {
      // Clear invite token
      await prisma.lead.update({
        where: { id: lead.id },
        data: { inviteToken: null }
      });

      // Update connection status to declined
      await prisma.connectionRequest.update({
        where: { id: parseInt(connectionId) },
        data: { status: 'Declined' }
      });

      // Log rejection and increment sourcer rejection count
      if (lead.sourcerId) {
        await prisma.sourcerRejectionLog.create({
          data: {
            sourcerId: lead.sourcerId,
            leadId: lead.id,
            connectionId: parseInt(connectionId)
          }
        });

        // Increment rejection count on sourcer
        const updatedSourcer = await prisma.user.update({
          where: { id: lead.sourcerId },
          data: { rejectionCount: { increment: 1 } }
        });

        console.log(`Sourcer ${updatedSourcer.name} rejection count: ${updatedSourcer.rejectionCount}`);
      }

      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 60px;">
            <h2 style="color: #374151;">Thank you for letting us know.</h2>
            <p>We respect your decision and will not contact you again regarding this request.</p>
            <p style="color: #6B7280; font-size: 14px;">You may close this tab.</p>
          </body>
        </html>
      `);
    }

    return res.status(400).send('Invalid response value.');
  } catch (error) {
    console.error('Error handling invite response:', error);
    res.status(500).send('Something went wrong. Please try again later.');
  }
});

app.get('/api/invite/sourcer-respond', async (req, res) => {
  try {
    const { token, response, connectionId } = req.query;

    if (!token || !response || !connectionId) {
      return res.status(400).send('Invalid link.');
    }

    const connection = await prisma.connectionRequest.findFirst({
      where: {
        id: parseInt(connectionId),
        sourcerInviteToken: token
      },
      include: {
        user: true,
        lead: {
          include: { sourcer: true }
        }
      }
    });

    if (!connection) {
      return res.status(404).send('This link is invalid or has already been used.');
    }

    if (response === 'yes') {
      const crypto = require('crypto');
      const mentorInviteToken = crypto.randomBytes(32).toString('hex');

      // Update connection — sourcer accepted, now contact mentor
      await prisma.connectionRequest.update({
        where: { id: parseInt(connectionId) },
        data: {
          sourcerResponse: 'accepted',
          sourcerRespondedAt: new Date(),
          sourcerInviteToken: null,
          status: 'Sourcer Accepted',
          mentorNotifiedAt: new Date()
        }
      });

      // Save mentor invite token to lead
      await prisma.lead.update({
        where: { id: connection.lead.id },
        data: { inviteToken: mentorInviteToken }
      });

      // Now send email to MENTOR with sourcer name prominent
      await sendLeadInviteEmail({
        leadEmail: connection.lead.email,
        leadName: connection.lead.name,
        founderName: connection.user?.name || 'A VJ Startup Founder',
        startupName: connection.user?.name || 'VJ Startup',
        sourcerName: connection.lead.sourcer?.name || 'a VJ student',
        inviteToken: mentorInviteToken,
        connectionId: parseInt(connectionId)
      });

      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 60px;">
            <h2 style="color: #1D9E75;">Thank you for agreeing to help!</h2>
            <p>We have now reached out to ${connection.lead.name} on your behalf.</p>
            <p>We will notify you once they respond.</p>
            <p style="color: #6B7280; font-size: 14px;">You may close this tab.</p>
          </body>
        </html>
      `);
    }

    if (response === 'no') {
      // Update connection — sourcer declined
      await prisma.connectionRequest.update({
        where: { id: parseInt(connectionId) },
        data: {
          sourcerResponse: 'declined',
          sourcerRespondedAt: new Date(),
          sourcerInviteToken: null,
          status: 'Sourcer Declined'
        }
      });

      // Store notification for volunteer dashboard
      console.log(`SOURCER_DECLINED: connectionId=${connectionId} sourcer=${connection.lead.sourcer?.name} email=${connection.lead.sourcer?.email} phone=${connection.lead.sourcer?.phone} year=${connection.lead.sourcer?.year} branch=${connection.lead.sourcer?.branch}`);

      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 60px;">
            <h2 style="color: #374151;">Thank you for letting us know.</h2>
            <p>We understand you are not able to help right now. The volunteer team will follow up if needed.</p>
            <p style="color: #6B7280; font-size: 14px;">You may close this tab.</p>
          </body>
        </html>
      `);
    }

    return res.status(400).send('Invalid response.');
  } catch (error) {
    console.error('Error handling sourcer response:', error);
    res.status(500).send('Something went wrong. Please try again later.');
  }
});

app.get('/api/notifications/sourcer-declined', requireRole('Admin', 'Volunteer'), async (req, res) => {
  try {
    const declined = await prisma.connectionRequest.findMany({
      where: {
        sourcerResponse: 'declined'
      },
      include: {
        lead: {
          include: {
            sourcer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                year: true,
                branch: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { sourcerRespondedAt: 'desc' }
    });

    res.json(declined);
  } catch (error) {
    console.error('Error fetching declined notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});


// --- GLOBAL ERROR HANDLER (must be after all routes) ---
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  res.status(500).json({ error: 'An internal error occurred' });
});

// --- GRACEFUL SHUTDOWN ---
const server = app.listen(PORT, () => {
  console.log(`Express API server running on http://localhost:${PORT}`);
  console.log(`Database: SQLCipher-encrypted SQLite (dev.db)`);
});

const shutdownSignals = ['SIGTERM', 'SIGINT'];
shutdownSignals.forEach(signal => {
  process.on(signal, async () => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    try {
      await prisma.$disconnect();
      console.log('Database connection closed.');
    } catch (err) {
      console.error('Error disconnecting database:', err);
    }
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      console.error('Forced exit after timeout.');
      process.exit(1);
    }, 10000);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
