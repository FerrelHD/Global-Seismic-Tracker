import fs from 'node:fs';

const landData = JSON.parse(fs.readFileSync('./public/data/ne_110m_land.json', 'utf-8'));

function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInFeature(point, feature) {
  const geometry = feature.geometry;
  if (geometry.type === 'Polygon') {
    const coordinates = geometry.coordinates;
    if (!pointInPolygon(point, coordinates[0])) return false;
    for (let i = 1; i < coordinates.length; i++) {
      if (pointInPolygon(point, coordinates[i])) return false;
    }
    return true;
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      if (pointInPolygon(point, polygon[0])) {
        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
          if (pointInPolygon(point, polygon[i])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }
  return false;
}

const dots = [];
const STEP = 1.6; // Degree spacing for clean halftone density

for (let lng = -180; lng <= 180; lng += STEP) {
  for (let lat = -85; lat <= 85; lat += STEP) {
    const pt = [lng, lat];
    for (const feature of landData.features) {
      if (pointInFeature(pt, feature)) {
        // Round to 2 decimals to save file size
        dots.push([Number(lat.toFixed(2)), Number(lng.toFixed(2))]);
        break;
      }
    }
  }
}

console.log(`Generated ${dots.length} land dots.`);
fs.writeFileSync('./public/data/land-dots.json', JSON.stringify(dots));
console.log('Saved to public/data/land-dots.json');
