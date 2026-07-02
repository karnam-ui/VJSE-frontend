const { execSync } = require('child_process');

async function testSync() {
  console.log("--------------------------------------------------");
  console.log("1. CURRENT LEADS IN DB (Before any changes):");
  console.log("--------------------------------------------------");
  console.log(execSync("node view-db.js leads").toString());

  console.log("\n2. SUBMITTING A NEW LEAD FROM THE FRONTEND API...");
  const newLeadPayload = {
    name: "DB Verified Lead",
    email: "dbverify@gmail.com",
    domain: "FinTech",
    organization: "VJ Industries"
  };
  
  // Use Node.js built-in fetch
  const postRes = await fetch("http://localhost:3000/api/leads", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newLeadPayload)
  });
  const createdLead = await postRes.json();
  console.log(`✅ Success! Created Lead ID ${createdLead.id} in DB.`);

  console.log("\n--------------------------------------------------");
  console.log("3. DB STATE AFTER SUBMISSION (Should show 'DB Verified Lead' as Pending):");
  console.log("--------------------------------------------------");
  console.log(execSync("node view-db.js leads").toString());

  console.log(`\n4. TOGGLING VERIFICATION ON ADMIN PAGE (PATCH /api/leads/${createdLead.id}/verify)...`);
  const patchRes = await fetch(`http://localhost:3000/api/leads/${createdLead.id}/verify`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verified: true })
  });
  const updatedLead = await patchRes.json();
  console.log(`✅ Success! Verification updated in DB. verified = ${updatedLead.verified}`);

  console.log("\n--------------------------------------------------");
  console.log("5. DB STATE AFTER ADMIN VERIFICATION (Should show 'DB Verified Lead' as Approved):");
  console.log("--------------------------------------------------");
  console.log(execSync("node view-db.js leads").toString());

  console.log(`\n6. DELETING LEAD FROM ADMIN PAGE (DELETE /api/leads/${createdLead.id})...`);
  const deleteRes = await fetch(`http://localhost:3000/api/leads/${createdLead.id}`, {
    method: 'DELETE'
  });
  const deleteResult = await deleteRes.json();
  console.log(`✅ Success! Deleted from DB: ${deleteResult.message}`);

  console.log("\n--------------------------------------------------");
  console.log("7. DB STATE AFTER DELETION (Should be gone):");
  console.log("--------------------------------------------------");
  console.log(execSync("node view-db.js leads").toString());
}

testSync().catch(console.error);
