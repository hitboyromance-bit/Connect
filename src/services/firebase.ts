import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firebaseConfig, USE_MOCK_DATA } from '../config/firebase';
import type { 
  User as UserType, 
  Employee, 
  TimeRecord, 
  PayrollRecord, 
  Notification,
  EmployeeFormValues,
  ApiResponse,
  AuditLog,
  BankApprovalRequest,
  BankDetails,
  BankDetailsFormValues,
  TimeApprovalAction,
  TimeApprovalRequest,
  WeeklySchedule
} from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Mock Data Store
class MockDataStore {
  private users: UserType[] = [];
  private employees: Employee[] = [];
  private timeRecords: TimeRecord[] = [];
  private bankDetails: BankDetails[] = [];
  private bankApprovalRequests: BankApprovalRequest[] = [];
  private payrollRecords: PayrollRecord[] = [];
  private notifications: Notification[] = [];
  private auditLogs: AuditLog[] = [];
  private passwords = new Map<string, string>();
  private schedules: WeeklySchedule[] = [];
  private timeApprovalRequests: TimeApprovalRequest[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    const demoUsers: UserType[] = [
      {
        uid: 'admin-1',
        name: 'Alex Miller',
        email: 'miller@gmail.com',
        role: 'admin',
        createdAt: new Date(),
      },
      {
        uid: 'emp-demo-1',
        name: 'Enmon Khan',
        email: 'khan@gmail.com',
        role: 'employee',
        createdAt: new Date(),
      },
      {
        uid: 'pending-demo-1',
        name: 'Mingmar Sherpa',
        email: 'mingmar@gmail.com',
        role: 'pending',
        createdAt: new Date(),
      },
    ];

    this.users.push(...demoUsers);
    demoUsers.forEach(user => {
      this.passwords.set(user.email.toLowerCase(), '123456789');
    });

    // Initialize with sample employees
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    const positions = ['Manager', 'Senior', 'Junior', 'Intern', 'Lead'];
    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Lisa', 'James', 'Jennifer', 'Robert', 'Maria'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    for (let i = 0; i < 20; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const department = departments[i % departments.length];
      const position = positions[i % positions.length];
      
      this.employees.push({
        id: `emp-${i + 1}`,
        employeeNumber: `EMP${String(i + 1).padStart(4, '0')}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
        phone: `+1 555-${String(1000 + i).padStart(4, '0')}`,
        department,
        position,
        workSchedule: {
          day: 'Monday-Friday',
          startTime: '09:00',
          endTime: '17:00',
          breakDuration: 60
        },
        hourlyRate: 25 + (i % 5) * 5,
        startDate: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
        status: i < 18 ? 'active' : 'inactive',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      this.users.push({
        uid: `emp-${i + 1}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
        role: 'employee',
        createdAt: new Date(),
      });
    }

