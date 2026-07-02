export type UserRole = "Student" | "Mentor" | "Founder" | "Volunteer" | "Admin";

export interface Lead {
  id: string;
  name: string;
  role: string;
  organisationType: string;
  organisation: string;
  city: string;
  domains: string[];
  helps: string[];
  referredBy: string;
  verified: boolean;
  submittedOn: string;
}

export interface IntroRequest {
  id: string;
  founder: string;
  email: string;
  leadName: string;
  leadRole: string;
  leadOrg: string;
  timestamp: string;
  handled: boolean;
}

export const domainOptions = [
  "EdTech",
  "HealthTech",
  "RetailTech",
  "AgriTech",
  "FinTech",
  "Logistics",
  "Hospitality",
  "Real Estate",
  "Events",
  "Other",
];

export const organisationTypes = [
  "Corporate",
  "SME",
  "Startup",
  "Academic",
  "Government",
  "Hospital",
  "Mall",
  "Other",
];

export const relationshipOptions = [
  "Parent",
  "Sibling",
  "Relative",
  "Family Friend",
  "Other",
];

export const helpOptions = [
  "Early Feedback",
  "Product Demo",
  "Pilot Partnership",
  "Advisory",
  "Other",
];

export const cityOptions = [
  "Hyderabad",
  "Mumbai",
  "Bengaluru",
  "Chennai",
  "Pune",
  "Delhi",
  "Kolkata",
  "Jaipur",
];

export const leads: Lead[] = [
  {
    id: "lead-01",
    name: "Rakesh Menon",
    role: "Product Head",
    organisationType: "Corporate",
    organisation: "GlobalLogic",
    city: "Hyderabad",
    domains: ["EdTech", "FinTech"],
    helps: ["Advisory", "Early Feedback"],
    referredBy: "Ananya",
    verified: true,
    submittedOn: "2025-12-09",
  },
  {
    id: "lead-02",
    name: "Sneha Bhat",
    role: "VP Partnerships",
    organisationType: "Startup",
    organisation: "BrightBridge Labs",
    city: "Bengaluru",
    domains: ["HealthTech", "Logistics"],
    helps: ["Pilot Partnership", "Product Demo"],
    referredBy: "Harish",
    verified: false,
    submittedOn: "2025-12-11",
  },
  {
    id: "lead-03",
    name: "Arjun Verma",
    role: "Senior Researcher",
    organisationType: "Academic",
    organisation: "IIIT Hyderabad",
    city: "Hyderabad",
    domains: ["EdTech", "AI"],
    helps: ["Advisory", "Early Feedback"],
    referredBy: "Priya",
    verified: true,
    submittedOn: "2025-12-05",
  },
  {
    id: "lead-04",
    name: "Neha Sinha",
    role: "Corporate Strategy",
    organisationType: "Corporate",
    organisation: "LTI Mindtree",
    city: "Pune",
    domains: ["FinTech", "RetailTech"],
    helps: ["Product Demo", "Advisory"],
    referredBy: "Rohan",
    verified: false,
    submittedOn: "2025-12-08",
  },
  {
    id: "lead-05",
    name: "Priyanka Rao",
    role: "Head of Operations",
    organisationType: "Hospital",
    organisation: "Apollo Hospitals",
    city: "Chennai",
    domains: ["HealthTech"],
    helps: ["Pilot Partnership", "Advisory"],
    referredBy: "Sakshi",
    verified: true,
    submittedOn: "2025-12-02",
  },
  {
    id: "lead-06",
    name: "Vikram Joshi",
    role: "Founder",
    organisationType: "Startup",
    organisation: "EventHive",
    city: "Mumbai",
    domains: ["Events", "Hospitality"],
    helps: ["Product Demo", "Advisory"],
    referredBy: "Manya",
    verified: true,
    submittedOn: "2025-12-12",
  },
  {
    id: "lead-07",
    name: "Divya Patel",
    role: "Business Advisor",
    organisationType: "SME",
    organisation: "Patel Consulting",
    city: "Ahmedabad",
    domains: ["RetailTech", "Real Estate"],
    helps: ["Early Feedback", "Advisory"],
    referredBy: "Neeraj",
    verified: false,
    submittedOn: "2025-12-15",
  },
  {
    id: "lead-08",
    name: "Kabir Shah",
    role: "Head of Growth",
    organisationType: "Startup",
    organisation: "FarmChain",
    city: "Bengaluru",
    domains: ["AgriTech", "Logistics"],
    helps: ["Pilot Partnership", "Advisory"],
    referredBy: "Aditi",
    verified: true,
    submittedOn: "2025-12-03",
  },
  {
    id: "lead-09",
    name: "Neelam Gupta",
    role: "Academic Mentor",
    organisationType: "Academic",
    organisation: "BITS Pilani",
    city: "Goa",
    domains: ["EdTech"],
    helps: ["Advisory", "Early Feedback"],
    referredBy: "Nikhil",
    verified: true,
    submittedOn: "2025-12-07",
  },
  {
    id: "lead-10",
    name: "Amit Desai",
    role: "VP Sales",
    organisationType: "Corporate",
    organisation: "Google India",
    city: "Hyderabad",
    domains: ["FinTech", "RetailTech"],
    helps: ["Pilot Partnership", "Advisory"],
    referredBy: "Riya",
    verified: false,
    submittedOn: "2025-12-10",
  },
];

export const introRequests: IntroRequest[] = [
  {
    id: "req-01",
    founder: "Veer Sharma",
    email: "veer.sharma@vj.edu",
    leadName: "Rakesh Menon",
    leadRole: "Product Head",
    leadOrg: "GlobalLogic",
    timestamp: "2 hours ago",
    handled: false,
  },
  {
    id: "req-02",
    founder: "Sonia Mishra",
    email: "sonia.mishra@vj.edu",
    leadName: "Priyanka Rao",
    leadRole: "Head of Operations",
    leadOrg: "Apollo Hospitals",
    timestamp: "Yesterday",
    handled: false,
  },
  {
    id: "req-03",
    founder: "Rahul Verma",
    email: "rahul.verma@vj.edu",
    leadName: "Kabir Shah",
    leadRole: "Head of Growth",
    leadOrg: "FarmChain",
    timestamp: "3 days ago",
    handled: true,
  },
];
