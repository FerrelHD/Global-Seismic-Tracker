import * as THREE from 'three';

/**
 * Converts geographic coordinates (Latitude, Longitude) in degrees to 3D Cartesian coordinates (X, Y, Z).
 *
 * Mathematical spherical conversion:
 *   x =  R * cos(lat) * cos(lon)
 *   y =  R * sin(lat)
 *   z = -R * cos(lat) * sin(lon)
 */
export function geoToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  const cosLat = Math.cos(latRad);
  const x = radius * cosLat * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * cosLat * Math.sin(lonRad);

  return new THREE.Vector3(x, y, z);
}

export function geoToCoords(lat: number, lon: number, radius: number): [number, number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  const cosLat = Math.cos(latRad);
  const x = radius * cosLat * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * cosLat * Math.sin(lonRad);

  return [x, y, z];
}
