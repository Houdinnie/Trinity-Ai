import React from 'react';
import { EducationModule } from '../components/EducationModule';
import { motion } from 'motion/react';

export function Academics() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-4">Academics</h1>
        <p className="text-gray-500 max-w-2xl">Master the art of trading with our interactive educational modules. From basic price action to advanced institutional flow.</p>
      </div>
      
      <EducationModule onBack={() => {}} />
    </motion.div>
  );
}