    this.employees.unshift({
      id: 'emp-demo-1',
      employeeNumber: 'EMP-DEMO',
      firstName: 'Enmon',
      lastName: 'Khan',
      email: 'khan@gmail.com',
      phone: '+1 555-0199',
      department: 'Operations',
      position: 'Associate',
      workSchedule: {
        day: 'Monday-Friday',
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60,
      },
      hourlyRate: 28,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.users.push({
      uid: 'pending-1',
      name: 'Taylor Pending',
      email: 'taylor.pending@company.com',
      role: 'pending',
      createdAt: new Date(),
    });

    // Initialize time records for today
    const today = new Date().toISOString().split('T')[0];
    this.employees.filter(e => e.status === 'active').slice(0, 15).forEach((emp, idx) => {
      const clockInHour = 8 + (idx % 3);
      this.timeRecords.push({
        id: `time-${emp.id}-${today}`,
        employeeId: emp.id,
        date: today,
        clockIn: `${String(clockInHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
        clockOut: null,
        breakTime: 30 + Math.floor(Math.random() * 30),
        breakSeconds: 0,
        totalSeconds: 0,
        totalHours: 0,
        status: idx < 12 ? 'clocked-in' : 'clocked-out',
        createdAt: new Date()
      });
    });

    // Initialize notifications
    const notificationTypes = ['schedule', 'attendance', 'payroll', 'system'] as const;
    const notificationTitles = [
      'Schedule Update',
      'Overtime Alert',
      'Payroll Processed',
      'System Maintenance',
      'New Employee Added',
      'Policy Update'
    ];
    
    for (let i = 0; i < 10; i++) {
      this.notifications.push({
        id: `notif-${i + 1}`,
        userId: 'admin-1',
        title: notificationTitles[i % notificationTitles.length],
        message: `This is a sample notification message ${i + 1}. Please review and take necessary action.`,
        type: notificationTypes[i % notificationTypes.length],
        read: i > 3,
        createdAt: new Date(Date.now() - i * 3600000)
      });
    }

    // Initialize payroll records
    const months = ['January', 'February', 'March'];
    this.employees.filter(e => e.status === 'active').forEach(emp => {
      months.forEach((month, monthIdx) => {
        const regularHours = 160;
        const overtimeHours = Math.floor(Math.random() * 20);
        const hourlyRate = emp.hourlyRate;
        const overtimeRate = hourlyRate * 1.5;
        
        this.payrollRecords.push({
          id: `payroll-${emp.id}-${monthIdx + 1}`,
          employeeId: emp.id,
          month,
          year: 2026,
          regularHours,
          overtimeHours,
          hourlyRate,
          overtimeRate,
          grossSalary: (regularHours * hourlyRate) + (overtimeHours * overtimeRate),
          deductions: 0,
          netSalary: (regularHours * hourlyRate) + (overtimeHours * overtimeRate),
          status: monthIdx < 2 ? 'paid' : 'pending',
          createdAt: new Date()
        });
      });
    });
  }

  // Auth Methods
  async register(email: string, password: string, name?: string): Promise<ApiResponse<UserType>> {
    try {
      if (this.users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'Email already registered.' };
      }

      const userId = `user-${Date.now()}`;
      const newUser: UserType = {
        uid: userId,
        name,
        email,
        role: 'pending',
        createdAt: new Date()
      };
      this.users.push(newUser);
      this.passwords.set(email.toLowerCase(), password);
      return { success: true, data: newUser };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<UserType>> {
    try {
      const normalizedEmail = email.toLowerCase();
      const savedPassword = this.passwords.get(normalizedEmail);
      const user = this.users.find(item => item.email.toLowerCase() === normalizedEmail);

      if (!user || savedPassword !== password) {
        return { success: false, error: 'Invalid email or password.' };
      }

      if (user.role === 'removed') {
        return { success: false, error: 'This account has been removed.' };
      }

      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    return { success: true };
  }

  async resetPassword(_email: string): Promise<ApiResponse<void>> {
    return { success: true };
  }

  // Employee Methods
  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    return { success: true, data: this.employees };
  }

  async getUsers(): Promise<ApiResponse<UserType[]>> {
    return { success: true, data: this.users };
  }

  async approveUser(uid: string, role: 'admin' | 'manager' | 'employee'): Promise<ApiResponse<UserType>> {
    const user = this.users.find(item => item.uid === uid);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    user.role = role;

    if (role === 'employee' && !this.employees.some(employee => employee.id === uid)) {
      const [firstName = 'New', lastName = 'Employee'] = (user.name || user.email).split(' ');
      this.employees.push({
        id: uid,
        employeeNumber: `EMP${String(this.employees.length + 1).padStart(4, '0')}`,
        firstName,
        lastName,
        email: user.email,
        phone: '+1 555-0000',
        department: 'Operations',
        position: 'Associate',
        workSchedule: {
          day: 'Monday-Friday',
          startTime: '09:00',
          endTime: '17:00',
          breakDuration: 60,
        },
        hourlyRate: 25,
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { success: true, data: user };
  }

  async updateUserProfile(uid: string, data: Partial<Pick<UserType, 'name' | 'email'>>): Promise<ApiResponse<UserType>> {
    const index = this.users.findIndex(user => user.uid === uid);
    if (index < 0) return { success: false, error: 'User not found' };
    this.users[index] = { ...this.users[index], ...data };
    return { success: true, data: this.users[index] };
  }

  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    const employee = this.employees.find(e => e.id === id);
    if (employee) {
      return { success: true, data: employee };
    }
    return { success: false, error: 'Employee not found' };
  }

  async createEmployee(data: EmployeeFormValues): Promise<ApiResponse<Employee>> {
    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      employeeNumber: `EMP${String(this.employees.length + 1).padStart(4, '0')}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.employees.push(newEmployee);
    return { success: true, data: newEmployee };
  }

  async updateEmployee(id: string, data: Partial<EmployeeFormValues>): Promise<ApiResponse<Employee>> {
    const index = this.employees.findIndex(e => e.id === id);
    if (index >= 0) {
      this.employees[index] = { ...this.employees[index], ...data, updatedAt: new Date() };
      return { success: true, data: this.employees[index] };
    }
    return { success: false, error: 'Employee not found' };
  }

  async deleteEmployee(id: string): Promise<ApiResponse<void>> {
    const index = this.employees.findIndex(e => e.id === id);
    if (index >= 0) {
      this.employees.splice(index, 1);
      return { success: true };
    }
    return { success: false, error: 'Employee not found' };
  }

  // Time Record Methods
  async getTimeRecords(employeeId?: string, date?: string): Promise<ApiResponse<TimeRecord[]>> {
    let records = this.timeRecords;
    if (employeeId) {
      records = records.filter(r => r.employeeId === employeeId);
    }
    if (date) {
      records = records.filter(r => r.date === date);
    }
    return { success: true, data: records };
  }

  async getTimeRecordsByDateRange(startDate: string, endDate: string, employeeId?: string): Promise<ApiResponse<TimeRecord[]>> {
    let records = this.timeRecords.filter(record => record.date >= startDate && record.date <= endDate);
    if (employeeId) {
      records = records.filter(record => record.employeeId === employeeId);
    }
    return { success: true, data: records };
  }

  async clockIn(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    const today = new Date().toISOString().split('T')[0];
    const existingRecord = this.timeRecords.find(
      r => r.employeeId === employeeId && r.date === today && r.status === 'clocked-in'
    );
    
    if (existingRecord) {
      return { success: false, error: 'Already clocked in' };
    }

    const newRecord: TimeRecord = {
      id: `time-${employeeId}-${today}`,
      employeeId,
      date: today,
      clockIn: getCurrentTimeString(),
      clockOut: null,
      breakTime: 0,
      breakSeconds: 0,
      totalSeconds: 0,
      totalHours: 0,
      status: 'clocked-in',
      createdAt: new Date()
    };
    this.timeRecords.push(newRecord);
    return { success: true, data: newRecord };
  }

  async clockOut(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    const today = new Date().toISOString().split('T')[0];
    const record = this.timeRecords.find(
      r => r.employeeId === employeeId && r.date === today && (r.status === 'clocked-in' || r.status === 'on-break')
    );
    
    if (!record) {
      return { success: false, error: 'Not clocked in' };
    }

    const clockOutTime = getCurrentTimeString();
    const breakSeconds = record.status === 'on-break' && record.breakStart
      ? getBreakSeconds(record) + getSecondDiff(record.breakStart, clockOutTime)
      : getBreakSeconds(record);
    const totalSeconds = Math.max(0, getSecondDiff(record.clockIn!, clockOutTime) - breakSeconds);
    record.clockOut = clockOutTime;
    record.breakStart = null;
    record.breakSeconds = breakSeconds;
    record.breakTime = Math.round(breakSeconds / 60);
    record.totalSeconds = totalSeconds;
    record.totalHours = roundHoursFromSeconds(totalSeconds);
    record.status = 'clocked-out';
    
    return { success: true, data: record };
  }

  async startMealBreak(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    const today = new Date().toISOString().split('T')[0];
    const record = this.timeRecords.find(
      r => r.employeeId === employeeId && r.date === today && r.status === 'clocked-in'
    );

    if (!record) {
      return { success: false, error: 'Clock in before starting a meal break.' };
    }

    record.status = 'on-break';
    record.breakStart = getCurrentTimeString();
    return { success: true, data: record };
  }

  async endMealBreak(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    const today = new Date().toISOString().split('T')[0];
    const record = this.timeRecords.find(
      r => r.employeeId === employeeId && r.date === today && r.status === 'on-break'
    );

    if (!record || !record.breakStart) {
      return { success: false, error: 'No active meal break found.' };
    }

    const breakEnd = getCurrentTimeString();
    const elapsedBreakSeconds = getSecondDiff(record.breakStart, breakEnd);
    if (elapsedBreakSeconds < 3600) {
      return {
        success: false,
        error: `Meal time has not ended. You can end meal break at ${addSecondsToTime(record.breakStart, 3600)}.`,
      };
    }

    record.breakSeconds = getBreakSeconds(record) + elapsedBreakSeconds;
    record.breakTime = Math.round(record.breakSeconds / 60);
    record.breakStart = null;
    record.status = 'clocked-in';
    return { success: true, data: record };
  }

  async createTimeApprovalRequest(
    employee: Employee,
    action: TimeApprovalAction,
    reason: string
  ): Promise<ApiResponse<TimeApprovalRequest>> {
    const request: TimeApprovalRequest = {
      id: `time-approval-${Date.now()}`,
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      action,
      requestedTime: getCurrentTimeString(),
      requestedDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      reason,
      createdAt: new Date(),
      reviewedAt: null,
    };
    this.timeApprovalRequests.push(request);
    return { success: true, data: request };
  }

  async getTimeApprovalRequests(status?: TimeApprovalRequest['status']): Promise<ApiResponse<TimeApprovalRequest[]>> {
    const requests = status
      ? this.timeApprovalRequests.filter(request => request.status === status)
      : this.timeApprovalRequests;
    return { success: true, data: requests };
  }

  async approveTimeApprovalRequest(id: string): Promise<ApiResponse<TimeApprovalRequest>> {
    const request = this.timeApprovalRequests.find(item => item.id === id);
    if (!request) {
      return { success: false, error: 'Time approval request not found.' };
    }

    if (request.action === 'clock-in') {
      await this.clockIn(request.employeeId);
    } else {
      await this.clockOut(request.employeeId);
    }

    request.status = 'approved';
    request.reviewedAt = new Date();
    return { success: true, data: request };
  }

  async rejectTimeApprovalRequest(id: string, reason: string): Promise<ApiResponse<TimeApprovalRequest>> {
    const request = this.timeApprovalRequests.find(item => item.id === id);
    if (!request) {
      return { success: false, error: 'Time approval request not found.' };
    }

    request.status = 'rejected';
    request.rejectionReason = reason;
    request.reviewedAt = new Date();
    return { success: true, data: request };
  }

  // Payroll Methods
  async getPayrollRecords(employeeId?: string): Promise<ApiResponse<PayrollRecord[]>> {
    let records = this.payrollRecords;
    if (employeeId) {
      records = records.filter(r => r.employeeId === employeeId);
    }
    return { success: true, data: records };
  }

  async getPayrollRecordsByStatus(status: PayrollRecord['status']): Promise<ApiResponse<PayrollRecord[]>> {
    return { success: true, data: this.payrollRecords.filter(record => record.status === status) };
  }

  async savePayrollRecord(record: PayrollRecord): Promise<ApiResponse<PayrollRecord>> {
    const index = this.payrollRecords.findIndex(item => item.id === record.id);
    if (index >= 0) {
      this.payrollRecords[index] = record;
    } else {
      this.payrollRecords.push(record);
    }
    return { success: true, data: record };
  }

  async updatePayrollStatus(id: string, status: PayrollRecord['status']): Promise<ApiResponse<PayrollRecord>> {
    const record = this.payrollRecords.find(item => item.id === id);
    if (!record) return { success: false, error: 'Payroll record not found.' };
    record.status = status;
    return { success: true, data: record };
  }

  // Notification Methods
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    return { success: true, data: this.notifications };
  }

  async createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<ApiResponse<Notification>> {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      ...data,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.unshift(notification);
    return { success: true, data: notification };
  }

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      return { success: true };
    }
    return { success: false, error: 'Notification not found' };
  }

  async getWeeklySchedule(employeeId: string, weekId: string): Promise<ApiResponse<WeeklySchedule>> {
    const schedule = this.schedules.find(item => item.employeeId === employeeId && item.weekId === weekId);
    return {
      success: true,
      data: normalizeWeeklySchedule(schedule || {
        employeeId,
        weekId,
        hours: [0, 8, 8, 8, 8, 6, 0],
      }),
    };
  }

  async saveWeeklySchedule(schedule: WeeklySchedule): Promise<ApiResponse<WeeklySchedule>> {
    const normalizedSchedule = normalizeWeeklySchedule(schedule);
    const index = this.schedules.findIndex(
      item => item.employeeId === normalizedSchedule.employeeId && item.weekId === normalizedSchedule.weekId
    );

    if (index >= 0) {
      this.schedules[index] = normalizedSchedule;
    } else {
      this.schedules.push(normalizedSchedule);
    }

    return { success: true, data: normalizedSchedule };
  }

  async getBankDetails(userId: string): Promise<ApiResponse<BankDetails | null>> {
    return {
      success: true,
      data: this.bankDetails.find(item => item.userId === userId) || null,
    };
  }

  async saveBankDetails(userId: string, data: BankDetailsFormValues): Promise<ApiResponse<BankDetails>> {
    const bankDetails = buildBankDetails(userId, data);
    const index = this.bankDetails.findIndex(item => item.userId === userId);
    if (index >= 0) {
      this.bankDetails[index] = bankDetails;
    } else {
      this.bankDetails.push(bankDetails);
    }
    this.bankApprovalRequests.unshift({
      id: `bank-approval-${Date.now()}`,
      userId,
      accountHolder: bankDetails.accountHolder,
      bankName: bankDetails.bankName,
      accountType: bankDetails.accountType,
      accountLast4: bankDetails.accountLast4,
      routingLast4: bankDetails.routingLast4,
      status: 'pending',
      createdAt: new Date(),
      reviewedAt: null,
    });
    return { success: true, data: bankDetails };
  }

  async getBankApprovalRequests(status?: BankApprovalRequest['status']): Promise<ApiResponse<BankApprovalRequest[]>> {
    const requests = status
      ? this.bankApprovalRequests.filter(item => item.status === status)
      : this.bankApprovalRequests;
    return { success: true, data: requests };
  }

  async approveBankDetails(requestId: string): Promise<ApiResponse<BankApprovalRequest>> {
    const request = this.bankApprovalRequests.find(item => item.id === requestId);
    if (!request) return { success: false, error: 'Bank approval request not found.' };

    const bankDetails = this.bankDetails.find(item => item.userId === request.userId);
    if (bankDetails) bankDetails.status = 'verified';
    request.status = 'approved';
    request.reviewedAt = new Date();
    return { success: true, data: request };
  }

  async rejectBankDetails(requestId: string, reason: string): Promise<ApiResponse<BankApprovalRequest>> {
    const request = this.bankApprovalRequests.find(item => item.id === requestId);
    if (!request) return { success: false, error: 'Bank approval request not found.' };
    const bankDetails = this.bankDetails.find(item => item.userId === request.userId);
    if (bankDetails) bankDetails.status = 'pending-verification';
    request.status = 'rejected';
    request.rejectionReason = reason;
    request.reviewedAt = new Date();
    return { success: true, data: request };
  }

  async createAuditLog(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<ApiResponse<AuditLog>> {
    const log: AuditLog = { id: `audit-${Date.now()}`, ...data, createdAt: new Date() };
    this.auditLogs.unshift(log);
    return { success: true, data: log };
  }

  async getAuditLogs(): Promise<ApiResponse<AuditLog[]>> {
    return { success: true, data: this.auditLogs };
  }
}

export const mockStore = new MockDataStore();

function normalizeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date();
}

function getCurrentTimeString() {
  return new Date().toTimeString().slice(0, 8);
}

function toSeconds(time: string) {
  const [hours = 0, minutes = 0, seconds = 0] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function getSecondDiff(startTime: string, endTime: string) {
  return Math.max(0, toSeconds(endTime) - toSeconds(startTime));
}

function getBreakSeconds(record: TimeRecord) {
  return record.breakSeconds ?? record.breakTime * 60;
}

function roundHoursFromSeconds(seconds: number) {
  return Math.round((seconds / 3600) * 10000) / 10000;
}

function addSecondsToTime(time: string, secondsToAdd: number) {
  const total = toSeconds(time) + secondsToAdd;
  const nextHours = Math.floor(total / 3600) % 24;
  const nextMinutes = Math.floor((total % 3600) / 60);
  const nextSeconds = total % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}:${String(nextSeconds).padStart(2, '0')}`;
}

function maskLast4(value: string) {
  return value.replace(/\D/g, '').slice(-4);
}

function buildSecureBankLink(userId: string) {
  const token = `${userId}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '');
  return `${window.location.origin}/settings?secure=bank-wire&token=${encodeURIComponent(token)}`;
}

function buildBankDetails(userId: string, data: BankDetailsFormValues): BankDetails {
  return {
    userId,
    accountHolder: data.accountHolder,
    bankName: data.bankName,
    accountType: data.accountType,
    routingLast4: maskLast4(data.routingNumber),
    accountLast4: maskLast4(data.accountNumber),
    secureLink: buildSecureBankLink(userId),
    status: 'pending-verification',
    updatedAt: new Date(),
  };
}

function getShiftHours(startTime: string, endTime: string) {
  if (!startTime || !endTime) return 0;
  const seconds = getSecondDiff(`${startTime}:00`.slice(0, 8), `${endTime}:00`.slice(0, 8));
  return roundHoursFromSeconds(seconds);
}

function normalizeWeeklySchedule(schedule: WeeklySchedule): WeeklySchedule {
  const hours = [...schedule.hours, 0, 0, 0, 0, 0, 0, 0].slice(0, 7);
  const shifts = schedule.shifts?.length === 7
    ? schedule.shifts
    : hours.map(hoursForDay => ({
        startTime: hoursForDay > 0 ? '09:00' : '',
        endTime: hoursForDay > 0 ? addSecondsToTime('09:00:00', hoursForDay * 3600).slice(0, 5) : '',
      }));

  return {
    ...schedule,
    hours: shifts.map(shift => getShiftHours(shift.startTime, shift.endTime)),
    shifts,
  };
}

function readDoc<T>(id: string, data: Record<string, unknown>): T {
  return {
    id,
    ...data,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: data.updatedAt ? normalizeDate(data.updatedAt) : undefined,
  } as unknown as T;
}

function getFirebaseErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: string }).code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.';
    case 'auth/operation-not-allowed':
      return 'Email/password login is not enabled in Firebase Authentication.';
    case 'auth/email-already-in-use':
      return 'Email already registered.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error connecting to Firebase.';
    case 'unavailable':
      return 'Firestore is unavailable. Check your internet connection and make sure Firestore Database is created for this Firebase project.';
    case 'permission-denied':
      return 'Firestore permission denied. Check your Firestore rules and make sure this user has a users document.';
    case 'failed-precondition':
      return 'Firestore is not ready for this request. Make sure Firestore Database is enabled in Firebase Console.';
    default:
      if (error instanceof Error && error.message.includes('client is offline')) {
        return 'Firestore says the client is offline. Create/enable Firestore Database, check your connection, then restart the dev server.';
      }
      return error instanceof Error ? error.message : 'Firebase request failed.';
  }
}

