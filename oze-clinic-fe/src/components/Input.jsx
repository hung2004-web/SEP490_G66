import React from 'react';

export const Input = React.forwardRef(({ 
  className = '', 
  label,
  error,
  readOnly,
  id,
  ...props 
}, ref) => {
  
  const inputId = id || Math.random().toString(36).substring(2, 9);
  
  const baseClasses = 'w-full font-sans text-body-sm h-11 px-4 py-2.5 rounded-lg border transition-all duration-200 outline-none placeholder:text-placeholder';
  
  let stateClasses = 'bg-canvas text-ink border-border-strong hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/15 shadow-sm';
  
  if (readOnly) {
    stateClasses = 'bg-surface-muted text-body border-transparent focus:shadow-none cursor-default';
  } else if (error) {
    stateClasses = 'bg-canvas text-ink border-danger-solid focus:border-danger-solid focus:ring-4 focus:ring-danger-solid/15 shadow-sm';
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="font-sans text-label font-medium text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        readOnly={readOnly}
        className={`${baseClasses} ${stateClasses} ${className}`}
        {...props}
      />
      {error && (
        <span className="font-sans text-caption text-danger-solid mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
