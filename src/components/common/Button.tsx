import { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={`btn btn-${variant} btn-${size} ${loading ? 'loading' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" />
      ) : icon ? (
        <span className="btn-icon">{icon}</span>
      ) : null}
      <span className="btn-text">{children}</span>
    </button>
  );
}