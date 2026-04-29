// User Types
export interface User {
  uid: string;
  email: string;
  name?: string;
  role: 'admin' | 'manager' | 'employee' | 'pending' | 'removed' | 'approved';
  createdAt: Date;
}

export interface BankDetails {
  userId: string;
  accountHolder: string;
  bankName: string;
  accountType: 'checking' | 'savings';
  routingLast4: string;
  accountLast4: string;
  secureLink: string;
  status: 'not-started' | 'pending-verification' | 'verified';
  updatedAt: Date;
}

export interface BankApprovalRequest {
  id: string;
  userId: string;
  accountHolder: string;
  bankName: string;
  accountType: 'checking' | 'savings';
  accountLast4: string;
  routingLast4: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: Date;
  reviewedAt?: Date | null;
}

export interface BankDetailsFormValues {
  accountHolder: string;
  bankName: string;
  accountType: 'checking' | 'savings';
  routingNumber: string;
  accountNumber: string;
}

// Employee Types
export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  workSchedule: WorkSchedule;
  hourlyRate: number;
  startDate: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkSchedule {
  day: string;
  startTime: string;
  endTime: string;
  breakDuration: number; // in minutes
}

export interface EmployeeSchedule {
  [day: string]: WorkSchedule;
}

// Time Clock Types
export interface TimeRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakStart?: string | null;
  breakTime: number; // in minutes
  breakSeconds?: number;
  totalSeconds?: number;
  totalHours: number;
  status: 'clocked-in' | 'clocked-out' | 'on-break';
  createdAt: Date;
}

// Payroll Types
export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  periodStart?: string;
  periodEnd?: string;
  payDate?: string;
  totalSeconds?: number;
  breakSeconds?: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimeRate: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: 'pending' | 'processed' | 'paid';
  createdAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'schedule' | 'attendance' | 'payroll' | 'system';
  read: boolean;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  createdAt: Date;
}

// Form Types
export interface SignupFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface EmployeeFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hourlyRate: number;
  startDate: string;
  status: 'active' | 'inactive';
  workSchedule: WorkSchedule;
}

// Dashboard Stats
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  clockedInToday: number;
  totalHoursToday: number;
  pendingPayroll: number;
  unreadNotifications: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Presenter Types
export interface AuthPresenter {
  validateSignupForm(values: SignupFormValues): ValidationResult;
  validateLoginForm(values: LoginFormValues): ValidationResult;
  presentSignupError(message: string): void;
  presentSignupSuccess(message: string): void;
  presentLoginError(message: string): void;
  presentLoginSuccess(message: string): void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Loading State
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface WeeklySchedule {
  employeeId: string;
  weekId: string;
  hours: number[];
  shifts?: DailySchedule[];
}

export interface DailySchedule {
  startTime: string;
  endTime: string;
}

export type TimeApprovalAction = 'clock-in' | 'clock-out';

export interface TimeApprovalRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  action: TimeApprovalAction;
  requestedTime: string;
  requestedDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  rejectionReason?: string;
  createdAt: Date;
  reviewedAt?: Date | null;
}
