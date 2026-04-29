import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Layout } from './components/layout/Layout';
import { Employees } from './pages/Employees';
import { TimeClock } from './pages/TimeClock';
import { Payroll } from './pages/Payroll';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { AdminProfile } from './pages/AdminProfile';
import { Reports } from './pages/Reports';
import { MyPayroll } from './pages/MyPayroll';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { PendingApproval } from './pages/PendingApproval';
import { WorkSchedule } from './pages/WorkSchedule';
import { RoleHome } from './components/auth/RoleHome';
import { Landing } from './pages/Landing';
import { getCurrentUser } from './utils/currentUser';

function RequireAuth({ children }: { children: ReactNode }) {
  return getCurrentUser() ? children : <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pending" element={<PendingApproval />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<RoleHome />} />
          <Route path="employees" element={<Employees />} />
          <Route path="timeclock" element={<TimeClock />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="my-payroll" element={<MyPayroll />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<AdminProfile />} />
          <Route path="work-schedule" element={<WorkSchedule />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
