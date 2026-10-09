import React from 'react';

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active border border-transparent shadow-sm hover:shadow-md focus:ring-4 focus:ring-primary/20',
  secondary: 'bg-canvas text-ink border border-border-strong hover:bg-surface-tint hover:border-gray-400 active:bg-surface-muted shadow-sm focus:ring-4 focus:ring-gray-200',
  'cta-public': 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active rounded-full h-[48px] px-8 shadow-md hover:shadow-lg focus:ring-4 focus:ring-primary/20',
  'text-link': 'bg-transparent text-primary hover:text-primary-hover active:text-primary-active underline-offset-4 hover:underline p-0 h-auto',
};

const defaultClasses = 'inline-flex items-center justify-center font-sans text-body-sm font-medium leading-none rounded-lg transition-all duration-200 active:scale-[0.98] outline-none disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100';

export const Button = React.forwardRef(({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}, ref) => {
  // Base sizing for most buttons
  const isCtaOrText = variant === 'cta-public' || variant === 'text-link';
  const sizing = isCtaOrText ? '' : 'h-11 px-5 py-2.5';
  
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
