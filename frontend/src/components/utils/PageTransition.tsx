import React from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../../utils/animations';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '', style }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
