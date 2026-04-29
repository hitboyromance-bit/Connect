import { useState, useEffect } from 'react';
import { Clock, Play, Square, Calendar, TrendingUp } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { firebaseService } from '../services/firebase';
import { getCurrentUser } from '../utils/currentUser';
import type { Employee, EmployeeFormValues, TimeRecord, User } from '../types';
import './TimeClock.css';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error('Firebase is taking too long to respond. Check your connection and try again.'));
      }, timeoutMs);
    }),
  ]);
}

function getRecordSeconds(record: TimeRecord) {
  return record.totalSeconds ?? Math.round(record.totalHours * 3600);
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`;
}

function getWeekStart(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getWeeklyHours(records: TimeRecord[]) {
  const monday = getWeekStart();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = getDateKey(date);
    const daySeconds = records
      .filter(record => record.date === dateKey)
      .reduce((sum, record) => sum + getRecordSeconds(record), 0);

    return Math.round((daySeconds / 3600) * 100) / 100;
  });
}

function employeeMatchesSearch(employee: Employee, searchTerm: string) {
  return (
    `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm) ||
    employee.email.toLowerCase().includes(searchTerm) ||
    employee.employeeNumber.toLowerCase().includes(searchTerm) ||
    employee.position.toLowerCase().includes(searchTerm) ||
    employee.department.toLowerCase().includes(searchTerm)
  );
}

function recordMatchesSearch(record: TimeRecord, employee: Employee | undefined, searchTerm: string) {
  return (
    record.date.includes(searchTerm) ||
    record.status.toLowerCase().includes(searchTerm) ||
    (record.clockIn || '').toLowerCase().includes(searchTerm) ||
    (record.clockOut || '').toLowerCase().includes(searchTerm) ||
    (employee ? employeeMatchesSearch(employee, searchTerm) : false)
  );
}

