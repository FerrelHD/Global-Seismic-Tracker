import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SeismicEvent } from '../../types/seismic';
import { geoToVector3 } from '../../utils/geoTo3d';

interface SeismicRipplesProps {
  events: SeismicEvent[];
  radius?: number;
}

export const SeismicRipples: React.FC<SeismicRipplesProps> = ({ events, radius = 2.5 }) => {
  // Take the most prominent events (e.g. magnitude >= 4.0 or top 25) to avoid over-cluttering
  const topEvents = useMemo(() => {
    return events
      .filter((e) => (e.magnitude ?? 0) >= 3.8)
      .slice(0, 25);
  }, [events]);

  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  // Reusable ring geometry & up vector
  const ringGeom = useMemo(() => new THREE.RingGeometry(0.02, 0.055, 32), []);
  const upVector = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  // Compute position and orientation for each ripple anchor
  const rippleAnchors = useMemo(() => {
    return topEvents.map((evt) => {
      const pos = geoToVector3(evt.latitude, evt.longitude, radius + 0.008);
      const normal = pos.clone().normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normal);
      
      const isHigh = (evt.magnitude ?? 0) >= 5.0;
      const color = isHigh ? '#f43f5e' : evt.depth > 70 ? '#f59e0b' : '#00f0ff';

      return { pos, quaternion, color, mag: evt.magnitude ?? 4 };
    });
  }, [topEvents, radius, upVector]);

  useFrame((_, delta) => {
    timeRef.current += delta * 1.5;
    if (!groupRef.current) return;

    groupRef.current.children.forEach((child, idx) => {
      const ringMesh = child as THREE.Mesh;
      const mat = ringMesh.material as THREE.MeshBasicMaterial;
      
      // Phase offset based on index so they don't all pulse identically
      const phase = (timeRef.current + idx * 0.4) % 2.0;
      const progress = phase / 2.0; // 0 to 1

      // Expand outward and fade out
      const scale = 0.5 + progress * 2.8;
      ringMesh.scale.set(scale, scale, 1);
      mat.opacity = (1.0 - progress) * 0.75;
    });
  });

  if (rippleAnchors.length === 0) return null;

  return (
    <group ref={groupRef}>
      {rippleAnchors.map((item, idx) => (
        <mesh
          key={idx}
          geometry={ringGeom}
          position={item.pos}
          quaternion={item.quaternion}
        >
          <meshBasicMaterial
            color={item.color}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};
