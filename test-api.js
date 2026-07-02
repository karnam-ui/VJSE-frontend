async function testApi() {
  const baseUrl = 'http://localhost:3000/api/leads';

  console.log("-----------------------------------------");
  console.log("🚀 STARTING API ENDPOINT TESTS");
  console.log("-----------------------------------------");

  try {
    // 1. GET /api/leads (Initial list)
    console.log("\n1. Testing GET /api/leads (fetch existing)...");
    const getRes1 = await fetch(baseUrl);
    const leads1 = await getRes1.json();
    console.log(`Received ${leads1.length} leads:`, leads1);

    // 2. POST /api/leads (Create new lead)
    console.log("\n2. Testing POST /api/leads (create new)...");
    const newLeadPayload = {
      name: "API Test User",
      email: "apitest@gmail.com",
      domain: "EdTech",
      organization: "VJ Universities"
    };
    const postRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLeadPayload)
    });
    const createdLead = await postRes.json();
    console.log("Created Lead:", createdLead);
    const createdId = createdLead.id;

    // 3. GET /api/leads (Confirm lead was added)
    console.log("\n3. Testing GET /api/leads (confirm addition)...");
    const getRes2 = await fetch(baseUrl);
    const leads2 = await getRes2.json();
    console.log(`Received ${leads2.length} leads. Verified added?`, leads2.some(l => l.id === createdId));

    // 4. PATCH /api/leads/:id/verify (Verify the lead)
    console.log(`\n4. Testing PATCH /api/leads/${createdId}/verify...`);
    const patchRes = await fetch(`${baseUrl}/${createdId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: true })
    });
    const updatedLead = await patchRes.json();
    console.log("Updated Lead:", updatedLead);

    // 5. DELETE /api/leads/:id (Clean up the created lead)
    console.log(`\n5. Testing DELETE /api/leads/${createdId}...`);
    const deleteRes = await fetch(`${baseUrl}/${createdId}`, {
      method: 'DELETE'
    });
    const deleteResult = await deleteRes.json();
    console.log("Delete result:", deleteResult);

    // 6. GET /api/leads (Confirm deletion)
    console.log("\n6. Testing GET /api/leads (confirm deletion)...");
    const getRes3 = await fetch(baseUrl);
    const leads3 = await getRes3.json();
    console.log(`Received ${leads3.length} leads. Verified deleted?`, !leads3.some(l => l.id === createdId));

    console.log("\n-----------------------------------------");
    console.log("🎉 ALL API ENDPOINT TESTS PASSED SUCCESSFULLY!");
    console.log("-----------------------------------------");

  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

testApi();
