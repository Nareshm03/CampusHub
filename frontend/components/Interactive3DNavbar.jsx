'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

function FloatingNavItem({ position, text, href, onClick }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group
      ref={meshRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={onClick}
    >
      <mesh>
        <boxGeometry args={[1.5, 0.4, 0.1]} />
        <meshStandardMaterial 
          color={hovered ? '#3b82f6' : '#6b7280'} 
          transparent
          opacity={hovered ? 0.9 : 0.7}
        />
      </mesh>
      <Text
        position={[0, 0, 0.1]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </group>
  );
}

export default function Interactive3DNavbar({ navItems = [] }) {
  const handleNavClick = (href) => {
    window.location.href = href;
  };

  return (
    <div className="h-20 w-full bg-gradient-to-r from-gray-900 to-blue-900">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={0.8} />
        
        {navItems.map((item, index) => (
          <FloatingNavItem
            key={item.text}
            position={[(index - navItems.length/2) * 2, 0, 0]}
            text={item.text}
            href={item.href}
            onClick={() => handleNavClick(item.href)}
          />
        ))}
        
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}