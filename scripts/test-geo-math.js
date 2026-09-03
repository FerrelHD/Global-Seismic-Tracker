import assert from 'node:assert';

function geoToCoords(lat, lon, radius) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  const x = radius * cosLat * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * cosLat * Math.sin(lonRad);
  return [x, y, z];
}

const R = 2.5;

// Test Equator & Prime Meridian (lat: 0, lon: 0) -> (R, 0, 0)
const [x0, y0, z0] = geoToCoords(0, 0, R);
assert(Math.abs(x0 - R) < 1e-6, `x should be ${R}, got ${x0}`);
assert(Math.abs(y0) < 1e-6, `y should be 0, got ${y0}`);
assert(Math.abs(z0) < 1e-6, `z should be 0, got ${z0}`);

// Test North Pole (lat: 90, lon: 0) -> (0, R, 0)
const [xNorth, yNorth, zNorth] = geoToCoords(90, 0, R);
assert(Math.abs(xNorth) < 1e-6);
assert(Math.abs(yNorth - R) < 1e-6);
assert(Math.abs(zNorth) < 1e-6);

// Test South Pole (lat: -90, lon: 0) -> (0, -R, 0)
const [xSouth, ySouth, zSouth] = geoToCoords(-90, 0, R);
assert(Math.abs(xSouth) < 1e-6);
assert(Math.abs(ySouth - (-R)) < 1e-6);

console.log('✓ Spherical coordinate conversion self-check passed.');
