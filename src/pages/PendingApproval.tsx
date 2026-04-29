import { Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { clearCurrentUser } from '../utils/currentUser';
import './Login.css';

export function PendingApproval() {
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    clearCurrentUser();
    navigate('/login');
  };

  return (
    <main className="auth-page">
      <section className="auth-card pending-card">
        <div className="pending-icon">
          <Hourglass size={42} />
        </div>
        <form className="auth-form">
          <h2>Account Pending</h2>
          <p className="auth-sub">
            Your account is waiting for an admin to assign your role. You will be able
            to continue after approval.
          </p>
          <Button type="button" size="lg" onClick={handleBackToLogin}>
            Back to Login
          </Button>
        </form>
      </section>
    </main>
  );
}
