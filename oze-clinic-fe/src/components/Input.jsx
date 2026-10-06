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
  
  const baseClasses = 'w-full font-sans text-[14px] h-[40px] px-3 py-2.5 rounded-md border transition-shadow focus:outline-none placeholder:text-placeholder';
  
  let stateClasses = 'bg-canvas text-ink border-border-strong focus:shadow-focus';
  
  if (readOnly) {
    stateClasses = 'bg-surface-muted text-body border-transparent focus:shadow-none cursor-default';
  } else if (error) {
    stateClasses = 'bg-canvas text-ink border-danger-solid shadow-focus-danger';
  }

  return (
    <div className="flex flex-col gap-[6px] w-full">
      {label && (
        <label htmlFor={inputId} className="font-sans text-[14px] font-medium text-ink">
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
        <span className="font-sans text-[12px] text-danger-solid">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
