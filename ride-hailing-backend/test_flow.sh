#!/bin/bash
OUTPUT_FILE="/Users/shikhagupta/.gemini/antigravity-ide/brain/7a8e4db5-7f5f-49c8-a29e-26ac3f46a6c1/scratch/scratchpad_debug.md"
echo "# Full Ride Flow Debug Test" > $OUTPUT_FILE
echo "## 1. Creating Driver" >> $OUTPUT_FILE
DRIVER_RESP=$(curl -s -X POST http://localhost:3000/drivers -H "Content-Type: application/json" -d '{"name": "Test Driver 1"}')
echo "$DRIVER_RESP" >> $OUTPUT_FILE
DRIVER_ID=$(echo $DRIVER_RESP | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "\nDriver ID: $DRIVER_ID\n" >> $OUTPUT_FILE

echo "## 2. Setting Driver ONLINE (Location)" >> $OUTPUT_FILE
LOC_RESP=$(curl -s -X POST http://localhost:3000/drivers/$DRIVER_ID/location -H "Content-Type: application/json" -d '{"lat": 40.7128, "lng": -74.0060, "status": "ONLINE"}')
echo "$LOC_RESP" >> $OUTPUT_FILE

echo "\n## 3. Creating Ride Request" >> $OUTPUT_FILE
RIDE_RESP=$(curl -s -X POST http://localhost:3000/rides -H "Content-Type: application/json" -d '{"riderId": "rider-999", "pickupLat": 40.7130, "pickupLng": -74.0065}')
echo "$RIDE_RESP" >> $OUTPUT_FILE
RIDE_ID=$(echo $RIDE_RESP | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "\nRide ID: $RIDE_ID\n" >> $OUTPUT_FILE

echo "## 4. Immediately Accepting Ride" >> $OUTPUT_FILE
ACCEPT_RESP=$(curl -s -X POST http://localhost:3000/rides/$RIDE_ID/accept -H "Content-Type: application/json" -d "{\"driverId\": \"$DRIVER_ID\"}")
echo "$ACCEPT_RESP" >> $OUTPUT_FILE
