import { useState, useEffect } from 'react';
import { Users, Clock, DollarSign, Bell, TrendingUp, Activity, CalendarDays } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { firebaseService } from '../services/firebase';
import type { Employee, DashboardStats } from '../types';
import './Dashboard.css';

interface EmployeeHoursRow {
  employee: Employee;
  totalSeconds: number;
  isWorking: boolean;
}

function getRecordSeconds(record: { totalSeconds?: number; totalHours: number }) {
  return record.totalSeconds ?? Math.round(record.totalHours * 3600);
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`;
}

function getNextPayDay(date = new Date()) {
  const next = new Date(date);
  const daysUntilFriday = (5 - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + daysUntilFriday);
  return next;
}

function formatPayDay(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function Dashboard() {
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    clockedInToday: 0,
    totalHoursToday: 0,
    pendingPayroll: 0,
    unreadNotifications: 0,
  });
  const [recentEmployees, setRecentEmployees] = useState<Employee[]>([]);
  const [employeeHours, setEmployeeHours] = useState<EmployeeHoursRow[]>([]);
  const [missedClockOuts, setMissedClockOuts] = useState<EmployeeHoursRow[]>([]);
  const searchTerm = (searchParams.get('search') || '').trim().toLowerCase();
  const visibleEmployees = searchTerm
    ? recentEmployees.filter(employee => (
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm) ||
        employee.email.toLowerCase().includes(searchTerm) ||
        employee.employeeNumber.toLowerCase().includes(searchTerm) ||
        employee.position.toLowerCase().includes(searchTerm) ||
        employee.department.toLowerCase().includes(searchTerm)
    ))
    : recentEmployees;
  const visibleEmployeeHours = searchTerm
    ? employeeHours.filter(({ employee }) => (
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm) ||
        employee.email.toLowerCase().includes(searchTerm) ||
        employee.employeeNumber.toLowerCase().includes(searchTerm) ||
        employee.position.toLowerCase().includes(searchTerm) ||
        employee.department.toLowerCase().includes(searchTerm)
      ))
    : employeeHours;
  const clockedInEmployees = visibleEmployeeHours.filter(row => row.isWorking);
  const notClockedInEmployees = visibleEmployeeHours.filter(row => !row.isWorking);
  const nextPayDay = getNextPayDay();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const today = new Date();
      const todayKey = dateKey(today);
      const missedStart = dateKey(addDays(today, -14));
      const missedEnd = dateKey(addDays(today, -1));
      const [employeesResult, todayRecordsResult, missedRecordsResult, notificationsResult, payrollResult] = await Promise.all([
        firebaseService.getEmployees(),
        firebaseService.getTimeRecords(undefined, todayKey),
        firebaseService.getTimeRecordsByDateRange(missedStart, missedEnd),
        firebaseService.getNotifications(),
        firebaseService.getPayrollRecordsByStatus('pending'),
      ]);

      const employees = employeesResult.data || [];
      const todayRecords = todayRecordsResult.data || [];
      const missedRecords = (missedRecordsResult.data || []).filter(r => r.status === 'clocked-in' || r.status === 'on-break');
      const notifications = notificationsResult.data || [];
      const payroll = payrollResult.data || [];

      const clockedIn = todayRecords.filter(r => r.status === 'clocked-in' || r.status === 'on-break').length;
      const totalSeconds = todayRecords.reduce(
        (sum, r) => sum + getRecordSeconds(r),
        0
      );
      const pendingPayroll = payroll.filter(p => p.status === 'pending').length;
      const hoursByEmployee = employees.map(employee => {
        const records = todayRecords.filter(record => record.employeeId === employee.id);
        return {
          employee,
          totalSeconds: records.reduce((sum, record) => sum + getRecordSeconds(record), 0),
          isWorking: records.some(record => record.status === 'clocked-in' || record.status === 'on-break'),
        };
      });

      setStats({
        totalEmployees: employees.length,
        activeEmployees: employees.filter(e => e.status === 'active').length,
        clockedInToday: clockedIn,
        totalHoursToday: Math.round((totalSeconds / 3600) * 10000) / 10000,
        pendingPayroll,
        unreadNotifications: notifications.filter(n => !n.read).length,
      });

      setRecentEmployees(employees.slice(0, 5));
      setEmployeeHours(hoursByEmployee);
      setMissedClockOuts(missedRecords.map(record => ({
        employee: employees.find(employee => employee.id === record.employeeId) || {
          id: record.employeeId,
          employeeNumber: '',
          firstName: 'Unknown',
          lastName: 'Employee',
          email: '',
          phone: '',
          department: '',
          position: 'Employee',
          workSchedule: { day: '', startTime: '', endTime: '', breakDuration: 0 },
          hourlyRate: 0,
          startDate: '',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        totalSeconds: getRecordSeconds(record),
        isWorking: true,
      })));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const statCards = [
    {
      icon: Users,
      label: 'Total Employees',
      value: stats.totalEmployees,
      color: '#2563EB',
      bgColor: '#EFF6FF',
    },
    {
      icon: Activity,
      label: 'Active Now',
      value: stats.clockedInToday,
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      icon: Clock,
      label: 'Hours Today',
      value: stats.totalHoursToday,
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
    {
      icon: DollarSign,
      label: 'Pay Day',
      value: formatPayDay(nextPayDay),
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
    },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-stats">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="stat-card">
              <div className="stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <Card className="recent-employees-card">
          <CardHeader 
            title="Recent Employees" 
            subtitle="Latest team members"
          />
          <CardContent>
            <div className="employee-list">
              {visibleEmployees.map((employee) => (
                <div key={employee.id} className="employee-item">
                  <div className="employee-avatar">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </div>
                  <div className="employee-info">
                    <span className="employee-name">
                      {employee.firstName} {employee.lastName}
                    </span>
                    <span className="employee-position">{employee.position}</span>
                  </div>
                  <span className={`employee-status status-${employee.status}`}>
                    {employee.status}
                  </span>
                </div>
              ))}
              {visibleEmployees.length === 0 && (
                <div className="empty-state">
                  No employees match "{searchParams.get('search')}".
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="activity-card">
          <CardHeader 
            title="Today's Activity" 
            subtitle="Real-time updates"
          />
          <CardContent>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon clock-in">
                  <Clock size={16} />
                </div>
                <div className="activity-content">
                  <span className="activity-title">Clock In Activity</span>
                  <span className="activity-desc">{stats.clockedInToday} employees currently working</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon hours">
                  <TrendingUp size={16} />
                </div>
                <div className="activity-content">
                  <span className="activity-title">Total Hours</span>
                  <span className="activity-desc">{stats.totalHoursToday} hours logged today</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon notifications">
                  <Bell size={16} />
                </div>
                <div className="activity-content">
                  <span className="activity-title">Notifications</span>
                  <span className="activity-desc">{stats.unreadNotifications} unread messages</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon payday">
                  <DollarSign size={16} />
                </div>
                <div className="activity-content">
                  <span className="activity-title">Pay Day</span>
                  <span className="activity-desc">Every Friday - next pay day is {formatPayDay(nextPayDay)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="schedule-card">
          <CardHeader 
            title="Clock Status" 
            subtitle="Currently in and not clocked in"
          />
          <CardContent>
            <div className="clock-status-groups">
              <div className="clock-status-section">
                <div className="clock-status-heading">
                  <strong>Clocked In Now</strong>
                  <span>{clockedInEmployees.length}</span>
                </div>
                <div className="employee-hours-list">
                  {clockedInEmployees.map(({ employee, totalSeconds }) => (
                    <div key={employee.id} className="employee-hours-row working-row">
                      <div>
                        <strong>{employee.firstName} {employee.lastName}</strong>
                        <span>{employee.position}</span>
                      </div>
                      <span className="hours-pill active">{formatDuration(totalSeconds)}</span>
                    </div>
                  ))}
                  {clockedInEmployees.length === 0 && (
                    <div className="empty-state compact">No one is clocked in right now.</div>
                  )}
                </div>
              </div>

              <div className="clock-status-section">
                <div className="clock-status-heading">
                  <strong>Not Clocked In</strong>
                  <span>{notClockedInEmployees.length}</span>
                </div>
                <div className="employee-hours-list">
                  {notClockedInEmployees.map(({ employee, totalSeconds }) => (
                    <div key={employee.id} className="employee-hours-row">
                      <div>
                        <strong>{employee.firstName} {employee.lastName}</strong>
                        <span>{employee.position}</span>
                      </div>
                      <span className={totalSeconds > 0 ? 'hours-pill' : 'hours-pill inactive'}>
                        {totalSeconds > 0 ? formatDuration(totalSeconds) : 'Not started'}
                      </span>
                    </div>
                  ))}
                  {notClockedInEmployees.length === 0 && (
                    <div className="empty-state compact">Everyone is clocked in.</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="calendar-card">
          <CardHeader
            title="Calendar"
            subtitle="Today and Friday pay days"
            action={<CalendarDays size={22} />}
          />
          <CardContent>
            <MiniCalendar />
          </CardContent>
        </Card>

        <Card className="missed-clock-card">
          <CardHeader
            title="Missed Clock-Out Alerts"
            subtitle="Open records from previous days"
          />
          <CardContent>
            <div className="employee-hours-list">
              {missedClockOuts.map(({ employee, totalSeconds }, index) => (
                <div key={`${employee.id}-${index}`} className="employee-hours-row alert-row">
                  <div>
                    <strong>{employee.firstName} {employee.lastName}</strong>
                    <span>Needs admin review</span>
                  </div>
                  <span className="hours-pill warning">{formatDuration(totalSeconds)}</span>
                </div>
              ))}
              {missedClockOuts.length === 0 && (
                <div className="empty-state">No missed clock-outs.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniCalendar() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const calendarDays = Array.from({ length: monthStart.getDay() }, () => null as Date | null);

  for (let day = 1; day <= monthEnd.getDate(); day++) {
    calendarDays.push(new Date(today.getFullYear(), today.getMonth(), day));
  }

  return (
    <div className="dashboard-calendar">
      <div className="dashboard-calendar-title">
        <strong>{today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
        <span>Pay day: Friday</span>
      </div>
      <div className="dashboard-calendar-weekdays">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="dashboard-calendar-grid">
        {calendarDays.map((date, index) => {
          const isToday = date?.toDateString() === today.toDateString();
          const isFriday = date?.getDay() === 5;

          return (
            <span
              key={date?.toISOString() || `blank-${index}`}
              className={`${isToday ? 'today' : ''} ${isFriday ? 'payday' : ''}`}
            >
              {date?.getDate() || ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}
