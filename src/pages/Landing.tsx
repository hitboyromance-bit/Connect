import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Landing.css';

export function Landing() {
  const [role, setRole] = useState<'admin' | 'employee'>('admin');
  const [activeFeature, setActiveFeature] = useState<'clock' | 'breaks' | 'schedule' | 'roles' | null>(null);
  const [clockTime, setClockTime] = useState(new Date());
  const now = useMemo(() => new Date(), []);
  const roleCopy = role === 'admin'
    ? {
        title: 'Run shifts, clock-ins, and employee records from one calm workspace.',
        body: 'Connect gives admins a clear view of schedules, approvals, hours, payroll, and employee details without jumping between tools.',
      }
    : {
        title: 'Know your shift, track your time, and keep your workday simple.',
        body: 'Employees can see weekly schedules, clock in, clock out, track meal breaks, and review today’s hours in seconds.',
      };

  useEffect(() => {
    if (activeFeature !== 'clock') return undefined;
    const interval = window.setInterval(() => setClockTime(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [activeFeature]);

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link to="/home" className="landing-logo">
          <span>CN</span>
          <strong>Connect</strong>
        </Link>
        <div className="landing-actions">
          <Link to="/login">Sign in</Link>
          <Link to="/signup" className="landing-action-primary">Create account</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">HR scheduling and time tracking</span>
          <div key={role} className="landing-copy-toggle">
            <h1>{roleCopy.title}</h1>
            <p>{roleCopy.body}</p>
          </div>
          <div className="role-switch" aria-label="Preview role">
            <button className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}>Admin</button>
            <button className={role === 'employee' ? 'active' : ''} onClick={() => setRole('employee')}>Employee</button>
          </div>
          <div className="landing-cta-row">
            <Link to="/login" className="landing-cta">Sign in</Link>
            <Link to="/signup" className="landing-secondary">Create account</Link>
          </div>
          <div className="feature-pills">
            <button type="button" onClick={() => toggleFeature('clock')}>Live clock</button>
            <button type="button" onClick={() => toggleFeature('breaks')}>Meal breaks</button>
            <button type="button" onClick={() => toggleFeature('schedule')}>Weekly schedules</button>
            <button type="button" onClick={() => toggleFeature('roles')}>Role-based dashboards</button>
          </div>
          <FeaturePreview activeFeature={activeFeature} clockTime={clockTime} />
        </div>

        <div className="landing-preview" aria-label="Connect dashboard preview">
          <div className="preview-header">
            <span>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            <strong>42h 18m</strong>
          </div>
          <div className="preview-grid">
            <PreviewMetric icon={<Users size={20} />} label="Employees" value="24" />
            <PreviewMetric icon={<Clock size={20} />} label="Clocked in" value="8" />
            <PreviewMetric icon={<CalendarDays size={20} />} label="Shifts" value="16" />
            <PreviewMetric icon={<ShieldCheck size={20} />} label="Approved" value="98%" />
          </div>
          <div className="preview-schedule">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => (
              <div key={day}>
                <span>{day}</span>
                <i style={{ height: `${54 + index * 8}px`, animationDelay: `${index * 120}ms` }} />
              </div>
            ))}
          </div>
          <div className="preview-toast">
            <Clock size={16} />
            <span>{role === 'admin' ? '3 employees clocked in this hour' : 'Next shift starts at 9:00 AM'}</span>
          </div>
        </div>
      </section>
    </main>
  );

  function toggleFeature(feature: NonNullable<typeof activeFeature>) {
    setActiveFeature((current) => current === feature ? null : feature);
  }
}

function PreviewMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="preview-metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FeaturePreview({
  activeFeature,
  clockTime,
}: {
  activeFeature: 'clock' | 'breaks' | 'schedule' | 'roles' | null;
  clockTime: Date;
}) {
  if (!activeFeature) return null;

  if (activeFeature === 'clock') {
    const seconds = clockTime.getSeconds();
    const minutes = clockTime.getMinutes();
    const hours = clockTime.getHours() % 12;

    return (
      <div className="feature-preview clock-feature">
        <div className="wall-clock" aria-label="Analog live clock">
          <span className="clock-dot" />
          <i className="hand hour-hand" style={{ transform: `rotate(${hours * 30 + minutes * 0.5}deg)` }} />
          <i className="hand minute-hand" style={{ transform: `rotate(${minutes * 6}deg)` }} />
          <i className="hand second-hand" style={{ transform: `rotate(${seconds * 6}deg)` }} />
          {[
            ['XII', 'n12'],
            ['III', 'n3'],
            ['VI', 'n6'],
            ['IX', 'n9'],
            ['I', 'n1'],
            ['II', 'n2'],
            ['IV', 'n4'],
            ['V', 'n5'],
            ['VII', 'n7'],
            ['VIII', 'n8'],
            ['X', 'n10'],
            ['XI', 'n11'],
          ].map(([number, className]) => <b key={number} className={`clock-num ${className}`}>{number}</b>)}
        </div>
        <div>
          <span>Live Clock</span>
          <strong className="digital-time">
            {clockTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </strong>
          <small>{clockTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</small>
        </div>
      </div>
    );
  }

  if (activeFeature === 'breaks') {
    return (
      <div className="feature-preview">
        <span>Meal Break</span>
        <strong>32:14 remaining</strong>
        <div className="break-progress"><i /></div>
        <small>One-hour break tracking, styled like the employee dashboard.</small>
      </div>
    );
  }

  if (activeFeature === 'schedule') {
    return (
      <div className="feature-preview">
        <span>Weekly Schedule</span>
        <div className="mini-week">
          {['M', 'T', 'W', 'T', 'F'].map((day, index) => (
            <div key={day}>
              <strong>{day}</strong>
              <small>{index === 2 ? '10-4' : '9-5'}</small>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="feature-preview">
      <span>Role-Based Dashboards</span>
      <div className="role-cards">
        <b>Admin</b>
        <b>Employee</b>
      </div>
      <small>Each user sees only the tools they need.</small>
    </div>
  );
}
