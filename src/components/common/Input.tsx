import { InputHTMLAttributes, forwardRef } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, className = '', ...props },
  ref
) {
  return (
    <div className={`input-group ${error ? 'has-error' : ''} ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <input 
        ref={ref}
        className="input-field"
        {...props}
      />
      {error && <span className="input-error">{error}</span>}
      {helperText && !error && <span className="input-helper">{helperText}</span>}
    </div>
  );
});