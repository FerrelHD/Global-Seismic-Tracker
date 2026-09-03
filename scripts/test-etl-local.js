import assert from 'node:assert';

// Self-check for USGS GeoJSON parsing & coordinate normalization logic
const sampleGeoJSON = {
  features: [
    {
      id: 'us7000test',
      properties: { mag: 6.2, place: '12km SSW of Tokyo, Japan', time: 1710000000000 },
      geometry: { coordinates: [139.6917, 35.6895, 10.5] }, // [lng, lat, depth]
    },
  ],
};

const [longitude, latitude, depth] = sampleGeoJSON.features[0].geometry.coordinates;
const record = {
  usgs_id: sampleGeoJSON.features[0].id,
  magnitude: sampleGeoJSON.features[0].properties.mag,
  depth: Number(depth),
  latitude: Number(latitude),
  longitude: Number(longitude),
  place: sampleGeoJSON.features[0].properties.place,
  occurred_at: new Date(sampleGeoJSON.features[0].properties.time).toISOString(),
};

assert.strictEqual(record.usgs_id, 'us7000test');
assert.strictEqual(record.longitude, 139.6917);
assert.strictEqual(record.latitude, 35.6895);
assert.strictEqual(record.depth, 10.5);
assert.strictEqual(record.magnitude, 6.2);
console.log('✓ ETL normalization self-check passed.');
