import React from 'react';

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-surface-muted disabled:text-placeholder border border-transparent',
  secondary: 'bg-canvas text-ink border border-border-strong hover:bg-surface-tint disabled:bg-surface-muted disabled:text-placeholder',
  'cta-public': 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active rounded-pill h-[48px] px-7 py-3.5',
  'text-link': 'bg-transparent text-primary hover:text-primary-hover active:text-primary-active underline-offset-4 hover:underline p-0 h-auto',
};

const defaultClasses = 'inline-flex items-center justify-center font-sans text-[14px] font-medium leading-none rounded-md transition-colors focus:outline-none focus:ring-3 focus:ring-primary/25 disabled:cursor-not-allowed';

export const Button = React.forwardRef(({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}, ref) => {
  // Base sizing for most buttons
  const isCtaOrText = variant === 'cta-public' || variant === 'text-link';
  const sizing = isCtaOrText ? '' : 'h-[40px] px-4 py-2.5';
  
  const variantClasses = variants[variant] || variants.primary;

  return (
    <button
      ref={ref}
      className={`${defaultClasses} ${sizing} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
