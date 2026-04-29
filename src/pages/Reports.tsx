import { useEffect, useMemo, useState } from 'react';
import { Activity, Clock, DollarSign, FileDown, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { firebaseService } from '../services/firebase';
import { downloadCsv } from '../utils/csv';
import type { AuditLog, Employee, PayrollRecord, TimeRecord } from '../types';
import './Reports.css';

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

export function Reports() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(dateKey(addDays(new Date(), -30)));
  const [endDate, setEndDate] = useState(dateKey(new Date()));
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    const [employeesResult, timeResult, payrollResult, auditResult] = await Promise.all([
      firebaseService.getEmployees(),
      firebaseService.getTimeRecordsByDateRange(startDate, endDate),
      firebaseService.getPayrollRecords(),
      firebaseService.getAuditLogs(),
    ]);

    if (!employeesResult.success || !timeResult.success || !payrollResult.success || !auditResult.success) {
      setError('Unable to load reports right now.');
      setLoading(false);
      return;
    }

    setEmployees(employeesResult.data || []);
    setTimeRecords(timeResult.data || []);
    setPayrollRecords(payrollResult.data || []);
    setAuditLogs(auditResult.data || []);
    setLoading(false);
  };

  const employeeRows = useMemo(() => employees.map((employee) => {
    const records = timeRecords.filter(record => record.employeeId === employee.id);
    const seconds = records.reduce((sum, record) => sum + getRecordSeconds(record), 0);
    const payroll = payrollRecords.filter(record => record.employeeId === employee.id);
    const netPay = payroll.reduce((sum, record) => sum + record.netSalary, 0);
    return { employee, seconds, records: records.length, netPay };
  }), [employees, payrollRecords, timeRecords]);

  const totalSeconds = employeeRows.reduce((sum, row) => sum + row.seconds, 0);
  const totalNetPay = payrollRecords.reduce((sum, record) => sum + record.netSalary, 0);
  const totalPages = Math.max(1, Math.ceil(employeeRows.length / pageSize));
  const pagedEmployeeRows = employeeRows.slice((page - 1) * pageSize, page * pageSize);

  const exportReports = () => {
    downloadCsv('employee-hours-pay-report.csv', employeeRows.map(({ employee, seconds, records, netPay }) => ({
      employee: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      position: employee.position,
      timeRecords: records,
      trackedMinutes: Math.round(seconds / 60),
      netPay,
      startDate,
      endDate,
    })));
  };

  if (loading) {
    return <div className="reports-state">Loading reports...</div>;
  }

  if (error) {
    return <div className="reports-state error">{error}</div>;
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h2>Reports</h2>
          <p className="subtitle">Review hours, payroll totals, and account activity</p>
        </div>
        <Button variant="secondary" icon={<FileDown size={18} />} onClick={exportReports}>
          Export CSV
        </Button>
      </div>

      <Card className="reports-filter">
        <label>
          Start
          <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
        </label>
        <label>
          End
          <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
        </label>
      </Card>

      <div className="reports-stat-grid">
        <Card className="reports-stat">
          <Users size={22} />
          <span>Employees</span>
          <strong>{employees.length}</strong>
        </Card>
        <Card className="reports-stat">
          <Clock size={22} />
          <span>Tracked Time</span>
          <strong>{formatDuration(totalSeconds)}</strong>
        </Card>
        <Card className="reports-stat">
          <DollarSign size={22} />
          <span>Net Payroll</span>
          <strong>${totalNetPay.toLocaleString()}</strong>
        </Card>
        <Card className="reports-stat">
          <Activity size={22} />
          <span>Audit Events</span>
          <strong>{auditLogs.length}</strong>
        </Card>
      </div>

      <Card>
        <CardHeader title="Employee Hours And Pay" subtitle="Separate totals for each employee" />
        <CardContent>
          {employeeRows.length === 0 ? (
            <div className="reports-empty">No employee data yet.</div>
          ) : (
            <div className="reports-table">
              {pagedEmployeeRows.map(({ employee, seconds, records, netPay }) => (
                <div key={employee.id} className="reports-row">
                  <div>
                    <strong>{employee.firstName} {employee.lastName}</strong>
                    <span>{employee.department} - {employee.position}</span>
                  </div>
                  <span>{records} time records</span>
                  <span>{formatDuration(seconds)}</span>
                  <strong>${netPay.toLocaleString()}</strong>
                </div>
              ))}
              <div className="pagination-row">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <span>Page {page} of {totalPages}</span>
                <Button size="sm" variant="secondary" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Audit Log" subtitle="Recent admin-sensitive actions" />
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="reports-empty">No audit events yet.</div>
          ) : (
            <div className="audit-list">
              {auditLogs.slice(0, 12).map(log => (
                <div key={log.id} className="audit-row">
                  <ShieldCheck size={18} />
                  <div>
                    <strong>{log.action}</strong>
                    <span>{log.actorName} to {log.target}</span>
                  </div>
                  <small>{new Date(log.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
