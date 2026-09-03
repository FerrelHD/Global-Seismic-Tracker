import React, { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { geoToCoords } from '../../utils/geoTo3d';

interface GlobeProps {
  radius?: number;
}

// Procedural anti-aliased circular particle texture for dots
function getCircleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(32, 32, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const Globe: React.FC<GlobeProps> = ({ radius = 2.5 }) => {
  const [landDots, setLandDots] = useState<number[][]>([]);

  // Load precomputed land dots (7,849 WGS84 coordinates)
  useEffect(() => {
    fetch('/data/land-dots.json')
      .then((res) => res.json())
      .then((data) => setLandDots(data))
      .catch((err) => console.error('Failed to load land dots:', err));
  }, []);

  // Convert 2D [lat, lon] coordinates into 3D Float32Array buffer
  const { positions, dotTexture } = useMemo(() => {
    const coords: number[] = [];
    const r = radius + 0.006; // Elevated just above white sphere

    for (let i = 0; i < landDots.length; i++) {
      const [lat, lon] = landDots[i];
      const [x, y, z] = geoToCoords(lat, lon, r);
      coords.push(x, y, z);
    }

    return {
      positions: new Float32Array(coords),
      dotTexture: getCircleTexture(),
    };
  }, [landDots, radius]);

  return (
    <group>
      {/* 1. Pure Pearl White Core Sphere (Soft diffuse 3D shading) */}
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.65}
          metalness={0.05}
        />
      </mesh>

      {/* 2. Cobe-Style Graphite Halftone Dotted Landmass */}
      {positions.length > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.038}
            map={dotTexture}
            transparent
            opacity={0.82}
            color="#1e293b" // Deep graphite / charcoal
            sizeAttenuation={true}
            depthWrite={false}
          />
        </points>
      )}

      {/* 3. Subtle Clean Graticule Lines (Latitude & Longitude) */}
      <mesh>
        <sphereGeometry args={[radius + 0.002, 36, 18]} />
        <meshBasicMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* 4. Subtle Outer Shadow Halo Rim for 3D Depth */}
      <mesh scale={[1.008, 1.008, 1.008]}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          color="#cbd5e1"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>
    </group>
  );
};
