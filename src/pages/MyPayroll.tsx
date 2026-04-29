import { useEffect, useState } from 'react';
import { Calendar, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { firebaseService } from '../services/firebase';
import { getCurrentUser } from '../utils/currentUser';
import type { Employee, PayrollRecord } from '../types';
import './MyPayroll.css';

function formatHours(hours: number) {
  return `${hours.toFixed(2).replace(/\.00$/, '')}h`;
}

export function MyPayroll() {
  const user = getCurrentUser();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayroll();
  }, []);

  const loadPayroll = async () => {
    if (!user) return;
    setLoading(true);
    const employeesResult = await firebaseService.getEmployees();
    const linkedEmployee = (employeesResult.data || []).find(item =>
      item.id === user.uid || item.email.toLowerCase() === user.email.toLowerCase()
    ) || null;
    setEmployee(linkedEmployee);

    if (linkedEmployee) {
      const payrollResult = await firebaseService.getPayrollRecords(linkedEmployee.id);
      setRecords(payrollResult.data || []);
    }
    setLoading(false);
  };

  const totalNet = records.reduce((sum, record) => sum + record.netSalary, 0);
  const pending = records.filter(record => record.status !== 'paid').length;
  const latest = [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const printPaystub = (record: PayrollRecord) => {
    const popup = window.open('', '_blank', 'width=720,height=820');
    if (!popup) return;
    popup.document.write(`
      <html><head><title>Paystub</title><style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
        h1 { margin-bottom: 4px; } .muted { color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        td:last-child { text-align: right; font-weight: 700; }
        .total { font-size: 20px; color: #2563eb; }
      </style></head><body>
        <h1>Connect Paystub</h1>
        <p class="muted">${employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'}</p>
        <p>${record.periodStart || record.month} to ${record.periodEnd || record.year}</p>
        <table>
          <tr><td>Pay date</td><td>${record.payDate || 'Friday'}</td></tr>
          <tr><td>Regular hours</td><td>${formatHours(record.regularHours)}</td></tr>
          <tr><td>Overtime hours</td><td>${formatHours(record.overtimeHours)}</td></tr>
          <tr><td>Gross pay</td><td>$${record.grossSalary.toLocaleString()}</td></tr>
          <tr><td>Deductions</td><td>$${record.deductions.toLocaleString()}</td></tr>
          <tr><td class="total">Net pay</td><td class="total">$${record.netSalary.toLocaleString()}</td></tr>
        </table>
      </body></html>
    `);
    popup.document.close();
    popup.print();
  };

  if (loading) {
    return <div className="my-payroll-state">Loading payroll...</div>;
  }

  return (
    <div className="my-payroll-page">
      <div className="my-payroll-header">
        <h2>My Payroll</h2>
        <p className="subtitle">View your pay history, hours, and pay dates</p>
      </div>

      <div className="my-payroll-stats">
        <Card className="my-payroll-stat">
          <DollarSign size={22} />
          <span>Total Net Pay</span>
          <strong>${totalNet.toLocaleString()}</strong>
        </Card>
        <Card className="my-payroll-stat">
          <FileText size={22} />
          <span>Pay Records</span>
          <strong>{records.length}</strong>
        </Card>
        <Card className="my-payroll-stat">
          <TrendingUp size={22} />
          <span>Pending</span>
          <strong>{pending}</strong>
        </Card>
        <Card className="my-payroll-stat">
          <Calendar size={22} />
          <span>Next Pay Date</span>
          <strong>{latest?.payDate || 'Friday'}</strong>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={employee ? `${employee.firstName} ${employee.lastName}` : 'Payroll Records'}
          subtitle={employee ? `${employee.position} - $${employee.hourlyRate}/hr` : 'Employee profile not connected'}
        />
        <CardContent>
          {records.length === 0 ? (
            <div className="my-payroll-empty">No payroll records yet.</div>
          ) : (
            <div className="my-payroll-list">
              {records.map(record => (
                <div key={record.id} className="my-payroll-row">
                  <div>
                    <strong>
                      {record.periodStart && record.periodEnd
                        ? `${record.periodStart} to ${record.periodEnd}`
                        : `${record.month} ${record.year}`}
                    </strong>
                    <span>Pay day: {record.payDate || 'Friday'}</span>
                  </div>
                  <span>{formatHours(record.regularHours)} regular</span>
                  <span>{formatHours(record.overtimeHours)} OT</span>
                  <strong>${record.netSalary.toLocaleString()}</strong>
                  <span className={`payroll-chip ${record.status}`}>{record.status}</span>
                  <Button size="sm" variant="secondary" onClick={() => printPaystub(record)}>
                    Paystub
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
