import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

// Optimized: Use instanced mesh for ALL candlesticks (massive performance boost)
function CandlestickInstances() {
  const greenRef = useRef();
  const redRef = useRef();
  const groupRef = useRef();
  
  const count = 40; // Reduced from 144
  
  const { greenMatrices, redMatrices, greenCount, redCount } = useMemo(() => {
    const green = [];
    const red = [];
    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempScale = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    
    const gridSize = 6; // Reduced grid
    const spacing = 1.8;
    
    for (let x = -gridSize / 2; x < gridSize / 2; x++) {
      for (let z = -gridSize / 2; z < gridSize / 2; z++) {
        const distFromCenter = Math.sqrt(x * x + z * z);
        const height = 1 + Math.sin(distFromCenter * 0.8) * 1.5 + Math.random() * 1.5;
        
        // More red at edges
        const isGreen = distFromCenter > 2.5 ? Math.random() > 0.6 : Math.random() > 0.25;
        
        tempPosition.set(x * spacing, height / 2, z * spacing);
        tempScale.set(0.35, height, 0.35);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        
        if (isGreen) {
          green.push(tempMatrix.clone());
        } else {
          red.push(tempMatrix.clone());
        }
      }
    }
    
    return { 
      greenMatrices: green, 
      redMatrices: red,
      greenCount: green.length,
      redCount: red.length
    };
  }, []);

  // Set instance matrices on mount
  React.useEffect(() => {
    if (greenRef.current) {
      greenMatrices.forEach((matrix, i) => {
        greenRef.current.setMatrixAt(i, matrix);
      });
      greenRef.current.instanceMatrix.needsUpdate = true;
    }
    if (redRef.current) {
      redMatrices.forEach((matrix, i) => {
        redRef.current.setMatrixAt(i, matrix);
      });
      redRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [greenMatrices, redMatrices]);

  // Slow rotation only
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.5, 0]}>
      {/* Green candlesticks - instanced */}
      <instancedMesh ref={greenRef} args={[null, null, greenCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={0.2}
          metalness={0.7}
          roughness={0.3}
        />
      </instancedMesh>
      
      {/* Red candlesticks - instanced */}
      <instancedMesh ref={redRef} args={[null, null, redCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color="#ff4757"
          emissive="#ff4757"
          emissiveIntensity={0.2}
          metalness={0.7}
          roughness={0.3}
        />
      </instancedMesh>
      
      {/* Simple base platform */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[8, 9, 0.2, 32]} />
        <meshStandardMaterial 
          color="#0a0a15"
          metalness={0.9}
          roughness={0.3}
        />
      </mesh>
      
      {/* Grid - static, no animation */}
      <gridHelper args={[16, 16, '#1a1a3a', '#1a1a3a']} position={[0, -0.15, 0]} />
    </group>
  );
}

// Simplified particles - fewer, no per-frame updates
function SimpleParticles() {
  const ref = useRef();
  const count = 50; // Reduced from 200
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = Math.random() * 8 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, []);

  // Simple rotation only - no per-particle updates
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#00ff88"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

// Main scene - simplified lighting
function Scene() {
  return (
    <>
      {/* Minimal lighting - removed point lights */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      
      {/* Reduced star count */}
      <Stars radius={80} depth={30} count={500} factor={3} saturation={0} fade speed={0.5} />
      
      {/* Main content */}
      <CandlestickInstances />
      <SimpleParticles />
      
      {/* Fog */}
      <fog attach="fog" args={['#0a0a15', 8, 25]} />
    </>
  );
}

// Exported component with optimized canvas settings
export default function CandlestickTerrain() {
  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%',
      background: 'linear-gradient(180deg, #0a0a15 0%, #12121f 50%, #0a0a15 100%)'
    }}>
      <Canvas
        camera={{ position: [0, 6, 10], fov: 55 }}
        dpr={[1, 1.5]} // Limit pixel ratio for performance
        performance={{ min: 0.5 }} // Allow frame rate drops
        gl={{ 
          antialias: false, // Disable antialiasing for performance
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
