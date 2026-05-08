'use client';
import { motion } from 'framer-motion';

export default function MicroInteractions({ children, type = 'hover', className = '' }) {
  if (type === 'hover') {
    return (
      <motion.div className={className} whileHover={{ scale: 1.05, rotate: 2 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
        {children}
      </motion.div>
    );
  }
  
  if (type === 'click') {
    return (
      <motion.div className={className} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
        {children}
      </motion.div>
    );
  }

  if (type === 'pulse') {
    return (
      <motion.div className={className} animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}>
        {children}
      </motion.div>
    );
  }

  if (type === 'shake') {
    return (
      <motion.div className={className} whileHover={{ x: [0, -5, 5, -5, 5, 0] }} transition={{ duration: 0.4 }}>
        {children}
      </motion.div>
    );
  }

  // Float
  return (
    <motion.div className={className} animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
      {children}
    </motion.div>
  );
}