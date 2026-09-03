import * as THREE from 'three';

export const AtmosphereShader = {
  uniforms: {
    glowColor: { value: new THREE.Color(0x00d4ff) },
    coefficient: { value: 0.2 },
    power: { value: 3.5 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 glowColor;
    uniform float coefficient;
    uniform float power;

    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec3 viewDir = normalize(vViewPosition);
      // Backside atmospheric rim intensity
      float intensity = pow(coefficient + dot(vNormal, viewDir), power);
      intensity = clamp(intensity, 0.0, 1.0);
      gl_FragColor = vec4(glowColor, intensity * 0.85);
    }
  `,
};
