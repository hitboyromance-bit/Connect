import { ReactNode } from "react";
import "./Card.css";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  padding = "md",
  onClick,
}: CardProps) {
  return (
    <div
      className={`card card-padding-${padding} ${
        onClick ? "clickable" : ""
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="card-header">
      <div className="card-header-content">
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="card-action">{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
}

export function CardContent({ children }: CardContentProps) {
  return <div className="card-content">{children}</div>;
}
