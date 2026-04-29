import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { firebaseService } from '../services/firebase';
import { mainPresenter } from '../presenters/main';
import { setCurrentUser } from '../utils/currentUser';
import type { SignupFormValues } from '../types';
import './Login.css';

export function Signup() {
  const navigate = useNavigate();
  const [values, setValues] = useState<SignupFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof SignupFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = mainPresenter.validateSignupForm(values);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    const result = await firebaseService.registerUser(
      values.email,
      values.password,
      `${values.firstName} ${values.lastName}`
    );
    setLoading(false);

    if (!result.success) {
      setMessage(result.error || 'Unable to create account.');
      return;
    }

    if (!result.data) {
      setMessage('Account was created, but no user profile was returned.');
      return;
    }

    setCurrentUser(result.data);
    navigate('/pending');
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">CN</div>
          <span>Connect</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Create account</h2>
          <p className="auth-sub">Your role will be assigned by an admin after signup</p>

          {message && <div className="auth-alert error">{message}</div>}

          <Input
            label="First Name"
            value={values.firstName}
            onChange={(event) => handleChange('firstName', event.target.value)}
            error={errors.firstName}
          />
          <Input
            label="Last Name"
            value={values.lastName}
            onChange={(event) => handleChange('lastName', event.target.value)}
            error={errors.lastName}
          />
          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={(event) => handleChange('email', event.target.value)}
            error={errors.email}
          />
          <Input
            label="Password"
            type="password"
            value={values.password}
            onChange={(event) => handleChange('password', event.target.value)}
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            type="password"
            value={values.confirmPassword}
            onChange={(event) => handleChange('confirmPassword', event.target.value)}
            error={errors.confirmPassword}
          />

          <Button type="submit" size="lg" loading={loading}>
            Create Account
          </Button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
