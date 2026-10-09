import React from 'react';

const variants = {
  success: 'bg-success-soft text-success',
  info: 'bg-primary-soft text-primary',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-muted text-body',
};

export const Badge = ({ 
  children, 
  variant = 'neutral', 
  className = '' 
}) => {
  const variantClasses = variants[variant] || variants.neutral;

  return (
    <span className={`inline-flex items-center justify-center font-sans text-[12px] font-medium px-2.5 py-0.5 rounded-pill whitespace-nowrap ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
