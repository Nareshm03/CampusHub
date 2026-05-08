'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function PageTransition({ children, transitionType = 'fade' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    switch (transitionType) {
      case 'fade':
        gsap.fromTo(container, 
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
        );
        break;

      case 'slide':
        gsap.fromTo(container,
          { x: 100, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
        );
        break;

      case 'scale':
        gsap.fromTo(container,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
        );
        break;

      case 'rotate':
        gsap.fromTo(container,
          { rotation: -5, scale: 0.9, opacity: 0 },
          { rotation: 0, scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }
        );
        break;

      case 'stagger':
        const elements = container.querySelectorAll('.stagger-item');
        gsap.fromTo(elements,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
        );
        break;
    }
  }, [transitionType]);

  return (
    <div ref={containerRef} className="w-full h-full">
      {children}
    </div>
  );
}