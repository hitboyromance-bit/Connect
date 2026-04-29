import { useEffect, useState } from 'react';
import { ArrowLeft, Banknote, Clock, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { getCurrentUser, getCurrentUserDisplay } from '../utils/currentUser';
import { getRoleHomePath } from '../utils/roleNavigation';
import { firebaseService } from '../services/firebase';
import type { BankDetails, Employee, PayrollRecord, TimeRecord } from '../types';
import './AdminProfile.css';

function getRecordSeconds(record: TimeRecord) {
  return record.totalSeconds ?? Math.round(record.totalHours * 3600);
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function dateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function AdminProfile() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const currentUser = getCurrentUserDisplay();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const accessTitle = user?.role === 'employee' ? 'Employee Access' : 'Admin Access';
  const accessItems = user?.role === 'employee'
    ? ['View weekly schedule', 'Review time clock activity', 'Read notifications', 'Manage profile settings']
    : ['Manage employee records', 'Review time clock activity', 'View payroll records', 'Manage notification preferences'];
  const totalSeconds = timeRecords.reduce((sum, record) => sum + getRecordSeconds(record), 0);
  const netPay = payrollRecords.reduce((sum, record) => sum + record.netSalary, 0);

  useEffect(() => {
    if (!user) return;

    const loadProfileData = async () => {
      const employeesResult = await firebaseService.getEmployees();
      const employees = employeesResult.data || [];
      const linkedEmployee = employees.find(item =>
        item.id === user.uid || item.email.toLowerCase() === user.email.toLowerCase()
      ) || null;
      const endDate = dateKey(new Date());
      const startDate = dateKey(addDays(new Date(), -90));
      const [timeResult, payrollResult, bankResult] = await Promise.all([
        linkedEmployee
          ? firebaseService.getTimeRecordsByDateRange(startDate, endDate, linkedEmployee.id)
          : Promise.resolve({ success: true, data: [] as TimeRecord[] }),
        linkedEmployee
          ? firebaseService.getPayrollRecords(linkedEmployee.id)
          : Promise.resolve({ success: true, data: [] as PayrollRecord[] }),
        firebaseService.getBankDetails(user.uid),
      ]);
      setEmployee(linkedEmployee);
      setTimeRecords(timeResult.data || []);
      setPayrollRecords(payrollResult.data || []);
      setBankDetails(bankResult.data || null);
    };

    loadProfileData();
  }, [user]);

  return (
    <div className="admin-profile-page">
      <div className="profile-top-actions">
        <Button
          variant="secondary"
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate(getRoleHomePath(user))}
        >
          Back to dashboard
        </Button>
      </div>

      <div className="admin-profile-header">
        <div className="admin-profile-avatar">
          <User size={34} />
        </div>
        <div>
          <h2>{currentUser.name}</h2>
          <p className="subtitle">{currentUser.role} account overview</p>
        </div>
      </div>

      <div className="admin-profile-grid">
        <Card>
          <CardHeader title="Profile Details" subtitle="Current account" />
          <CardContent>
            <div className="profile-detail-list">
              <div className="profile-detail">
                <User size={18} />
                <div>
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{currentUser.name}</span>
                </div>
              </div>
              <div className="profile-detail">
                <Mail size={18} />
                <div>
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{currentUser.email}</span>
                </div>
              </div>
              <div className="profile-detail">
                <Phone size={18} />
                <div>
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">+1 555-0100</span>
                </div>
              </div>
              <div className="profile-detail">
                <ShieldCheck size={18} />
                <div>
                  <span className="detail-label">Role</span>
                  <span className="detail-value">{currentUser.role}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={accessTitle} subtitle="Available permissions" />
          <CardContent>
            <div className="permission-list">
              {accessItems.map(item => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <Button className="profile-action" onClick={() => navigate('/settings')}>
              Edit profile settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Work Summary" subtitle="Connected employee details" />
          <CardContent>
            <div className="profile-detail-list">
              <div className="profile-detail">
                <Clock size={18} />
                <div>
                  <span className="detail-label">Tracked Time</span>
                  <span className="detail-value">{formatDuration(totalSeconds)}</span>
                </div>
              </div>
              <div className="profile-detail">
                <Banknote size={18} />
                <div>
                  <span className="detail-label">Payroll Total</span>
                  <span className="detail-value">${netPay.toLocaleString()}</span>
                </div>
              </div>
              <div className="profile-detail">
                <ShieldCheck size={18} />
                <div>
                  <span className="detail-label">Bank Wire</span>
                  <span className="detail-value">
                    {bankDetails ? `${bankDetails.status.replace('-', ' ')} - ${bankDetails.bankName} ending ${bankDetails.accountLast4}` : 'Not added'}
                  </span>
                </div>
              </div>
              <div className="profile-detail">
                <User size={18} />
                <div>
                  <span className="detail-label">Employee Record</span>
                  <span className="detail-value">
                    {employee ? `${employee.department} / ${employee.position}` : 'Not connected'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
