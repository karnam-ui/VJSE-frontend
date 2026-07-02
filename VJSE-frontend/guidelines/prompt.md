Design a multi-page web application called "VJ Network" — an extension
of the VJ Startups platform (vjstartups.org). The design must match the
existing VJ Startups visual identity exactly:

DESIGN SYSTEM (match VJ Startups):

- Background: #0A0A0A (near-black)
- Surface/Card background: #111111 to #1A1A1A
- Primary accent: #3B82F6 (blue, as seen in CTA buttons and stats)
- Secondary accent: #1D4ED8 (darker blue for hover states)
- Destructive/Warning: #EF4444 (red for flag/delete actions)
- Success: #22C55E (green for verified badges)
- Text primary: #FFFFFF
- Text secondary: #9CA3AF (gray)
- Border/Divider: #1F2937
- Font: Use Inter (same as VJ Startups) — bold for headings, regular for body
- Border radius: 8–12px on cards, 6px on buttons
- Nav: Same top navbar as VJ Startups — black background, white logo
  "VJ Startups" with rocket icon on left, nav links center, Login/Profile
  right

---

PAGE 1 — LANDING / HOME (/network)

Hero section:

- Headline: "Your College's Professional Network"
- Subheading: "Connect with industry leaders referred by fellow students.
  Built for VNRVJIET startup founders."
- Two CTA buttons: "Submit a Lead" (blue filled) and "Browse Network"
  (blue outlined)
- 3 stat counters below (same style as VJ Startups homepage — large blue
  numbers, gray labels): "124 Leads", "38 Verified", "12 Domains"

Below hero:

- 3 feature cards in a row on dark surface (#111111):
  Card 1: Icon + "Submit Leads" — "Refer professionals from your network
  with their consent"
  Card 2: Icon + "Search by Domain" — "Find the right contact for your
  startup's industry"
  Card 3: Icon + "Request Intro" — "Get a warm introduction brokered by
  the Startup Cell"

---

PAGE 2 — SUBMIT LEAD (/submit-lead) [Authenticated users only]

Page title: "Submit a Professional Lead"
Subtitle: "Know someone who can help a startup? Refer them here."

Form card (dark surface, 600px wide, centered):

- Read-only fields at top: "Your Name" and "Your Email" (pre-filled from
  Google login, shown as disabled input fields with a lock icon)
- Divider line
- Input: "Lead's Full Name" (text)
- Dropdown: "Your Relationship" — options: Parent, Sibling, Relative,
  Family Friend, Other
- Input: "Their Profession / Role" (text)
- Dropdown: "Organisation Type" — Corporate, SME, Startup, Academic,
  Government, Hospital, Mall, Other
- Input: "Organisation Name" (text)
- Input: "City / Location" (text)
- Multi-select chip selector: "Domain" — EdTech, HealthTech, RetailTech,
  AgriTech, FinTech, Logistics, Hospitality, Real Estate, Events, Other
  (chips turn blue when selected)
- Checkbox group: "How can they help?" — Early Feedback, Product Demo,
  Pilot Partnership, Advisory, Other
- Consent checkbox (required): "I confirm this person is aware and willing
  to be contacted" — checkbox with red asterisk
- Submit button: full-width blue "Submit Lead →"
- Below button: small gray text "No personal contact details (phone/email)
  are collected or stored."

---

PAGE 3 — SEARCH / BROWSE NETWORK (/search)

Page title: "Browse the Network"
Filter bar (horizontal, below title):

- 3 dropdowns side by side: "Domain ▾", "City ▾", "Organisation Type ▾"
- Clear filters link (text button, gray)
- Result count: "Showing 24 leads"

Lead cards grid (2 columns on desktop, 1 on mobile):
Each card (dark surface #111111, blue left border accent):

- Top row: Lead name (white, bold) + Verified badge (green "✓ Verified"
  pill) OR pending indicator
- Profession / Role (gray text)
- Organisation: [type badge chip] + Organisation name
- Location: 📍 City name
- "Can help with:" — small blue chip tags (Early Feedback, Advisory, etc.)
- Bottom row: "Referred by: [First name]" (gray, small) on left +
  "Request Introduction →" blue button on right

Empty state (when no results):

- Centered illustration placeholder + "No leads found for this filter" +
  "Try a different domain or city" in gray

Pagination at bottom: prev / page numbers / next (same blue accent)

---

PAGE 4 — VOLUNTEER DASHBOARD (/volunteer)

Page title: "Volunteer Review Panel"
Stats row: "47 Pending Review" (orange badge) | "312 Total Leads" |
  "265 Verified"

Data table (full width, dark surface):
Columns: Lead Name | Role | Organisation | Domain | City | Referred By |
  Submitted On | Actions

Each row:

- Unverified rows have a faint yellow-orange left border
- Actions column: green "✓ Verify" button + red "🚩 Flag" button (small,
  outlined)

Search bar above table: "Search unverified leads..." with filter dropdowns

---

PAGE 5 — ADMIN DASHBOARD (/admin)

Page title: "Admin Control Panel"
4 stat cards at top (same dark card style): Total Leads | Verified |
  Pending | Introduction Requests

Tabs below stats: "All Leads" | "Introduction Requests" | "Manage Access"
  (Phase 2 tabs shown as disabled/grayed)

All Leads tab — full data table:
Columns: Lead Name | Role | Org | Domain | City | Referred By | Status
  (toggle switch: verified/unverified) | Actions (Delete with confirm
  prompt)

Filter bar: Domain + City + Org Type + Status (All / Verified / Unverified)
Top-right: "⬇ Download CSV" button (blue outlined)

Introduction Requests tab:
Cards showing: Requesting founder name + email | Lead card summary |
  Timestamp | "Mark Handled" button

---

GLOBAL COMPONENTS TO INCLUDE IN DESIGN:

1. Navbar — black bar, VJ Startups logo left, nav links center
   (Problems / Ideas / Network / Programs / Club), right side shows
   user avatar + name when logged in OR "Login" button
2. Toast notification — bottom-right, dark card with blue left border:
   "✓ Lead submitted successfully!"
3. Role badge — small pill shown next to user name in nav:
   "Student" (gray) / "Founder" (blue) / "Volunteer" (orange) /
   "Admin" (red)
4. Confirmation modal — dark overlay, centered card: "Delete this lead?"
   with Cancel (outlined) + Delete (red filled) buttons
5. Login gate card — same style as VJ Startups "Join the Community" card
   (dark gradient card with "Login to Continue" orange button) — shown on
   /search and /submit-lead when unauthenticated

---

DESIGN CONSTRAINTS:

- Mobile responsive (all pages must have a mobile layout)
- No personal contact info (phone/email) visible anywhere in lead cards
  or search results
- Verified badge must be visually distinct from unverified at a glance
- Keep the same dark, professional, startup-culture feel as vjstartups.org
- Do not use light mode
