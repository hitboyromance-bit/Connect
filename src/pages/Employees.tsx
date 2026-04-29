import { useState, useEffect } from 'react';
import { Download, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { firebaseService } from '../services/firebase';
import { downloadCsv } from '../utils/csv';
import type { Employee, EmployeeFormValues } from '../types';
import './Employees.css';

const initialFormValues: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  position: '',
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

const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Support'];
const positions = ['Manager', 'Senior', 'Junior', 'Intern', 'Lead', 'Associate', 'Director'];

export function Employees() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formValues, setFormValues] = useState<EmployeeFormValues>(initialFormValues);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('search', value);
    } else {
      nextParams.delete('search');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const loadEmployees = async () => {
    const result = await firebaseService.getEmployees();
    if (result.success && result.data) {
      setEmployees(result.data);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;

    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const pagedEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);

  const exportEmployees = () => {
    downloadCsv('employees.csv', filteredEmployees.map(employee => ({
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      hourlyRate: employee.hourlyRate,
      status: employee.status,
      startDate: employee.startDate,
    })));
  };

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormValues({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
        position: employee.position,
        hourlyRate: employee.hourlyRate,
        startDate: employee.startDate,
        status: employee.status,
        workSchedule: employee.workSchedule,
      });
    } else {
      setEditingEmployee(null);
      setFormValues(initialFormValues);
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormValues(initialFormValues);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formValues.firstName.trim()) errors.firstName = 'First name is required';
    if (!formValues.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formValues.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formValues.department) errors.department = 'Department is required';
    if (!formValues.position) errors.position = 'Position is required';
    if (formValues.hourlyRate <= 0) errors.hourlyRate = 'Hourly rate must be positive';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingEmployee) {
        await firebaseService.updateEmployee(editingEmployee.id, formValues);
      } else {
        await firebaseService.createEmployee(formValues);
      }
      await loadEmployees();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      await firebaseService.deleteEmployee(id);
      await loadEmployees();
    }
  };

  const handleInputChange = (field: keyof EmployeeFormValues, value: string | number) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="employees-page">
      <div className="employees-header">
        <div className="header-left">
          <h2>Employee Management</h2>
          <p className="subtitle">Manage your team members</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" icon={<Download size={18} />} onClick={exportEmployees}>
            Export
          </Button>
          <Button icon={<Plus size={18} />} onClick={() => handleOpenModal()}>
            Add Employee
          </Button>
        </div>
      </div>

      <Card className="employees-card">
        <div className="filters">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Active
            </button>
            <button
              className={`filter-btn ${filterStatus === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilterStatus('inactive')}
            >
              Inactive
            </button>
          </div>
        </div>

        <div className="employees-table">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Position</th>
                <th>Schedule</th>
                <th>Hourly Rate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar">
                        {employee.firstName[0]}
                        {employee.lastName[0]}
                      </div>
                      <div className="employee-details">
                        <span className="name">
                          {employee.firstName} {employee.lastName}
                        </span>
                        <span className="email">{employee.email}</span>
                        <span className="emp-number">{employee.employeeNumber}</span>
                      </div>
                    </div>
                  </td>
                  <td>{employee.department}</td>
                  <td>{employee.position}</td>
                  <td>
                    <div className="schedule-cell">
                      <span>{employee.workSchedule.startTime} - {employee.workSchedule.endTime}</span>
                    </div>
                  </td>
                  <td>${employee.hourlyRate}/hr</td>
                  <td>
                    <span className={`status-badge status-${employee.status}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn edit"
                        onClick={() => handleOpenModal(employee)}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(employee.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No employees match "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span className="showing-text">
            Showing {pagedEmployees.length} of {filteredEmployees.length} employees
          </span>
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
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="employee-form">
          <div className="form-row">
            <Input
              label="First Name"
              value={formValues.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              error={formErrors.firstName}
              placeholder="Enter first name"
            />
            <Input
              label="Last Name"
              value={formValues.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              error={formErrors.lastName}
              placeholder="Enter last name"
            />
          </div>

          <div className="form-row">
            <Input
              label="Email"
              type="email"
              value={formValues.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={formErrors.email}
              placeholder="Enter email address"
            />
            <Input
              label="Phone"
              type="tel"
              value={formValues.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Department</label>
              <select
                className="input-field"
                value={formValues.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {formErrors.department && (
                <span className="input-error">{formErrors.department}</span>
              )}
            </div>
            <div className="input-group">
              <label className="input-label">Position</label>
              <select
                className="input-field"
                value={formValues.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
              >
                <option value="">Select position</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
              {formErrors.position && (
                <span className="input-error">{formErrors.position}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <Input
              label="Hourly Rate ($)"
              type="number"
              value={formValues.hourlyRate}
              onChange={(e) => handleInputChange('hourlyRate', parseFloat(e.target.value))}
              error={formErrors.hourlyRate}
              min={0}
              step={0.01}
            />
            <Input
              label="Start Date"
              type="date"
              value={formValues.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Status</label>
              <select
                className="input-field"
                value={formValues.status}
                onChange={(e) =>
                  handleInputChange('status', e.target.value as 'active' | 'inactive')
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingEmployee ? 'Update Employee' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
