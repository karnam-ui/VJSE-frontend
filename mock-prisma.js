const users = [
  { id: 1, name: "Rohan Kumar", email: "student@vnrvjiet.in", password: "student123", role: "Student", googleId: null },
  { id: 2, name: "Anjali Dev", email: "volunteer@vnrvjiet.in", password: "volunteer123", role: "Volunteer", googleId: null },
  { id: 3, name: "Kabir Mehta", email: "founder@vnrvjiet.in", password: "founder123", role: "Founder", googleId: null },
  { id: 4, name: "Suhaas Karnam", email: "suhaas@vnrvjiet.in", password: "founder123", role: "Founder", googleId: null },
  { id: 5, name: "Akshay Nerella", email: "akshay@vnrvjiet.in", password: "founder123", role: "Founder", googleId: null },
  { id: 6, name: "Suresh Menon", email: "lead@gmail.com", password: "lead123", role: "Mentor", googleId: null },
  { id: 7, name: "VJ Admin", email: "admin@gmail.com", password: "admin123", role: "Admin", googleId: null }
];

const leads = [
  { id: 1, name: "Rakesh Menon", email: "rakesh@globallogic.com", domain: "EdTech", organization: "GlobalLogic", skills: "Advisory, Early Feedback", verified: true, status: "Approved", invited: false, rejectionReason: "" },
  { id: 2, name: "Sneha Bhat", email: "sneha@brightbridge.com", domain: "HealthTech", organization: "BrightBridge Labs", skills: "Pilot Partnership, Product Demo", verified: false, status: "Pending", invited: false, rejectionReason: "" },
  { id: 3, name: "Arjun Verma", email: "arjun@iiit.ac.in", domain: "EdTech", organization: "IIIT Hyderabad", skills: "Advisory, Early Feedback", verified: true, status: "Approved", invited: false, rejectionReason: "" },
  { id: 4, name: "Neha Sinha", email: "neha@lti.com", domain: "FinTech", organization: "LTI Mindtree", skills: "Product Demo, Advisory", verified: true, status: "Approved", invited: false, rejectionReason: "" },
  { id: 5, name: "Priyanka Rao", email: "priyanka@apollo.com", domain: "HealthTech", organization: "Apollo Hospitals", skills: "Pilot Partnership, Advisory", verified: true, status: "Approved", invited: false, rejectionReason: "" },
  { id: 6, name: "Vikram Joshi", email: "vikram@eventhive.com", domain: "Events", organization: "EventHive", skills: "Product Demo, Advisory", verified: true, status: "Approved", invited: false, rejectionReason: "" },
  { id: 7, name: "Divya Patel", email: "divya@patel.com", domain: "RetailTech", organization: "Patel Consulting", skills: "Early Feedback, Advisory", verified: false, status: "Pending", invited: false, rejectionReason: "" },
  { id: 8, name: "Kabir Shah", email: "kabir@farmchain.com", domain: "AgriTech", organization: "FarmChain", skills: "Pilot Partnership, Advisory", verified: true, status: "Approved", invited: false, rejectionReason: "" },
  { id: 9, name: "Neelam Gupta", email: "neelam@bits.ac.in", domain: "EdTech", organization: "BITS Pilani", skills: "Advisory, Early Feedback", verified: true, status: "Approved", invited: false, rejectionReason: "" },
  { id: 10, name: "Amit Desai", email: "amit@google.com", domain: "FinTech", organization: "Google India", skills: "Pilot Partnership, Advisory", verified: false, status: "Pending", invited: false, rejectionReason: "" }
];

const startupProfiles = [
  { id: 1, userId: 3, name: "VentureSpark", stage: "MVP", focus: "EdTech", currentGoal: "Find pilot partners and advisory in EdTech." },
  { id: 2, userId: 4, name: "AutoAI Labs", stage: "Ideation", focus: "AI", currentGoal: "Develop initial prototype and secure pre-seed funding." },
  { id: 3, userId: 5, name: "Akshay Ventures", stage: "MVP", focus: "FinTech", currentGoal: "Secure pilot users and connect with mentors." }
];

const connectionRequests = [
  { id: 1, userId: 3, leadId: 1, status: "Pending" },
  { id: 2, userId: 3, leadId: 3, status: "Accepted" }
];

const chatMessages = [
  { id: 1, userId: 3, leadId: 3, sender: "Founder", content: "Hi Arjun, thanks for accepting my connection request!", createdAt: new Date().toISOString() },
  { id: 2, userId: 3, leadId: 3, sender: "Lead", content: "Hello Kabir! Happy to connect. I see you are working on VentureSpark. How can I help you today?", createdAt: new Date().toISOString() },
  { id: 3, userId: 3, leadId: 3, sender: "Founder", content: "We're looking for feedback on our core learning algorithm. Since you're at IIIT-H, your advisory would be invaluable.", createdAt: new Date().toISOString() }
];