export function TimeClock() {
  const [searchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [currentRecord, setCurrentRecord] = useState<TimeRecord | null>(null);
  const [clocking, setClocking] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(new Date());
  const currentUser = getCurrentUser();
  const isEmployee = currentUser?.role === 'employee';
  const searchTerm = (searchParams.get('search') || '').trim().toLowerCase();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadData = async () => {
    const employeesResult = await firebaseService.getEmployees();

    if (employeesResult.success && employeesResult.data) {
      let activeEmployees = employeesResult.data.filter(e => e.status === 'active');
      let loggedInEmployee = currentUser
        ? activeEmployees.find(employee => (
            employee.id === currentUser.uid ||
            employee.email.toLowerCase() === currentUser.email.toLowerCase()
          ))
        : undefined;

      if (isEmployee && currentUser && !loggedInEmployee) {
        const createResult = await firebaseService.createEmployee(buildEmployeeProfile(currentUser));
        if (createResult.success && createResult.data) {
          loggedInEmployee = createResult.data;
          activeEmployees = [...activeEmployees, createResult.data];
        }
      }

      const visibleEmployees = isEmployee
        ? activeEmployees.filter(employee => employee.id === loggedInEmployee?.id)
        : activeEmployees;
      const nextSelectedEmployee = selectedEmployee
        ? visibleEmployees.find(employee => employee.id === selectedEmployee.id)
        : loggedInEmployee || visibleEmployees[0];

      setEmployees(visibleEmployees);
      setSelectedEmployee(nextSelectedEmployee || null);

      const weekStart = getDateKey(getWeekStart());
      const weekEnd = getDateKey(addDays(getWeekStart(), 6));
      const timeRecordsResult = await firebaseService.getTimeRecordsByDateRange(
        weekStart,
        weekEnd,
        isEmployee ? nextSelectedEmployee?.id : undefined
      );

      if (timeRecordsResult.success && timeRecordsResult.data) {
        const visibleRecords = timeRecordsResult.data;
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = visibleRecords.find(
          r => r.employeeId === nextSelectedEmployee?.id && r.date === today && (r.status === 'clocked-in' || r.status === 'on-break')
        );
        setTimeRecords(visibleRecords);
        setCurrentRecord(todayRecord || null);
      }
    }
  };

  const handleClockIn = async () => {
    if (!selectedEmployee) {
      setMessage('Employee profile is still connecting. Refresh or try again in a moment.');
      await loadData();
      return;
    }
    setClocking(true);

    try {
      const result = await withTimeout(firebaseService.clockIn(selectedEmployee.id), 15000);
      if (result.success && result.data) {
        setCurrentRecord(result.data);
        setMessage('');
        await loadData();
      } else {
        setMessage(result.error || 'Unable to clock in.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to clock in.');
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!selectedEmployee) {
      setMessage('Employee profile is still connecting. Refresh or try again in a moment.');
      await loadData();
      return;
    }
    setClocking(true);

    try {
      const result = await withTimeout(firebaseService.clockOut(selectedEmployee.id), 15000);
      if (result.success && result.data) {
        setCurrentRecord(null);
        setMessage('');
        await loadData();
      } else {
        setMessage(result.error || 'Unable to clock out.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to clock out.');
    } finally {
      setClocking(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const visibleEmployees = searchTerm
    ? employees.filter(employee => employeeMatchesSearch(employee, searchTerm))
    : employees;
  const visibleTimeRecords = isEmployee && selectedEmployee
    ? timeRecords.filter(record => record.employeeId === selectedEmployee.id)
    : timeRecords;
  const searchedTimeRecords = searchTerm
    ? visibleTimeRecords.filter(record => {
        const employee = employees.find(item => item.id === record.employeeId);
        return recordMatchesSearch(record, employee, searchTerm);
      })
    : visibleTimeRecords;
  const todayRecords = searchedTimeRecords.filter(r => r.date === today);
  const clockedInCount = todayRecords.filter(r => r.status === 'clocked-in').length;
  const totalSecondsToday = todayRecords.reduce((sum, r) => sum + getRecordSeconds(r), 0);

  const weeklyHours = getWeeklyHours(visibleTimeRecords);
  const weeklyTotal = weeklyHours.reduce((a, b) => a + b, 0);

  return (
    <div className="timeclock-page">
      <div className="timeclock-header">
        <div className="header-left">
          <h2>Time Clock</h2>
          <p className="subtitle">Track employee work hours</p>
        </div>
      </div>

      <div className="timeclock-grid">
        {/* Main Clock Card */}
        <Card className="clock-card">
          <CardContent>
            <div className="clock-display">
              <div className="current-time">
                {now.toLocaleTimeString('en-US', {
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
              <div className="current-date">
                {now.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            <div className="employee-select">
              <label>Select Employee</label>
              <select
                value={selectedEmployee?.id || ''}
                disabled={isEmployee}
                onChange={(e) => {
                  const emp = employees.find(em => em.id === e.target.value);
                  setSelectedEmployee(emp || null);
                  const todayRecord = timeRecords.find(
                    r => r.employeeId === emp?.id && r.date === today && r.status === 'clocked-in'
                  );
                  setCurrentRecord(todayRecord || null);
                }}
              >
                {visibleEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                  </option>
                ))}
              </select>
            </div>

            {message && <div className="clock-message error">{message}</div>}

            <div className="clock-buttons">
              {currentRecord ? (
                <Button
                  variant="danger"
                  size="lg"
                  icon={<Square size={20} />}
                  onClick={handleClockOut}
                  loading={clocking}
                >
                  Clock Out
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Play size={20} />}
                  onClick={handleClockIn}
                  loading={clocking}
                >
                  Clock In
                </Button>
              )}
            </div>

            {currentRecord && (
              <div className="clock-status">
                <div className="status-indicator active" />
                <span>Currently working since {currentRecord.clockIn}</span>
              </div>
            )}
            {selectedEmployee && !currentRecord && (
              <div className="clock-profile-status">
                Ready for {selectedEmployee.firstName} {selectedEmployee.lastName}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="stats-column">
          <Card className="stat-card">
            <CardContent>
              <div className="stat-icon blue">
                <Clock size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{clockedInCount}</span>
                <span className="stat-label">Clocked In Now</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent>
              <div className="stat-icon green">
                <TrendingUp size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{formatDuration(totalSecondsToday)}</span>
                <span className="stat-label">{isEmployee ? 'Hours Today' : 'Visible Hours Today'}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent>
              <div className="stat-icon amber">
                <Calendar size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{weeklyTotal.toFixed(1)}h</span>
                <span className="stat-label">This Week</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly Overview */}
      <Card className="weekly-card">
        <CardHeader title="Weekly Hours Overview" subtitle="Hours worked each day" />
        <CardContent>
          <div className="weekly-chart">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const hours = weeklyHours[index];
              const maxHeight = 120;
              const height = (hours / 10) * maxHeight;
              
              return (
                <div key={day} className="day-column">
                  <div className="day-bar-container">
                    <div 
                      className="day-bar" 
                      style={{ height: `${Math.max(height, 4)}px` }}
                    />
                    <span className="day-hours">{hours}h</span>
                  </div>
                  <span className="day-label">{day}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Today's Records */}
      <Card className="records-card">
        <CardHeader title="Today's Time Records" subtitle="All clock-in/out records" />
        <CardContent>
          <div className="records-list">
            {todayRecords.length > 0 ? (
              todayRecords.map((record) => {
                const emp = employees.find(e => e.id === record.employeeId);
                return (
                  <div key={record.id} className="record-item">
                    <div className="record-avatar">
                      {emp ? emp.firstName[0] + emp.lastName[0] : '??'}
                    </div>
                    <div className="record-info">
                      <span className="record-name">
                        {emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}
                      </span>
                      <span className="record-time">
                        {emp?.employeeNumber}
                      </span>
                    </div>
                    <div className="record-clock">
                      <span className="clock-in-time">
                        In: {record.clockIn || '--:--'}
                      </span>
                      <span className="clock-out-time">
                        Out: {record.clockOut || '--:--'}
                      </span>
                    </div>
                    <div className="record-hours">
                      {formatDuration(getRecordSeconds(record))}
                    </div>
                    <span className={`record-status status-${record.status}`}>
                      {record.status === 'clocked-in' ? 'Working' : 'Completed'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="no-records">
                <Clock size={48} />
                <p>{searchTerm ? 'No matching time records for today' : 'No time records for today'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function buildEmployeeProfile(user: User): EmployeeFormValues {
  const [firstName = user.email.split('@')[0], ...lastParts] = (user.name || user.email.split('@')[0]).split(' ');

  return {
    firstName,
    lastName: lastParts.join(' ') || 'Employee',
    email: user.email,
    phone: '',
    department: 'Operations',
    position: 'Employee',
    hourlyRate: 25,
    startDate: new Date().toISOString().split('T')[0],
    status: 'active',
    workSchedule: {
      day: 'Monday-Friday',
      startTime: '09:00',
      endTime: '17:00',
      breakDuration: 60,
    },
  };
}
