async function runSimulation() {
  console.log('--- Concurrency Simulation ---');

  const baseUrl = 'http://localhost:3000';

  // 1. Create drivers
  console.log('1. Registering drivers and putting them online...');
  const driverIds = [];
  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`${baseUrl}/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Driver ${i}` })
    });
    const driver = await res.json();
    driverIds.push(driver.id);
    
    // Put driver online with location
    const lat = 40.7128;
    const lng = -74.0060;
    await fetch(`${baseUrl}/drivers/${driver.id}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, status: 'ONLINE' })
    });
  }

  console.log(`Registered ${driverIds.length} drivers.`);

  // 2. Create a ride
  console.log('2. Creating a ride request...');
  const rideRes = await fetch(`${baseUrl}/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ riderId: 'rider-123', pickupLat: 40.7128, pickupLng: -74.0060 })
  });
  const ride = await rideRes.json();
  const rideId = ride.id;
  console.log(`Ride created: ${rideId}. Waiting 1 second for Redis propagation...`);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 3. Simulate concurrent accepts
  console.log('3. Simulating concurrent driver accepts...');
  const acceptPromises = driverIds.map(driverId => {
    return fetch(`${baseUrl}/rides/${rideId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId })
    })
    .then(async res => {
      const data = await res.json();
      return { driverId, status: res.status, response: data };
    });
  });

  const results = await Promise.all(acceptPromises);

  console.log('\\n--- Results ---');
  let successCount = 0;
  for (const res of results) {
    if (res.status === 201 || res.status === 200) {
      successCount++;
      console.log(`✅ Driver ${res.driverId} successfully accepted the ride!`);
    } else {
      console.log(`❌ Driver ${res.driverId} failed to accept. Reason:`, res.response.message);
    }
  }

  console.log(`\\nTotal Successful Assignments: ${successCount} (Should be EXACTLY 1)`);
}

runSimulation().catch(console.error);
