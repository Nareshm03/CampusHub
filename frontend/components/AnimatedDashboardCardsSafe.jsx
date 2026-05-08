'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import MicroInteractionsSafe from './MicroInteractionsSafe';

export default function AnimatedDashboardCardsSafe({ cards = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const cardElements = containerRef.current?.querySelectorAll('.dashboard-card');
    if (!cardElements || typeof window === 'undefined') return;
    
    cardElements?.forEach((card, index) => {
      gsap.fromTo(card, 
        {
          y: 100,
          opacity: 0,
          scale: 0.8,
          rotation: -5
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 0.8,
          ease: 'power3.out',
          delay: index * 0.1
        }
      );

      card.addEventListener('mouseenter', () => {
        gsap.to(card, {
          y: -10,
          scale: 1.02,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          duration: 0.3,
          ease: 'power2.out'
        });
        
        const icon = card.querySelector('.card-icon');
        if (icon) {
          gsap.to(icon, {
            rotation: 360,
            scale: 1.2,
            duration: 0.6,
            ease: 'back.out(1.7)'
          });
        }
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          y: 0,
          scale: 1,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      card.addEventListener('click', () => {
        gsap.to(card, {
          scale: 0.95,
          duration: 0.1,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(card, { scale: 1, duration: 0.1 });
          }
        });
      });
    });
  }, []);

  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="dashboard-card bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg cursor-pointer border border-gray-200 dark:border-gray-700"
        >
          <div className="card-icon text-4xl mb-4">
            {card.icon}
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            {card.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {card.description}
          </p>
          <MicroInteractionsSafe type="hover">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              {card.action || 'View Details'}
            </button>
          </MicroInteractionsSafe>
        </div>
      ))}
    </div>
  );
}