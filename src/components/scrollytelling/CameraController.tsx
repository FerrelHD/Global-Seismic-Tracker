import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SeismicEvent } from '../../types/seismic';
import { geoToVector3 } from '../../utils/geoTo3d';

interface CameraControllerProps {
  topEvent: SeismicEvent | null;
  radius?: number;
  onChapterChange?: (chapter: number) => void;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  topEvent,
  radius = 2.5,
  onChapterChange,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Targets for camera lerping
  const targetCamPos = useRef(new THREE.Vector3(0, 1.2, 5.5));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const enableOrbit = useRef(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Compute epicentral focal point
    let epicentralPos = new THREE.Vector3(2.5, 0, 0);
    if (topEvent) {
      epicentralPos = geoToVector3(topEvent.latitude, topEvent.longitude, radius);
    }

    const epicentralCamPos = epicentralPos.clone().normalize().multiplyScalar(radius + 1.2);
    // Depth slice perspective: tangential angled slice
    const sliceCamPos = epicentralPos
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5)
      .multiplyScalar(radius + 0.8)
      .add(new THREE.Vector3(0, -0.3, 0));

    const trigger = ScrollTrigger.create({
      trigger: '#story-scroll-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
      onUpdate: (self) => {
        const p = self.progress;

        if (p < 0.28) {
          // Chapter 1: Global Pulse
          enableOrbit.current = false;
          targetCamPos.current.set(0, 1.2, 5.5);
          targetLookAt.current.set(0, 0, 0);
          onChapterChange?.(1);
        } else if (p < 0.58) {
          // Chapter 2: Critical Epistrum
          enableOrbit.current = false;
          targetCamPos.current.copy(epicentralCamPos);
          targetLookAt.current.copy(epicentralPos);
          onChapterChange?.(2);
        } else if (p < 0.82) {
          // Chapter 3: Depth Slice
          enableOrbit.current = false;
          targetCamPos.current.copy(sliceCamPos);
          targetLookAt.current.copy(epicentralPos);
          onChapterChange?.(3);
        } else {
          // Chapter 4: Free Exploration (Handoff to OrbitControls)
          enableOrbit.current = true;
          targetCamPos.current.set(0, 1.5, 5.2);
          targetLookAt.current.set(0, 0, 0);
          onChapterChange?.(4);
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, [topEvent, radius, onChapterChange]);

  // Smooth frame lerp towards target camera position & lookAt
  useFrame((_, delta) => {
    if (!enableOrbit.current) {
      camera.position.lerp(targetCamPos.current, delta * 3.5);
      currentLookAt.current.lerp(targetLookAt.current, delta * 4.0);
      camera.lookAt(currentLookAt.current);
    } else if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={enableOrbit.current}
      enablePan={false}
      enableZoom={true}
      minDistance={3.0}
      maxDistance={9.5}
      rotateSpeed={0.6}
      dampingFactor={0.05}
    />
  );
};
