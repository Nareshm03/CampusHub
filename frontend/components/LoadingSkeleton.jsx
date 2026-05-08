'use client';
import { motion } from 'framer-motion';

export default function LoadingSkeleton({ type = 'card', count = 3 }) {
  const skeletonVariants = {
    initial: { opacity: 0.6 },
    animate: { opacity: 1 },
  };

  if (type === 'table') {
    return (
      <div className="card p-6">
        <div className="skeleton h-8 w-48 mb-6"></div>
        <div className="space-y-4">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="skeleton h-4 w-1/4"></div>
              <div className="skeleton h-4 w-1/4"></div>
              <div className="skeleton h-4 w-1/4"></div>
              <div className="skeleton h-4 w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          variants={skeletonVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: i * 0.1 }}
          className="card p-6"
        >
          <div className="skeleton h-6 w-3/4 mb-4"></div>
          <div className="skeleton h-4 w-full mb-2"></div>
          <div className="skeleton h-4 w-2/3"></div>
        </motion.div>
      ))}
    </div>
  );
}