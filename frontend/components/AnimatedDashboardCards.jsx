'use client';
import { motion } from 'framer-motion';
import MicroInteractions from './MicroInteractions';

export default function AnimatedDashboardCards({ cards = [] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {cards.map((card, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
          whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
          whileTap={{ scale: 0.98 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg cursor-pointer border border-gray-200 dark:border-gray-700 transition-colors"
        >
          <motion.div 
            className="card-icon text-4xl mb-4 inline-block"
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            {card.icon}
          </motion.div>
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            {card.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {card.description}
          </p>
          <MicroInteractions type="hover">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              {card.action || 'View Details'}
            </button>
          </MicroInteractions>
        </motion.div>
      ))}
    </div>
  );
}