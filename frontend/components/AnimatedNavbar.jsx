'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import anime from 'animejs';
import MicroInteractions from './MicroInteractions';

export default function AnimatedNavbar({ navItems = [] }) {
  const navRef = useRef(null);
  const logoRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();
    
    // Navbar entrance animation
    tl.from(navRef.current, {
      y: -100,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out'
    })
    .from('.nav-item', {
      y: -30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'back.out(1.7)'
    }, '-=0.3');

    // Logo animation with Anime.js
    anime({
      targets: logoRef.current,
      rotate: [0, 360],
      scale: [0.8, 1],
      duration: 1000,
      easing: 'easeOutElastic(1, .8)',
      delay: 500
    });
  }, []);

  return (
    <nav ref={navRef} className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <MicroInteractions type="hover">
          <div ref={logoRef} className="text-white text-2xl font-bold cursor-pointer">
            CampusHub
          </div>
        </MicroInteractions>
        
        <div className="flex space-x-6">
          {navItems.map((item, index) => (
            <MicroInteractions key={index} type="hover" className="nav-item">
              <a 
                href={item.href}
                className="text-white hover:text-blue-200 transition-colors duration-300 px-3 py-2 rounded-lg"
              >
                {item.label}
              </a>
            </MicroInteractions>
          ))}
        </div>
      </div>
    </nav>
  );
}