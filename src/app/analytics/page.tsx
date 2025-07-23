'use client';

import React from 'react';
import { motion } from 'framer-motion';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-background via-background to-background/50 p-6"
    >
      <AnalyticsDashboard />
    </motion.div>
  );
}