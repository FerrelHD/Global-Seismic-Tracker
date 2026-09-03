import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Globe } from './Globe';
import { SeismicPoints } from './SeismicPoints';
import { FloatingSeismicBadges } from './FloatingSeismicBadges';
import { CameraController } from '../scrollytelling/CameraController';
import { SeismicEvent, HoveredEventState } from '../../types/seismic';

interface SeismicSceneProps {
  events: SeismicEvent[];
  topEvent: SeismicEvent | null;
  onHoverStateChange: (state: HoveredEventState | null) => void;
  onChapterChange?: (chapter: number) => void;
}

export const SeismicScene: React.FC<SeismicSceneProps> = ({
  events,
  topEvent,
  onHoverStateChange,
  onChapterChange,
}) => {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 5.5], fov: 45 }}
      dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      className="w-full h-full"
    >
      {/* Pure White Background (Cobe light aesthetic) */}
      <color attach="background" args={['#FFFFFF']} />

      {/* Balanced High-Key Lighting */}
      <ambientLight intensity={0.95} />
      <directionalLight position={[10, 15, 10]} intensity={0.7} color="#ffffff" />
      <directionalLight position={[-10, -5, -10]} intensity={0.3} color="#f1f5f9" />

      <Suspense fallback={null}>
        {/* Unified Earth Coordinate System */}
        <group name="unified-earth-system">
          <Globe radius={2.2} />
          <SeismicPoints
            events={events}
            radius={2.2}
            onHoverEvent={(event, screenPos) => {
              if (event && screenPos) {
                onHoverStateChange({ event, screenPos });
              } else {
                onHoverStateChange(null);
              }
            }}
          />
          <FloatingSeismicBadges events={events} radius={2.2} />
        </group>

        <CameraController
          topEvent={topEvent}
          radius={2.2}
          onChapterChange={onChapterChange}
        />
      </Suspense>
    </Canvas>
  );
};
