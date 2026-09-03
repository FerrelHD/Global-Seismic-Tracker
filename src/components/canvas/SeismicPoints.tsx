import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { SeismicEvent } from '../../types/seismic';
import { geoToVector3 } from '../../utils/geoTo3d';

interface SeismicPointsProps {
  events: SeismicEvent[];
  radius?: number;
  onHoverEvent?: (event: SeismicEvent | null, screenPos?: { x: number; y: number }) => void;
}

function getDepthColor(depth: number): THREE.Color {
  if (depth <= 30) {
    // Shallow: Vibrant Coral / Rose
    return new THREE.Color(0xe11d48);
  } else if (depth <= 100) {
    // Moderate: Radiant Warm Amber
    return new THREE.Color(0xd97706);
  } else {
    // Deep: Slate Navy / Indigo
    return new THREE.Color(0x3b82f6);
  }
}

export const SeismicPoints: React.FC<SeismicPointsProps> = ({
  events,
  radius = 2.5,
  onHoverEvent,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [, setHoveredIdx] = useState<number | null>(null);

  const count = events.length;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const upVector = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  // Clean, flat circular marker sitting flush on the globe surface (No tall spikes!)
  const markerGeometry = useMemo(() => {
    return new THREE.CircleGeometry(0.028, 16);
  }, []);

  useEffect(() => {
    if (!meshRef.current || count === 0) return;

    for (let i = 0; i < count; i++) {
      const evt = events[i];
      // Position directly on the surface + slight elevation to prevent z-fighting
      const pos = geoToVector3(evt.latitude, evt.longitude, radius + 0.008);

      dummy.position.copy(pos);

      // Orient the flat circular disk tangent to the spherical surface
      const normal = pos.clone().normalize();
      dummy.quaternion.setFromUnitVectors(upVector, normal);

      // Subtle scale according to magnitude (flat, no vertical extrusion!)
      const mag = evt.magnitude ?? 2.0;
      const scale = Math.max(0.7, (mag / 5.0) * 1.6);
      dummy.scale.set(scale, scale, 1);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const color = getDepthColor(evt.depth);
      meshRef.current.setColorAt(i, color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [events, radius, count, dummy, upVector]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && events[e.instanceId]) {
      setHoveredIdx(e.instanceId);
      document.body.style.cursor = 'pointer';
      if (onHoverEvent) {
        onHoverEvent(events[e.instanceId], {
          x: e.clientX,
          y: e.clientY,
        });
      }
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredIdx(null);
    document.body.style.cursor = 'default';
    if (onHoverEvent) {
      onHoverEvent(null);
    }
  };

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[markerGeometry, undefined, count]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
    </instancedMesh>
  );
};