let nextUserId = 8;
let nextLeadId = 11;
let nextStartupProfileId = 4;
let nextConnectionRequestId = 3;
let nextChatMessageId = 4;

const prismaMock = {
  user: {
    findUnique: async ({ where }) => {
      if (where.googleId) return users.find(u => u.googleId === where.googleId) || null;
      if (where.email) return users.find(u => u.email === where.email.toLowerCase()) || null;
      if (where.id) return users.find(u => u.id === where.id) || null;
      return null;
    },
    create: async ({ data }) => {
      const newUser = { id: nextUserId++, googleId: null, ...data };
      users.push(newUser);
      return newUser;
    },
    update: async ({ where, data }) => {
      const uIndex = users.findIndex(u => u.id === where.id || (where.googleId && u.googleId === where.googleId));
      if (uIndex !== -1) {
        users[uIndex] = { ...users[uIndex], ...data };
        return users[uIndex];
      }
      throw new Error("User not found");
    }
  },
  lead: {
    findMany: async ({ where, orderBy } = {}) => {
      let result = [...leads];
      if (where) {
        if (where.domain) result = result.filter(l => l.domain === where.domain);
        if (where.verified !== undefined) result = result.filter(l => l.verified === where.verified);
      }
      return result;
    },
    findUnique: async ({ where }) => {
      return leads.find(l => l.id === where.id) || null;
    },
    create: async ({ data }) => {
      const newLead = { id: nextLeadId++, verified: false, status: "Pending", invited: false, rejectionReason: "", ...data };
      leads.push(newLead);
      return newLead;
    },
    update: async ({ where, data }) => {
      const lIndex = leads.findIndex(l => l.id === where.id);
      if (lIndex !== -1) {
        leads[lIndex] = { ...leads[lIndex], ...data };
        return leads[lIndex];
      }
      throw new Error("Lead not found");
    },
    delete: async ({ where }) => {
      const lIndex = leads.findIndex(l => l.id === where.id);
      if (lIndex !== -1) {
        return leads.splice(lIndex, 1)[0];
      }
      throw new Error("Lead not found");
    },
    count: async ({ where } = {}) => {
      let result = [...leads];
      if (where) {
        if (where.verified !== undefined) result = result.filter(l => l.verified === where.verified);
      }
      return result.length;
    }
  },
  startupProfile: {
    findUnique: async ({ where }) => {
      return startupProfiles.find(s => s.userId === where.userId) || null;
    },
    upsert: async ({ where, update, create }) => {
      const sIndex = startupProfiles.findIndex(s => s.userId === where.userId);
      if (sIndex !== -1) {
        startupProfiles[sIndex] = { ...startupProfiles[sIndex], ...update };
        return startupProfiles[sIndex];
      } else {
        const newProfile = { id: nextStartupProfileId++, ...create };
        startupProfiles.push(newProfile);
        return newProfile;
      }
    },
    findMany: async ({ include } = {}) => {
      return startupProfiles.map(s => {
        const u = users.find(u => u.id === s.userId);
        return { ...s, user: u };
      });
    },
    count: async () => {
      return startupProfiles.length;
    }
  },
  connectionRequest: {
    findMany: async ({ where } = {}) => {
      let result = [...connectionRequests];
      if (where && where.userId) {
        result = result.filter(c => c.userId === where.userId);
      }
      return result.map(c => {
        const lead = leads.find(l => l.id === c.leadId);
        const user = users.find(u => u.id === c.userId);
        return { ...c, lead, user };
      });
    },
    upsert: async ({ where, update, create }) => {
      const cIndex = connectionRequests.findIndex(c => c.userId === where.userId_leadId.userId && c.leadId === where.userId_leadId.leadId);
      if (cIndex !== -1) {
        connectionRequests[cIndex] = { ...connectionRequests[cIndex], ...update };
        return connectionRequests[cIndex];
      } else {
        const newConn = { id: nextConnectionRequestId++, ...create };
        connectionRequests.push(newConn);
        return newConn;
      }
    },
    update: async ({ where, data }) => {
      const cIndex = connectionRequests.findIndex(c => c.id === where.id);
      if (cIndex !== -1) {
        connectionRequests[cIndex] = { ...connectionRequests[cIndex], ...data };
        return connectionRequests[cIndex];
      }
      throw new Error("Connection request not found");
    }
  },
  chatMessage: {
    findMany: async ({ where }) => {
      let result = [...chatMessages];
      if (where) {
        if (where.userId) result = result.filter(c => c.userId === where.userId);
        if (where.leadId) result = result.filter(c => c.leadId === where.leadId);
      }
      return result;
    },
    create: async ({ data }) => {
      const newMsg = { id: nextChatMessageId++, createdAt: new Date().toISOString(), ...data };
      chatMessages.push(newMsg);
      return newMsg;
    }
  },
  $disconnect: async () => {}
};

module.exports = prismaMock;
