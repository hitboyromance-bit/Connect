import { useState, useEffect } from 'react';
import { CheckCircle, DollarSign, FileText, Download, Calendar, TrendingUp, Filter, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { firebaseService } from '../services/firebase';
import { getCurrentUser } from '../utils/currentUser';
import { downloadCsv } from '../utils/csv';
import type { Employee, PayrollRecord, TimeRecord } from '../types';
import './Payroll.css';

function getMonday(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getNextFriday(date: Date) {
  const copy = new Date(date);
  const daysUntilFriday = (5 - copy.getDay() + 7) % 7;
  copy.setDate(copy.getDate() + daysUntilFriday);
  return copy;
}

function getRecordSeconds(record: TimeRecord) {
  return record.totalSeconds ?? Math.round(record.totalHours * 3600);
}

function formatHours(hours: number) {
  return `${hours.toFixed(2).replace(/\.00$/, '')}h`;
}

export function Payroll() {
  const currentUser = getCurrentUser();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState(dateKey(getMonday()));
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [employeesResult, payrollResult] = await Promise.all([
      firebaseService.getEmployees(),
      firebaseService.getPayrollRecords(),
    ]);

    if (employeesResult.success && employeesResult.data) {
      setEmployees(employeesResult.data);
    }

    if (payrollResult.success && payrollResult.data) {
      setPayrollRecords(payrollResult.data);
    }

  };

  const months = ['all', 'January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];

  const filteredRecords = selectedMonth === 'all' 
    ? payrollRecords 
    : payrollRecords.filter(r => r.month === selectedMonth);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pagedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const totalGross = filteredRecords.reduce((sum, r) => sum + r.grossSalary, 0);
  const totalNet = filteredRecords.reduce((sum, r) => sum + r.netSalary, 0);
  const pendingCount = filteredRecords.filter(r => r.status === 'pending').length;
  const paidCount = filteredRecords.filter(r => r.status === 'paid').length;

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
  };

  const getEmployeeNumber = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.employeeNumber || '';
  };

  const updatePayrollStatus = async (record: PayrollRecord, status: PayrollRecord['status']) => {
    const result = await firebaseService.updatePayrollStatus(record.id, status);
    if (!result.success) {
      setMessage(result.error || 'Unable to update payroll status.');
      return;
    }

    await firebaseService.createNotification({
      userId: record.employeeId,
      title: status === 'paid' ? 'Payroll paid' : 'Payroll processed',
      message: `Payroll for ${record.periodStart || record.month} is now ${status}. Net pay: $${record.netSalary.toLocaleString()}.`,
      type: 'payroll',
    });
    await firebaseService.createAuditLog({
      actorId: currentUser?.uid || 'system',
      actorName: currentUser?.name || currentUser?.email || 'System',
      action: `Marked payroll ${status}`,
      target: record.employeeId,
    });
    setMessage(`Payroll marked ${status}.`);
    await loadData();
  };

  const generateWeeklyPayroll = async () => {
    setIsGenerating(true);
    setMessage('');

    try {
      const weekStart = new Date(`${selectedWeek}T00:00:00`);
      const weekEnd = addDays(weekStart, 6);
      const payDate = getNextFriday(weekEnd);
      const periodStart = dateKey(weekStart);
      const periodEnd = dateKey(weekEnd);
      const weekDates = new Set(
        Array.from({ length: 7 }, (_, index) => dateKey(addDays(weekStart, index)))
      );

      const activeEmployees = employees.filter(employee => employee.status === 'active');
      const timeRecordsResult = await firebaseService.getTimeRecordsByDateRange(periodStart, periodEnd);
      const weekTimeRecords = timeRecordsResult.data || [];
      const recordsToSave = activeEmployees.map((employee) => {
        const employeeRecords = weekTimeRecords.filter(record =>
          record.employeeId === employee.id &&
          record.status === 'clocked-out' &&
          weekDates.has(record.date)
        );
        const totalSeconds = employeeRecords.reduce((sum, record) => sum + getRecordSeconds(record), 0);
        const breakSeconds = employeeRecords.reduce((sum, record) => sum + (record.breakSeconds ?? record.breakTime * 60), 0);
        const totalHours = totalSeconds / 3600;
        const regularHours = Math.min(40, totalHours);
        const overtimeHours = Math.max(0, totalHours - 40);
        const overtimeRate = employee.hourlyRate * 1.5;
        const grossSalary = regularHours * employee.hourlyRate + overtimeHours * overtimeRate;
        const deductions = 0;

        return {
          id: `payroll-${employee.id}-${periodStart}`,
          employeeId: employee.id,
          month: weekStart.toLocaleDateString('en-US', { month: 'long' }),
          year: weekStart.getFullYear(),
          periodStart,
          periodEnd,
          payDate: dateKey(payDate),
          totalSeconds,
          breakSeconds,
          regularHours: Math.round(regularHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          hourlyRate: employee.hourlyRate,
          overtimeRate,
          grossSalary: Math.round(grossSalary * 100) / 100,
          deductions,
          netSalary: Math.round((grossSalary - deductions) * 100) / 100,
          status: 'pending' as const,
          createdAt: new Date(),
        };
      });

      const results = await Promise.all(recordsToSave.map(record => firebaseService.savePayrollRecord(record)));
      const failed = results.find(result => !result.success);
      if (failed) {
        setMessage(failed.error || 'Unable to generate payroll.');
        return;
      }

      await Promise.all(recordsToSave.map((record) =>
        firebaseService.createNotification({
          userId: record.employeeId,
          title: 'Payroll generated',
          message: `Payroll for ${record.periodStart} to ${record.periodEnd} is pending. Net pay: $${record.netSalary.toLocaleString()}.`,
          type: 'payroll',
        })
      ));
      await firebaseService.createAuditLog({
        actorId: currentUser?.uid || 'system',
        actorName: currentUser?.name || currentUser?.email || 'System',
        action: 'Generated weekly payroll',
        target: `${periodStart} to ${periodEnd}`,
      });
      await loadData();
      setMessage(`Generated ${recordsToSave.length} payroll records for ${periodStart} to ${periodEnd}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate payroll.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportPayroll = () => {
    downloadCsv('payroll-records.csv', filteredRecords.map(record => ({
      employee: getEmployeeName(record.employeeId),
      employeeNumber: getEmployeeNumber(record.employeeId),
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      payDate: record.payDate,
      regularHours: record.regularHours,
      overtimeHours: record.overtimeHours,
      hourlyRate: record.hourlyRate,
      grossSalary: record.grossSalary,
      deductions: record.deductions,
      netSalary: record.netSalary,
      status: record.status,
    })));
  };

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
        <p class="muted">${getEmployeeName(record.employeeId)} - ${getEmployeeNumber(record.employeeId)}</p>
        <p>${record.periodStart || record.month} to ${record.periodEnd || record.year}</p>
        <table>
          <tr><td>Pay date</td><td>${record.payDate || 'Friday'}</td></tr>
          <tr><td>Regular hours</td><td>${formatHours(record.regularHours)}</td></tr>
          <tr><td>Overtime hours</td><td>${formatHours(record.overtimeHours)}</td></tr>
          <tr><td>Hourly rate</td><td>$${record.hourlyRate}/hr</td></tr>
          <tr><td>Gross pay</td><td>$${record.grossSalary.toLocaleString()}</td></tr>
          <tr><td>Deductions</td><td>$${record.deductions.toLocaleString()}</td></tr>
          <tr><td class="total">Net pay</td><td class="total">$${record.netSalary.toLocaleString()}</td></tr>
        </table>
      </body></html>
    `);
    popup.document.close();
    popup.print();
  };

  return (
    <div className="payroll-page">
      <div className="payroll-header">
        <div className="header-left">
          <h2>Payroll Management</h2>
          <p className="subtitle">Process and manage employee salaries</p>
        </div>
        <div className="header-actions">
          <Button
            icon={<RefreshCw size={18} />}
            onClick={generateWeeklyPayroll}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Weekly Payroll'}
          </Button>
          <Button variant="secondary" icon={<Download size={18} />} onClick={exportPayroll}>
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="payroll-stats">
        <Card className="stat-card">
          <CardContent>
            <div className="stat-icon green">
              <DollarSign size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">${totalGross.toLocaleString()}</span>
              <span className="stat-label">Total Gross</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent>
            <div className="stat-icon blue">
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">${totalNet.toLocaleString()}</span>
              <span className="stat-label">Total Net</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent>
            <div className="stat-icon amber">
              <Calendar size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{pendingCount}</span>
              <span className="stat-label">Pending</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent>
            <div className="stat-icon purple">
              <FileText size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{paidCount}</span>
              <span className="stat-label">Processed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="filter-card">
        <div className="filter-content">
          <div className="filter-group">
            <Filter size={18} />
            <label>Filter by month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {months.map(month => (
                <option key={month} value={month}>
                  {month === 'all' ? 'All Months' : month}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <Calendar size={18} />
            <label>Week starting:</label>
            <input
              type="date"
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(event.target.value)}
            />
          </div>
        </div>
        {message && <div className="payroll-message">{message}</div>}
      </Card>

      {/* Payroll Table */}
      <Card className="payroll-table-card">
        <CardHeader 
          title="Payroll Records" 
          subtitle={`${filteredRecords.length} records found`}
        />
        <CardContent>
          <div className="payroll-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Period</th>
                  <th>Regular Hours</th>
                  <th>Overtime Hours</th>
                  <th>Hourly Rate</th>
                  <th>Gross Salary</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar">
                          {getEmployeeName(record.employeeId).split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="employee-details">
                          <span className="name">{getEmployeeName(record.employeeId)}</span>
                          <span className="emp-number">{getEmployeeNumber(record.employeeId)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {record.periodStart && record.periodEnd
                        ? `${record.periodStart} to ${record.periodEnd}`
                        : `${record.month} ${record.year}`}
                      {record.payDate && <span className="pay-date">Pay day: {record.payDate}</span>}
                    </td>
                    <td>{formatHours(record.regularHours)}</td>
                    <td>{formatHours(record.overtimeHours)}</td>
                    <td>${record.hourlyRate}/hr</td>
                    <td className="amount">${record.grossSalary.toLocaleString()}</td>
                    <td className="amount">${record.deductions.toLocaleString()}</td>
                    <td className="amount net">${record.netSalary.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge status-${record.status}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>
                      <div className="payroll-actions">
                        {record.status === 'pending' && (
                          <Button size="sm" variant="secondary" onClick={() => updatePayrollStatus(record, 'processed')}>
                            Process
                          </Button>
                        )}
                        {record.status !== 'paid' && (
                          <Button size="sm" icon={<CheckCircle size={15} />} onClick={() => updatePayrollStatus(record, 'paid')}>
                            Paid
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => printPaystub(record)}>
                          Paystub
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-row">
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button size="sm" variant="secondary" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
