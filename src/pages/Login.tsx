import { FormEvent, useState } from 'react';
import { Lock, LogIn, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { firebaseService } from '../services/firebase';
import { mainPresenter } from '../presenters/main';
import { normalizeCurrentUser, setCurrentUser } from '../utils/currentUser';
import type { LoginFormValues } from '../types';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState<LoginFormValues>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof LoginFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = mainPresenter.validateLoginForm(values);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    const result = await firebaseService.loginUser(values.email, values.password);
    setLoading(false);

    if (!result.success) {
      setMessage(result.error || 'Unable to sign in.');
      return;
    }

    if (!result.data) {
      setMessage('Login succeeded, but no user profile was returned.');
      return;
    }

    const user = normalizeCurrentUser(result.data);
    setCurrentUser(user);

    if (user.role === 'pending') {
      navigate('/pending');
      return;
    }

    navigate(user.role === 'employee' ? '/work-schedule' : '/');
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">CN</div>
          <span>Connect</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
          <h2>Welcome back</h2>
          <p className="auth-sub">Sign in to manage your work schedule</p>

          {message && <div className="auth-alert error">{message}</div>}

          <div className="login-input-wrap">
            <Mail size={18} />
            <Input
              label="Email"
              type="email"
              name="login-email"
              autoComplete="off"
              value={values.email}
              onChange={(event) => handleChange('email', event.target.value)}
              error={errors.email}
            />
          </div>

          <div className="login-input-wrap">
            <Lock size={18} />
            <Input
              label="Password"
              type="password"
              name="login-password"
              autoComplete="new-password"
              value={values.password}
              onChange={(event) => handleChange('password', event.target.value)}
              error={errors.password}
            />
          </div>

          <Button type="submit" size="lg" icon={<LogIn size={18} />} loading={loading}>
            Sign in
          </Button>

          <p className="auth-switch">
            No account? <Link to="/signup">Create one</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
