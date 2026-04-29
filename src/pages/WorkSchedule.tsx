import { ReactNode, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock, Coffee, DollarSign, Landmark, Play, Square, UserCheck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { firebaseService } from '../services/firebase';
import { getCurrentUser } from '../utils/currentUser';
import type { BankApprovalRequest, Employee, EmployeeFormValues, TimeApprovalRequest, TimeRecord, User, WeeklySchedule } from '../types';
import './WorkSchedule.css';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getScheduleUser(): User {
  return getCurrentUser() || {
    uid: 'admin-1',
    name: 'Alex Miller',
    email: 'miller@gmail.com',
    role: 'admin',
    createdAt: new Date(),
  };
}

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

function getNextPayDay(date = new Date()) {
  const next = new Date(date);
  const daysUntilFriday = (5 - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + daysUntilFriday);
  return next;
}

function formatPayDay(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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

export function WorkSchedule() {
  const [currentUser] = useState(getScheduleUser);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [timeApprovalRequests, setTimeApprovalRequests] = useState<TimeApprovalRequest[]>([]);
  const [bankApprovalRequests, setBankApprovalRequests] = useState<BankApprovalRequest[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [weekId, setWeekId] = useState(dateKey(getMonday()));
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [currentTimeRecord, setCurrentTimeRecord] = useState<TimeRecord | null>(null);
  const [timeMessage, setTimeMessage] = useState('');
  const [timeActionLoading, setTimeActionLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'employees' | 'approvals'>('overview');
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

  const pendingUsers = users.filter(user => user.role === 'pending');
  const pendingTimeRequests = timeApprovalRequests.filter(request => request.status === 'pending');
  const pendingBankRequests = bankApprovalRequests.filter(request => request.status === 'pending');
  const approvalCount = pendingUsers.length + pendingTimeRequests.length + pendingBankRequests.length;
  const currentEmployee = employees.find(employee => (
    employee.id === currentUser.uid ||
    employee.email.toLowerCase() === currentUser.email.toLowerCase()
  ));
  const selectedEmployee = employees.find(employee => employee.id === selectedEmployeeId) || currentEmployee || employees[0];
  const totalHours = schedule?.hours.reduce((sum, hours) => sum + hours, 0) || 0;
  const workingDays = schedule?.hours.filter(hours => hours > 0).length || 0;
  const daysOff = 7 - workingDays;
  const nextShift = getNextShift(schedule);
  const nextPayDay = getNextPayDay();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedEmployee?.id) {
      loadSchedule(selectedEmployee.id, weekId);
    }
  }, [selectedEmployee?.id, weekId]);

  useEffect(() => {
    if (!isAdmin && currentEmployee?.id) {
      loadTodayTimeRecord(currentEmployee.id);
    }
  }, [isAdmin, currentEmployee?.id]);

  const loadData = async () => {
    const [employeesResult, usersResult, timeRequestsResult, bankRequestsResult] = await Promise.all([
      firebaseService.getEmployees(),
      firebaseService.getUsers(),
      firebaseService.getTimeApprovalRequests('pending'),
      firebaseService.getBankApprovalRequests('pending'),
    ]);

    let loadedEmployees = employeesResult.data || [];
    let loggedInEmployee = loadedEmployees.find(employee => (
      employee.id === currentUser.uid ||
      employee.email.toLowerCase() === currentUser.email.toLowerCase()
    ));

    if (!isAdmin && !loggedInEmployee) {
      const createResult = await firebaseService.createEmployee(buildEmployeeProfile(currentUser));
      if (createResult.success && createResult.data) {
        loggedInEmployee = createResult.data;
        loadedEmployees = [...loadedEmployees, createResult.data];
      }
    }

    setEmployees(loadedEmployees);
    setUsers(usersResult.data || []);
    setTimeApprovalRequests(timeRequestsResult.data || []);
    setBankApprovalRequests(bankRequestsResult.data || []);

    if (loadedEmployees.length > 0) {
      setSelectedEmployeeId((loggedInEmployee || loadedEmployees[0]).id);
    }
  };

  const loadSchedule = async (employeeId: string, week: string) => {
    const result = await firebaseService.getWeeklySchedule(employeeId, week);
    if (result.success && result.data) {
      setSchedule(result.data);
    }
  };

  const loadTodayTimeRecord = async (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const result = await firebaseService.getTimeRecords(employeeId, today);
    const activeRecord = result.data?.find(record => (
      record.status === 'clocked-in' || record.status === 'on-break'
    ));
    setCurrentTimeRecord(activeRecord || null);
  };

  const runTimeAction = async (action: (employeeId: string) => Promise<{ success: boolean; data?: TimeRecord; error?: string }>) => {
    if (!currentEmployee?.id) {
      setTimeMessage('Your employee profile is not connected yet.');
      return;
    }

    setTimeActionLoading(true);
    try {
      const result = await withTimeout(action(currentEmployee.id), 15000);

      if (!result.success) {
        setTimeMessage(result.error || 'Time clock action failed.');
        return;
      }

      setTimeMessage('');
      setCurrentTimeRecord(result.data?.status === 'clocked-out' ? null : result.data || null);
      await loadTodayTimeRecord(currentEmployee.id);
    } catch (error) {
      setTimeMessage(error instanceof Error ? error.message : 'Time clock action failed.');
    } finally {
      setTimeActionLoading(false);
    }
  };

  const handleEmployeeClockIn = async () => {
    if (!currentEmployee) {
      setTimeMessage('Creating your employee profile. Try again in a moment.');
      await loadData();
      return;
    }
    await runTimeAction(firebaseService.clockIn.bind(firebaseService));
  };

  const handleEmployeeClockOut = async () => {
    if (!currentEmployee) {
      setTimeMessage('Creating your employee profile. Try again in a moment.');
      await loadData();
      return;
    }
    await runTimeAction(firebaseService.clockOut.bind(firebaseService));
  };

  const updateShift = (index: number, field: 'startTime' | 'endTime', value: string) => {
    if (!schedule) return;
    const nextShifts = schedule.shifts || buildShiftsFromHours(schedule.hours);
    nextShifts[index] = {
      ...nextShifts[index],
      [field]: value,
    };
    const nextHours = [...schedule.hours];
    nextHours[index] = getShiftHours(nextShifts[index].startTime, nextShifts[index].endTime);
    setSchedule({ ...schedule, hours: nextHours, shifts: nextShifts });
  };

  const saveSchedule = async () => {
    if (!schedule) return;
    await firebaseService.saveWeeklySchedule(schedule);
    await firebaseService.createNotification({
      userId: schedule.employeeId,
      title: 'Schedule updated',
      message: `Your weekly schedule for ${schedule.weekId} has been updated.`,
      type: 'schedule',
    });
    await firebaseService.createAuditLog({
      actorId: currentUser.uid,
      actorName: currentUser.name || currentUser.email,
      action: 'Updated weekly schedule',
      target: schedule.employeeId,
    });
    await loadData();
  };

  const approveUser = async (uid: string, role: 'admin' | 'manager' | 'employee') => {
    await firebaseService.approveUser(uid, role);
    await loadData();
  };

  const approveTimeRequest = async (id: string) => {
    await firebaseService.approveTimeApprovalRequest(id);
    await loadData();
  };

  const rejectTimeRequest = async (request: TimeApprovalRequest) => {
    const reason = window.prompt('Reason for rejecting this time request?', 'Outside approval rules');
    if (!reason) return;
    const result = await firebaseService.rejectTimeApprovalRequest(request.id, reason);
    if (result.success) {
      await firebaseService.createNotification({
        userId: request.employeeId,
        title: 'Time request rejected',
        message: `${request.action} request was rejected: ${reason}`,
        type: 'attendance',
      });
    }
    await loadData();
  };

  const approveBankRequest = async (id: string) => {
    const result = await firebaseService.approveBankDetails(id);
    if (result.success && result.data) {
      await firebaseService.createNotification({
        userId: result.data.userId,
        title: 'Bank wire verified',
        message: `Your ${result.data.bankName} account ending ${result.data.accountLast4} is ready for payroll.`,
        type: 'payroll',
      });
      await firebaseService.createAuditLog({
        actorId: currentUser.uid,
        actorName: currentUser.name || currentUser.email,
        action: 'Approved bank wire details',
        target: result.data.userId,
      });
    }
    await loadData();
  };

  const rejectBankRequest = async (request: BankApprovalRequest) => {
    const reason = window.prompt('Reason for rejecting this bank wire update?', 'Needs corrected details');
    if (!reason) return;
    const result = await firebaseService.rejectBankDetails(request.id, reason);
    if (result.success) {
      await firebaseService.createNotification({
        userId: request.userId,
        title: 'Bank wire update rejected',
        message: `Your bank wire update was rejected: ${reason}`,
        type: 'payroll',
      });
      await firebaseService.createAuditLog({
        actorId: currentUser.uid,
        actorName: currentUser.name || currentUser.email,
        action: 'Rejected bank wire details',
        target: request.userId,
      });
    }
    await loadData();
  };

  const employeeRows = useMemo(() => employees.slice(0, 8), [employees]);

  if (!isAdmin) {
    return (
      <div className="work-schedule-page">
        <div className="next-shift-banner">
          <div>
            <span className="banner-label">Next Shift</span>
            <h2>{nextShift ? `${nextShift.day} - ${nextShift.hours}h` : 'No upcoming shifts'}</h2>
            <p>
              {nextShift?.shift
                ? `${formatTime(nextShift.shift.startTime)} - ${formatTime(nextShift.shift.endTime)}`
                : `${totalHours} hours scheduled this week`}
            </p>
          </div>
          <button
            type="button"
            className="banner-calendar-btn"
            onClick={() => setShowCalendar((open) => !open)}
            aria-label="Open calendar"
          >
            <CalendarDays size={42} />
          </button>
        </div>
        {showCalendar && <MiniCalendar />}

        <div className="schedule-stat-grid">
          <StatCard icon={<Clock size={22} />} label="Weekly Hours" value={`${totalHours}h`} />
          <StatCard icon={<CalendarDays size={22} />} label="Working Days" value={workingDays} />
          <StatCard icon={<UserCheck size={22} />} label="Days Off" value={daysOff} />
          <StatCard icon={<DollarSign size={22} />} label="Pay Day" value={formatPayDay(nextPayDay)} />
        </div>

        <Card>
          <CardContent>
            <div className="payday-banner">
              <DollarSign size={24} />
              <div>
                <strong>Pay day is every Friday</strong>
                <span>Next pay day: {formatPayDay(nextPayDay)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Time Clock" subtitle="Clock in, take meal break, and clock out" />
          <CardContent>
            <div className="employee-time-clock">
              <div className="employee-live-clock">
                <strong>
                  {now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </strong>
                <span>
                  {now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="time-clock-status">
                <span>Status</span>
                <strong>
                  {!currentTimeRecord && 'Not clocked in'}
                  {currentTimeRecord?.status === 'clocked-in' && `Working since ${currentTimeRecord.clockIn}`}
                  {currentTimeRecord?.status === 'on-break' && `On meal break since ${currentTimeRecord.breakStart}`}
                </strong>
                <small>
                  {currentEmployee
                    ? `${currentEmployee.firstName} ${currentEmployee.lastName} - ${currentEmployee.email}`
                    : 'Employee profile is being connected'}
                </small>
                {currentTimeRecord && (
                  <small>{currentTimeRecord.breakTime} meal break minutes recorded</small>
                )}
              </div>

              <div className="employee-time-actions">
                {!currentTimeRecord && (
                  <Button
                    icon={<Play size={18} />}
                    loading={timeActionLoading}
                    onClick={handleEmployeeClockIn}
                  >
                    Clock In
                  </Button>
                )}

                {currentTimeRecord?.status === 'clocked-in' && (
                  <>
                    <Button
                      variant="secondary"
                      icon={<Coffee size={18} />}
                      loading={timeActionLoading}
                      onClick={() => runTimeAction(firebaseService.startMealBreak.bind(firebaseService))}
                    >
                      Meal Break In
                    </Button>
                    <Button
                      variant="danger"
                      icon={<Square size={18} />}
                      loading={timeActionLoading}
                      onClick={handleEmployeeClockOut}
                    >
                      Clock Out
                    </Button>
                  </>
                )}

                {currentTimeRecord?.status === 'on-break' && (
                  <>
                    <Button
                      icon={<Coffee size={18} />}
                      loading={timeActionLoading}
                      onClick={() => runTimeAction(firebaseService.endMealBreak.bind(firebaseService))}
                    >
                      Meal Break Out
                    </Button>
                    <Button
                      variant="danger"
                      icon={<Square size={18} />}
                      loading={timeActionLoading}
                      onClick={handleEmployeeClockOut}
                    >
                      Clock Out
                    </Button>
                  </>
                )}
              </div>
            </div>
            {timeMessage && <div className="time-clock-message">{timeMessage}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={`${currentEmployee?.firstName || currentUser.name || 'My'}'s Weekly Schedule`}
            subtitle={`Week of ${weekId}`}
          />
          <CardContent>
            <ScheduleDisplay schedule={schedule} />
            <div className="employee-week-list">
              {fullDays.map((day, index) => {
                const hours = schedule?.hours[index] || 0;
                const shift = schedule?.shifts?.[index];
                return (
                  <div key={day} className="employee-week-row">
                    <div>
                      <strong>{day}</strong>
                      <span>{hours > 0 && shift ? `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}` : 'Day off'}</span>
                    </div>
                    <span className={hours > 0 ? 'hours-chip active' : 'hours-chip'}>
                      {hours > 0 ? `${hours} hours` : 'Off'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="work-schedule-page">
      <div className="schedule-tabs">
        {(['overview', 'schedule', 'employees', 'approvals'] as const).map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'approvals' && approvalCount > 0 && (
              <span>{approvalCount}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="schedule-stat-grid">
            <StatCard icon={<Users size={22} />} label="Total Employees" value={employees.length} />
            <StatCard icon={<CalendarDays size={22} />} label="Scheduled This Week" value={employees.length} />
            <StatCard icon={<Clock size={22} />} label="Selected Hours" value={`${totalHours}h`} />
            <StatCard icon={<UserCheck size={22} />} label="Pending Approvals" value={approvalCount} />
          </div>
          <Card>
            <CardHeader title="All Employees - This Week" subtitle="Hours scheduled per employee" />
            <CardContent>
              <div className="hours-list">
                {employeeRows.map(employee => (
                  <div key={employee.id} className="hours-row">
                    <span>{employee.firstName} {employee.lastName}</span>
                    <div className="hours-bar-bg">
                      <div className="hours-bar-fill" style={{ width: `${Math.min(100, totalHours / 40 * 100)}%` }} />
                    </div>
                    <strong>{selectedEmployee?.id === employee.id ? totalHours : 38}h</strong>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'schedule' && (
        <Card>
          <CardHeader title="Set Weekly Schedule" subtitle="Select an employee and set start/end times for each day" />
          <CardContent>
            <div className="schedule-controls">
              <label>
                Select Employee
                <select value={selectedEmployeeId} onChange={event => setSelectedEmployeeId(event.target.value)}>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Week Starting
                <input type="date" value={weekId} onChange={event => setWeekId(event.target.value)} />
              </label>
            </div>

            <div className="schedule-editor-grid">
              {days.map((day, index) => {
                const shifts = schedule?.shifts || buildShiftsFromHours(schedule?.hours || []);
                const shift = shifts[index] || { startTime: '', endTime: '' };
                const hours = schedule?.hours[index] || 0;

                return (
                  <div key={day} className="schedule-time-editor">
                    <strong>{day}</strong>
                    <label>
                      Start
                      <input
                        type="time"
                        value={shift.startTime}
                        onChange={event => updateShift(index, 'startTime', event.target.value)}
                      />
                    </label>
                    <label>
                      End
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={event => updateShift(index, 'endTime', event.target.value)}
                      />
                    </label>
                    <span>{hours > 0 ? `${hours}h` : 'Off'}</span>
                  </div>
                );
              })}
            </div>

            <div className="schedule-save-row">
              <strong>Weekly Total: {totalHours}h</strong>
              <Button onClick={saveSchedule}>Save Schedule</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'employees' && (
        <Card>
          <CardHeader title="All Employees" />
          <CardContent>
            <div className="schedule-table">
              {employees.map(employee => (
                <div key={employee.id} className="schedule-table-row">
                  <span>{employee.firstName} {employee.lastName}</span>
                  <span>{employee.email}</span>
                  <strong>Employee</strong>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'approvals' && (
        <Card>
          <CardHeader title="Pending Approvals" subtitle="Approve users, time actions, and bank wire updates" />
          <CardContent>
            <div className="approval-list">
              {approvalCount === 0 ? (
                <div className="empty-state">No pending approvals.</div>
              ) : (
                <>
                  {pendingUsers.map(user => (
                    <div key={user.uid} className="approval-row">
                      <div>
                        <strong>{user.name || user.email}</strong>
                        <span>{user.email}</span>
                      </div>
                      <Button size="sm" icon={<Check size={16} />} onClick={() => approveUser(user.uid, 'employee')}>
                        Approve Employee
                      </Button>
                      {currentUser.role === 'admin' && (
                        <Button size="sm" variant="secondary" onClick={() => approveUser(user.uid, 'manager')}>
                          Approve Manager
                        </Button>
                      )}
                      {currentUser.role === 'admin' && (
                        <Button size="sm" variant="secondary" onClick={() => approveUser(user.uid, 'admin')}>
                        Approve Admin
                        </Button>
                      )}
                    </div>
                  ))}

                  {pendingTimeRequests.map(request => (
                    <div key={request.id} className="approval-row">
                      <div>
                        <strong>{request.employeeName}</strong>
                        <span>
                          {request.action === 'clock-in' ? 'Clock in' : 'Clock out'} requested at {request.requestedTime}
                        </span>
                        <span>{request.reason}</span>
                      </div>
                      <Button size="sm" icon={<Check size={16} />} onClick={() => approveTimeRequest(request.id)}>
                        Approve Time
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => rejectTimeRequest(request)}>
                        Reject
                      </Button>
                    </div>
                  ))}

                  {pendingBankRequests.map(request => (
                    <div key={request.id} className="approval-row">
                      <Landmark size={20} />
                      <div>
                        <strong>{request.accountHolder}</strong>
                        <span>
                          {request.bankName} {request.accountType} ending {request.accountLast4}
                        </span>
                        <span>Routing ending {request.routingLast4}</span>
                      </div>
                      <Button size="sm" icon={<Check size={16} />} onClick={() => approveBankRequest(request.id)}>
                        Approve Bank
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => rejectBankRequest(request)}>
                        Reject
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="schedule-stat-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
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
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        <strong>{today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
        <span>Fridays are pay days</span>
      </div>
      <div className="mini-calendar-weekdays">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="mini-calendar-grid">
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

function ScheduleDisplay({ schedule }: { schedule: WeeklySchedule | null }) {
  const hours = schedule?.hours || [0, 0, 0, 0, 0, 0, 0];
  const shifts = schedule?.shifts || buildShiftsFromHours(hours);

  return (
    <div className="schedule-display-grid">
      {days.map((day, index) => {
        const shift = shifts[index];

        return (
          <div key={day} className={hours[index] > 0 ? 'has-hours' : ''}>
            <span>{day}</span>
            <strong>{hours[index] > 0 ? `${hours[index]}h` : '-'}</strong>
            {hours[index] > 0 && shift && <small>{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</small>}
          </div>
        );
      })}
    </div>
  );
}

function getNextShift(schedule: WeeklySchedule | null) {
  const today = new Date().getDay();
  const hours = schedule?.hours || [];
  const shifts = schedule?.shifts || buildShiftsFromHours(hours);

  for (let offset = 0; offset < 7; offset++) {
    const index = (today + offset) % 7;
    if ((hours[index] || 0) > 0) {
      return {
        day: fullDays[index],
        hours: hours[index],
        shift: shifts[index],
      };
    }
  }

  return null;
}

function toMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getShiftHours(startTime: string, endTime: string) {
  if (!startTime || !endTime) return 0;
  const minutes = Math.max(0, toMinutes(endTime) - toMinutes(startTime));
  return Math.round((minutes / 60) * 100) / 100;
}

function addHoursToTime(startTime: string, hoursToAdd: number) {
  const totalMinutes = toMinutes(startTime) + Math.round(hoursToAdd * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function buildShiftsFromHours(hours: number[]) {
  return [...hours, 0, 0, 0, 0, 0, 0, 0].slice(0, 7).map(hoursForDay => ({
    startTime: hoursForDay > 0 ? '09:00' : '',
    endTime: hoursForDay > 0 ? addHoursToTime('09:00', hoursForDay) : '',
  }));
}

function formatTime(time: string) {
  if (!time) return '--:--';
  return new Date(`2026-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
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
