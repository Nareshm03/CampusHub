'use client';
import { motion } from 'framer-motion';

export default function MicroInteractionsSafe({ children, type = 'hover', className = '' }) {
  // Using essentially the same safe defaults as MicroInteractions since
  // framer-motion is highly optimized and SSR safe.
  if (type === 'hover') {
    return (
      <motion.div className={className} whileHover={{ scale: 1.02 }} transition={{ ease: 'easeOut', duration: 0.2 }}>
        {children}
      </motion.div>
    );
  }
  
  if (type === 'click') {
    return (
      <motion.div className={className} whileTap={{ scale: 0.98 }} transition={{ ease: 'easeOut', duration: 0.1 }}>
        {children}
      </motion.div>
    );
  }

  return <div className={className}>{children}</div>;
}