class FirestoreDataStore {
  async register(email: string, password: string, name?: string): Promise<ApiResponse<UserType>> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }

      const user: UserType = {
        uid: credential.user.uid,
        name,
        email,
        role: 'pending',
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', user.uid), user);
      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<UserType>> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'users', credential.user.uid);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) {
        const user: UserType = {
          uid: credential.user.uid,
          name: credential.user.displayName || credential.user.email || email,
          email: credential.user.email || email,
          role: 'pending',
          createdAt: new Date(),
        };
        await setDoc(userRef, user);
        return { success: true, data: user };
      }

      const user = readDoc<UserType>(credential.user.uid, snapshot.data());
      if (user.role === 'removed') {
        await signOut(auth);
        return { success: false, error: 'This account has been removed.' };
      }

      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    await signOut(auth);
    return { success: true };
  }

  async resetPassword(email: string): Promise<ApiResponse<void>> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
  }

  async getUsers(): Promise<ApiResponse<UserType[]>> {
    const snapshot = await getDocs(collection(db, 'users'));
    return {
      success: true,
      data: snapshot.docs.map(item => readDoc<UserType>(item.id, item.data())),
    };
  }

  async approveUser(uid: string, role: 'admin' | 'manager' | 'employee'): Promise<ApiResponse<UserType>> {
    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return { success: false, error: 'User not found' };
    }

    await updateDoc(userRef, { role });
    const user = readDoc<UserType>(uid, { ...snapshot.data(), role });

    if (role === 'employee') {
      const employeeRef = doc(db, 'employees', uid);
      const employeeSnapshot = await getDoc(employeeRef);
      if (!employeeSnapshot.exists()) {
        const [firstName = 'New', lastName = 'Employee'] = (user.name || user.email).split(' ');
        const employee: Employee = {
          id: uid,
          employeeNumber: `EMP-${uid.slice(0, 6).toUpperCase()}`,
          firstName,
          lastName,
          email: user.email,
          phone: '+1 555-0000',
          department: 'Operations',
          position: 'Associate',
          workSchedule: {
            day: 'Monday-Friday',
            startTime: '09:00',
            endTime: '17:00',
            breakDuration: 60,
          },
          hourlyRate: 25,
          startDate: new Date().toISOString().split('T')[0],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await setDoc(employeeRef, employee);
      }
    }

    return { success: true, data: user };
  }

  async updateUserProfile(uid: string, data: Partial<Pick<UserType, 'name' | 'email'>>): Promise<ApiResponse<UserType>> {
    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      return { success: false, error: 'User not found' };
    }
    await updateDoc(userRef, data);
    const user = readDoc<UserType>(uid, { ...snapshot.data(), ...data });
    if (auth.currentUser && auth.currentUser.uid === uid && data.name) {
      await updateProfile(auth.currentUser, { displayName: data.name });
    }
    return { success: true, data: user };
  }

  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    const snapshot = await getDocs(collection(db, 'employees'));
    return {
      success: true,
      data: snapshot.docs.map(item => readDoc<Employee>(item.id, item.data())),
    };
  }

  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    const snapshot = await getDoc(doc(db, 'employees', id));
    if (!snapshot.exists()) {
      return { success: false, error: 'Employee not found' };
    }
    return { success: true, data: readDoc<Employee>(snapshot.id, snapshot.data()) };
  }

  async createEmployee(data: EmployeeFormValues): Promise<ApiResponse<Employee>> {
    const usersByEmail = await getDocs(
      query(collection(db, 'users'), where('email', '==', data.email))
    );
    const matchingUser = usersByEmail.docs[0];
    const matchingUserData = matchingUser?.data() as UserType | undefined;
    const employeeRef = matchingUser
      ? doc(db, 'employees', matchingUser.id)
      : doc(collection(db, 'employees'));
    const employee: Employee = {
      id: employeeRef.id,
      employeeNumber: `EMP${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(employeeRef, employee);

    if (matchingUser && matchingUserData?.role !== 'admin') {
      await updateDoc(doc(db, 'users', matchingUser.id), {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        role: 'employee',
      });
    }

    return { success: true, data: employee };
  }

  async updateEmployee(id: string, data: Partial<EmployeeFormValues>): Promise<ApiResponse<Employee>> {
    const employeeRef = doc(db, 'employees', id);
    await updateDoc(employeeRef, { ...data, updatedAt: new Date() });
    return this.getEmployee(id);
  }

  async deleteEmployee(id: string): Promise<ApiResponse<void>> {
    await deleteDoc(doc(db, 'employees', id));
    return { success: true };
  }

  async getTimeRecords(employeeId?: string, date?: string): Promise<ApiResponse<TimeRecord[]>> {
    const constraints = [];
    if (employeeId) constraints.push(where('employeeId', '==', employeeId));
    if (date) constraints.push(where('date', '==', date));
    const recordsQuery = constraints.length
      ? query(collection(db, 'timeRecords'), ...constraints)
      : collection(db, 'timeRecords');
    const snapshot = await getDocs(recordsQuery);
    return {
      success: true,
      data: snapshot.docs.map(item => readDoc<TimeRecord>(item.id, item.data())),
    };
  }

  async getTimeRecordsByDateRange(startDate: string, endDate: string, employeeId?: string): Promise<ApiResponse<TimeRecord[]>> {
    const constraints = [
      where('date', '>=', startDate),
      where('date', '<=', endDate),
    ];
    if (employeeId) constraints.push(where('employeeId', '==', employeeId));
    const snapshot = await getDocs(query(collection(db, 'timeRecords'), ...constraints));
    return {
      success: true,
      data: snapshot.docs.map(item => readDoc<TimeRecord>(item.id, item.data())),
    };
  }

  async clockIn(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.getTimeRecords(employeeId, today);
    if (existing.data?.some(record => record.status === 'clocked-in')) {
      return { success: false, error: 'Already clocked in' };
    }

    const recordRef = doc(collection(db, 'timeRecords'));
    const record: TimeRecord = {
      id: recordRef.id,
      employeeId,
      date: today,
      clockIn: getCurrentTimeString(),
      clockOut: null,
      breakTime: 0,
      breakSeconds: 0,
      totalSeconds: 0,
      totalHours: 0,
      status: 'clocked-in',
      createdAt: new Date(),
    };
    await setDoc(recordRef, record);
    return { success: true, data: record };
  }

  async clockOut(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    const today = new Date().toISOString().split('T')[0];
    const records = await this.getTimeRecords(employeeId, today);
    const record = records.data?.find(item => item.status === 'clocked-in' || item.status === 'on-break');

    if (!record) {
      return { success: false, error: 'Not clocked in' };
    }

    const clockOutTime = getCurrentTimeString();
    const breakSeconds = record.status === 'on-break' && record.breakStart
      ? getBreakSeconds(record) + getSecondDiff(record.breakStart, clockOutTime)
      : getBreakSeconds(record);
    const totalSeconds = Math.max(0, getSecondDiff(record.clockIn!, clockOutTime) - breakSeconds);
    const updatedRecord: TimeRecord = {
      ...record,
      clockOut: clockOutTime,
      breakStart: null,
      breakSeconds,
      breakTime: Math.round(breakSeconds / 60),
      totalSeconds,
      totalHours: roundHoursFromSeconds(totalSeconds),
      status: 'clocked-out',
    };

    await updateDoc(doc(db, 'timeRecords', record.id), {
      clockOut: updatedRecord.clockOut,
      breakStart: updatedRecord.breakStart,
      breakSeconds: updatedRecord.breakSeconds,
      breakTime: updatedRecord.breakTime,
      totalSeconds: updatedRecord.totalSeconds,
      totalHours: updatedRecord.totalHours,
      status: updatedRecord.status,
    });
    return { success: true, data: updatedRecord };
  }

  async createTimeApprovalRequest(
    employee: Employee,
    action: TimeApprovalAction,
    reason: string
  ): Promise<ApiResponse<TimeApprovalRequest>> {
    const requestRef = doc(collection(db, 'timeApprovalRequests'));
    const request: TimeApprovalRequest = {
      id: requestRef.id,
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      action,
      requestedTime: getCurrentTimeString(),
      requestedDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      reason,
      createdAt: new Date(),
      reviewedAt: null,
    };

    await setDoc(requestRef, request);
    return { success: true, data: request };
  }

  async getTimeApprovalRequests(status?: TimeApprovalRequest['status']): Promise<ApiResponse<TimeApprovalRequest[]>> {
    const requestsQuery = status
      ? query(collection(db, 'timeApprovalRequests'), where('status', '==', status))
      : collection(db, 'timeApprovalRequests');
    const snapshot = await getDocs(requestsQuery);
    return {
      success: true,
      data: snapshot.docs.map(item => readDoc<TimeApprovalRequest>(item.id, item.data())),
    };
  }

  async approveTimeApprovalRequest(id: string): Promise<ApiResponse<TimeApprovalRequest>> {
    const requestRef = doc(db, 'timeApprovalRequests', id);
    const snapshot = await getDoc(requestRef);

    if (!snapshot.exists()) {
      return { success: false, error: 'Time approval request not found.' };
    }

    const request = readDoc<TimeApprovalRequest>(snapshot.id, snapshot.data());
    const actionResult = request.action === 'clock-in'
      ? await this.clockIn(request.employeeId)
      : await this.clockOut(request.employeeId);

    if (!actionResult.success) {
      return { success: false, error: actionResult.error };
    }

    const updatedRequest: TimeApprovalRequest = {
      ...request,
      status: 'approved',
      reviewedAt: new Date(),
    };
    await setDoc(requestRef, updatedRequest);
    return { success: true, data: updatedRequest };
  }

  async rejectTimeApprovalRequest(id: string, reason: string): Promise<ApiResponse<TimeApprovalRequest>> {
    const requestRef = doc(db, 'timeApprovalRequests', id);
    const snapshot = await getDoc(requestRef);
    if (!snapshot.exists()) {
      return { success: false, error: 'Time approval request not found.' };
    }
    const request = readDoc<TimeApprovalRequest>(snapshot.id, snapshot.data());
    const updatedRequest: TimeApprovalRequest = {
      ...request,
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: new Date(),
    };
    await setDoc(requestRef, updatedRequest);
    return { success: true, data: updatedRequest };
  }

  async startMealBreak(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    const today = new Date().toISOString().split('T')[0];
    const records = await this.getTimeRecords(employeeId, today);
    const record = records.data?.find(item => item.status === 'clocked-in');

    if (!record) {
      return { success: false, error: 'Clock in before starting a meal break.' };
    }

    const updatedRecord: TimeRecord = {
      ...record,
      status: 'on-break',
      breakStart: getCurrentTimeString(),
    };

    await setDoc(doc(db, 'timeRecords', record.id), updatedRecord);
    return { success: true, data: updatedRecord };
  }

  async endMealBreak(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    const today = new Date().toISOString().split('T')[0];
    const records = await this.getTimeRecords(employeeId, today);
    const record = records.data?.find(item => item.status === 'on-break');

    if (!record || !record.breakStart) {
      return { success: false, error: 'No active meal break found.' };
    }

    const breakEnd = getCurrentTimeString();
    const elapsedBreakSeconds = getSecondDiff(record.breakStart, breakEnd);
    if (elapsedBreakSeconds < 3600) {
      return {
        success: false,
        error: `Meal time has not ended. You can end meal break at ${addSecondsToTime(record.breakStart, 3600)}.`,
      };
    }

    const breakSeconds = getBreakSeconds(record) + elapsedBreakSeconds;
    const updatedRecord: TimeRecord = {
      ...record,
      status: 'clocked-in',
      breakStart: null,
      breakSeconds,
      breakTime: Math.round(breakSeconds / 60),
    };

    await setDoc(doc(db, 'timeRecords', record.id), updatedRecord);
    return { success: true, data: updatedRecord };
  }

  async getPayrollRecords(employeeId?: string): Promise<ApiResponse<PayrollRecord[]>> {
    const recordsQuery = employeeId
      ? query(collection(db, 'payrollRecords'), where('employeeId', '==', employeeId))
      : collection(db, 'payrollRecords');
    const snapshot = await getDocs(recordsQuery);
    return {
      success: true,
      data: snapshot.docs.map(item => readDoc<PayrollRecord>(item.id, item.data())),
    };
  }

  async getPayrollRecordsByStatus(status: PayrollRecord['status']): Promise<ApiResponse<PayrollRecord[]>> {
    const snapshot = await getDocs(query(collection(db, 'payrollRecords'), where('status', '==', status)));
    return {
      success: true,
      data: snapshot.docs.map(item => readDoc<PayrollRecord>(item.id, item.data())),
    };
  }

  async savePayrollRecord(record: PayrollRecord): Promise<ApiResponse<PayrollRecord>> {
    await setDoc(doc(db, 'payrollRecords', record.id), record);
    return { success: true, data: record };
  }

  async updatePayrollStatus(id: string, status: PayrollRecord['status']): Promise<ApiResponse<PayrollRecord>> {
    await updateDoc(doc(db, 'payrollRecords', id), { status });
    const snapshot = await getDoc(doc(db, 'payrollRecords', id));
    if (!snapshot.exists()) return { success: false, error: 'Payroll record not found.' };
    return { success: true, data: readDoc<PayrollRecord>(snapshot.id, snapshot.data()) };
  }

  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    const snapshot = await getDocs(collection(db, 'notifications'));
    return {
      success: true,
      data: snapshot.docs.map(item => readDoc<Notification>(item.id, item.data())),
    };
  }

  async createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<ApiResponse<Notification>> {
    const notificationRef = doc(collection(db, 'notifications'));
    const notification: Notification = {
      id: notificationRef.id,
      ...data,
      read: false,
      createdAt: new Date(),
    };
    await setDoc(notificationRef, notification);
    return { success: true, data: notification };
  }

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    await updateDoc(doc(db, 'notifications', id), { read: true });
    return { success: true };
  }

  async getWeeklySchedule(employeeId: string, weekId: string): Promise<ApiResponse<WeeklySchedule>> {
    const snapshot = await getDoc(doc(db, 'schedules', `${employeeId}_${weekId}`));
    if (!snapshot.exists()) {
      return {
        success: true,
        data: normalizeWeeklySchedule({ employeeId, weekId, hours: [0, 0, 0, 0, 0, 0, 0] }),
      };
    }

    return { success: true, data: normalizeWeeklySchedule(snapshot.data() as WeeklySchedule) };
  }

  async saveWeeklySchedule(schedule: WeeklySchedule): Promise<ApiResponse<WeeklySchedule>> {
    const normalizedSchedule = normalizeWeeklySchedule(schedule);
    await setDoc(doc(db, 'schedules', `${normalizedSchedule.employeeId}_${normalizedSchedule.weekId}`), normalizedSchedule);
    return { success: true, data: normalizedSchedule };
  }

  async getBankDetails(userId: string): Promise<ApiResponse<BankDetails | null>> {
    const snapshot = await getDoc(doc(db, 'bankDetails', userId));
    if (!snapshot.exists()) {
      return { success: true, data: null };
    }
    return { success: true, data: readDoc<BankDetails>(snapshot.id, snapshot.data()) };
  }

  async saveBankDetails(userId: string, data: BankDetailsFormValues): Promise<ApiResponse<BankDetails>> {
    const bankDetails = buildBankDetails(userId, data);
    await setDoc(doc(db, 'bankDetails', userId), bankDetails);
    const requestRef = doc(collection(db, 'bankApprovalRequests'));
    const approvalRequest: BankApprovalRequest = {
      id: requestRef.id,
      userId,
      accountHolder: bankDetails.accountHolder,
      bankName: bankDetails.bankName,
      accountType: bankDetails.accountType,
      accountLast4: bankDetails.accountLast4,
      routingLast4: bankDetails.routingLast4,
      status: 'pending',
      createdAt: new Date(),
      reviewedAt: null,
    };
    await setDoc(requestRef, approvalRequest);
    return { success: true, data: bankDetails };
  }

  async getBankApprovalRequests(status?: BankApprovalRequest['status']): Promise<ApiResponse<BankApprovalRequest[]>> {
    const requestsQuery = status
      ? query(collection(db, 'bankApprovalRequests'), where('status', '==', status))
      : collection(db, 'bankApprovalRequests');
    const snapshot = await getDocs(requestsQuery);
    return {
      success: true,
      data: snapshot.docs.map(item => readDoc<BankApprovalRequest>(item.id, item.data())),
    };
  }

  async approveBankDetails(requestId: string): Promise<ApiResponse<BankApprovalRequest>> {
    const requestRef = doc(db, 'bankApprovalRequests', requestId);
    const snapshot = await getDoc(requestRef);
    if (!snapshot.exists()) {
      return { success: false, error: 'Bank approval request not found.' };
    }
    const request = readDoc<BankApprovalRequest>(snapshot.id, snapshot.data());
    await updateDoc(doc(db, 'bankDetails', request.userId), { status: 'verified', updatedAt: new Date() });
    const updatedRequest: BankApprovalRequest = { ...request, status: 'approved', reviewedAt: new Date() };
    await setDoc(requestRef, updatedRequest);
    return { success: true, data: updatedRequest };
  }

  async rejectBankDetails(requestId: string, reason: string): Promise<ApiResponse<BankApprovalRequest>> {
    const requestRef = doc(db, 'bankApprovalRequests', requestId);
    const snapshot = await getDoc(requestRef);
    if (!snapshot.exists()) {
      return { success: false, error: 'Bank approval request not found.' };
    }
    const request = readDoc<BankApprovalRequest>(snapshot.id, snapshot.data());
    await updateDoc(doc(db, 'bankDetails', request.userId), { status: 'pending-verification', updatedAt: new Date() });
    const updatedRequest: BankApprovalRequest = {
      ...request,
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: new Date(),
    };
    await setDoc(requestRef, updatedRequest);
    return { success: true, data: updatedRequest };
  }

  async createAuditLog(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<ApiResponse<AuditLog>> {
    const logRef = doc(collection(db, 'auditLogs'));
    const log: AuditLog = { id: logRef.id, ...data, createdAt: new Date() };
    await setDoc(logRef, log);
    return { success: true, data: log };
  }

  async getAuditLogs(): Promise<ApiResponse<AuditLog[]>> {
    const snapshot = await getDocs(collection(db, 'auditLogs'));
    return {
      success: true,
      data: snapshot.docs.map(item => readDoc<AuditLog>(item.id, item.data())),
    };
  }
}

const firestoreStore = new FirestoreDataStore();

// Firebase Service
class FirebaseService {
  // Auth
  async registerUser(email: string, password: string, name?: string): Promise<ApiResponse<UserType>> {
    if (USE_MOCK_DATA) {
      return mockStore.register(email, password, name);
    }
    return firestoreStore.register(email, password, name);
  }

  async loginUser(email: string, password: string): Promise<ApiResponse<UserType>> {
    if (USE_MOCK_DATA) {
      return mockStore.login(email, password);
    }
    return firestoreStore.login(email, password);
  }

  async logoutUser(): Promise<ApiResponse<void>> {
    if (USE_MOCK_DATA) {
      return mockStore.logout();
    }
    return firestoreStore.logout();
  }

  async resetUserPassword(email: string): Promise<ApiResponse<void>> {
    if (USE_MOCK_DATA) {
      return mockStore.resetPassword(email);
    }
    return firestoreStore.resetPassword(email);
  }

  // Employees
  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    if (USE_MOCK_DATA) {
      return mockStore.getEmployees();
    }
    return firestoreStore.getEmployees();
  }

  async getUsers(): Promise<ApiResponse<UserType[]>> {
    if (USE_MOCK_DATA) {
      return mockStore.getUsers();
    }
    return firestoreStore.getUsers();
  }

  async approveUser(uid: string, role: 'admin' | 'manager' | 'employee'): Promise<ApiResponse<UserType>> {
    if (USE_MOCK_DATA) {
      return mockStore.approveUser(uid, role);
    }
    return firestoreStore.approveUser(uid, role);
  }

  async updateUserProfile(uid: string, data: Partial<Pick<UserType, 'name' | 'email'>>): Promise<ApiResponse<UserType>> {
    if (USE_MOCK_DATA) {
      return mockStore.updateUserProfile(uid, data);
    }
    return firestoreStore.updateUserProfile(uid, data);
  }

  async getBankDetails(userId: string): Promise<ApiResponse<BankDetails | null>> {
    if (USE_MOCK_DATA) {
      return mockStore.getBankDetails(userId);
    }
    return firestoreStore.getBankDetails(userId);
  }

  async saveBankDetails(userId: string, data: BankDetailsFormValues): Promise<ApiResponse<BankDetails>> {
    if (USE_MOCK_DATA) {
      return mockStore.saveBankDetails(userId, data);
    }
    return firestoreStore.saveBankDetails(userId, data);
  }

  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    if (USE_MOCK_DATA) {
      return mockStore.getEmployee(id);
    }
    return firestoreStore.getEmployee(id);
  }

  async createEmployee(data: EmployeeFormValues): Promise<ApiResponse<Employee>> {
    if (USE_MOCK_DATA) {
      return mockStore.createEmployee(data);
    }
    return firestoreStore.createEmployee(data);
  }

  async updateEmployee(id: string, data: Partial<EmployeeFormValues>): Promise<ApiResponse<Employee>> {
    if (USE_MOCK_DATA) {
      return mockStore.updateEmployee(id, data);
    }
    return firestoreStore.updateEmployee(id, data);
  }

  async deleteEmployee(id: string): Promise<ApiResponse<void>> {
    if (USE_MOCK_DATA) {
      return mockStore.deleteEmployee(id);
    }
    return firestoreStore.deleteEmployee(id);
  }

  // Time Records
  async getTimeRecords(employeeId?: string, date?: string): Promise<ApiResponse<TimeRecord[]>> {
    if (USE_MOCK_DATA) {
      return mockStore.getTimeRecords(employeeId, date);
    }
    return firestoreStore.getTimeRecords(employeeId, date);
  }

  async getTimeRecordsByDateRange(startDate: string, endDate: string, employeeId?: string): Promise<ApiResponse<TimeRecord[]>> {
    if (USE_MOCK_DATA) {
      return mockStore.getTimeRecordsByDateRange(startDate, endDate, employeeId);
    }
    return firestoreStore.getTimeRecordsByDateRange(startDate, endDate, employeeId);
  }

  async clockIn(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    if (USE_MOCK_DATA) {
      return mockStore.clockIn(employeeId);
    }
    return firestoreStore.clockIn(employeeId);
  }

  async clockOut(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    if (USE_MOCK_DATA) {
      return mockStore.clockOut(employeeId);
    }
    return firestoreStore.clockOut(employeeId);
  }

  async startMealBreak(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    if (USE_MOCK_DATA) {
      return mockStore.startMealBreak(employeeId);
    }
    return firestoreStore.startMealBreak(employeeId);
  }

  async endMealBreak(employeeId: string): Promise<ApiResponse<TimeRecord>> {
    if (USE_MOCK_DATA) {
      return mockStore.endMealBreak(employeeId);
    }
    return firestoreStore.endMealBreak(employeeId);
  }

  async createTimeApprovalRequest(
    employee: Employee,
    action: TimeApprovalAction,
    reason: string
  ): Promise<ApiResponse<TimeApprovalRequest>> {
    if (USE_MOCK_DATA) {
      return mockStore.createTimeApprovalRequest(employee, action, reason);
    }
    return firestoreStore.createTimeApprovalRequest(employee, action, reason);
  }

  async getTimeApprovalRequests(status?: TimeApprovalRequest['status']): Promise<ApiResponse<TimeApprovalRequest[]>> {
    if (USE_MOCK_DATA) {
      return mockStore.getTimeApprovalRequests(status);
    }
    return firestoreStore.getTimeApprovalRequests(status);
  }

  async approveTimeApprovalRequest(id: string): Promise<ApiResponse<TimeApprovalRequest>> {
    if (USE_MOCK_DATA) {
      return mockStore.approveTimeApprovalRequest(id);
    }
    return firestoreStore.approveTimeApprovalRequest(id);
  }

  async rejectTimeApprovalRequest(id: string, reason: string): Promise<ApiResponse<TimeApprovalRequest>> {
    if (USE_MOCK_DATA) {
      return mockStore.rejectTimeApprovalRequest(id, reason);
    }
    return firestoreStore.rejectTimeApprovalRequest(id, reason);
  }

  // Payroll
  async getPayrollRecords(employeeId?: string): Promise<ApiResponse<PayrollRecord[]>> {
    if (USE_MOCK_DATA) {
      return mockStore.getPayrollRecords(employeeId);
    }
    return firestoreStore.getPayrollRecords(employeeId);
  }

  async getPayrollRecordsByStatus(status: PayrollRecord['status']): Promise<ApiResponse<PayrollRecord[]>> {
    if (USE_MOCK_DATA) {
      return mockStore.getPayrollRecordsByStatus(status);
    }
    return firestoreStore.getPayrollRecordsByStatus(status);
  }

  async savePayrollRecord(record: PayrollRecord): Promise<ApiResponse<PayrollRecord>> {
    if (USE_MOCK_DATA) {
      return mockStore.savePayrollRecord(record);
    }
    return firestoreStore.savePayrollRecord(record);
  }

  async updatePayrollStatus(id: string, status: PayrollRecord['status']): Promise<ApiResponse<PayrollRecord>> {
    if (USE_MOCK_DATA) {
      return mockStore.updatePayrollStatus(id, status);
    }
    return firestoreStore.updatePayrollStatus(id, status);
  }

  async createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<ApiResponse<Notification>> {
    if (USE_MOCK_DATA) {
      return mockStore.createNotification(data);
    }
    return firestoreStore.createNotification(data);
  }

  async getBankApprovalRequests(status?: BankApprovalRequest['status']): Promise<ApiResponse<BankApprovalRequest[]>> {
    if (USE_MOCK_DATA) {
      return mockStore.getBankApprovalRequests(status);
    }
    return firestoreStore.getBankApprovalRequests(status);
  }

  async approveBankDetails(requestId: string): Promise<ApiResponse<BankApprovalRequest>> {
    if (USE_MOCK_DATA) {
      return mockStore.approveBankDetails(requestId);
    }
    return firestoreStore.approveBankDetails(requestId);
  }

  async rejectBankDetails(requestId: string, reason: string): Promise<ApiResponse<BankApprovalRequest>> {
    if (USE_MOCK_DATA) {
      return mockStore.rejectBankDetails(requestId, reason);
    }
    return firestoreStore.rejectBankDetails(requestId, reason);
  }

  async createAuditLog(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<ApiResponse<AuditLog>> {
    if (USE_MOCK_DATA) {
      return mockStore.createAuditLog(data);
    }
    return firestoreStore.createAuditLog(data);
  }

  async getAuditLogs(): Promise<ApiResponse<AuditLog[]>> {
    if (USE_MOCK_DATA) {
      return mockStore.getAuditLogs();
    }
    return firestoreStore.getAuditLogs();
  }

  // Notifications
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    if (USE_MOCK_DATA) {
      return mockStore.getNotifications();
    }
    return firestoreStore.getNotifications();
  }

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    if (USE_MOCK_DATA) {
      return mockStore.markNotificationRead(id);
    }
    return firestoreStore.markNotificationRead(id);
  }

  async getWeeklySchedule(employeeId: string, weekId: string): Promise<ApiResponse<WeeklySchedule>> {
    if (USE_MOCK_DATA) {
      return mockStore.getWeeklySchedule(employeeId, weekId);
    }
    return firestoreStore.getWeeklySchedule(employeeId, weekId);
  }

  async saveWeeklySchedule(schedule: WeeklySchedule): Promise<ApiResponse<WeeklySchedule>> {
    if (USE_MOCK_DATA) {
      return mockStore.saveWeeklySchedule(schedule);
    }
    return firestoreStore.saveWeeklySchedule(schedule);
  }
}

export const firebaseService = new FirebaseService();
