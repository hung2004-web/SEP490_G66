import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// passwordToggle: for type="password", adds an eye button that shows / hides what was typed.
export const Input = React.forwardRef(({
  className = '',
  label,
  error,
  readOnly,
  id,
  type,
  passwordToggle = false,
  ...props
}, ref) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const hasToggle = passwordToggle && type === 'password';
  const toggleLabel = passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
  const ToggleIcon = passwordVisible ? EyeOff : Eye;

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
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={hasToggle && passwordVisible ? 'text' : type}
          readOnly={readOnly}
          className={`${baseClasses} ${stateClasses} ${hasToggle ? 'pr-11' : ''} ${className}`}
          {...props}
        />
        {hasToggle && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-lg text-muted hover:text-ink"
            aria-label={toggleLabel}
            aria-pressed={passwordVisible}
            title={toggleLabel}
            onClick={() => setPasswordVisible((current) => !current)}
          >
            <ToggleIcon className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {error && (
        <span className="font-sans text-caption text-danger-solid mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
