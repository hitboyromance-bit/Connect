import { useEffect, useState } from 'react';
import { ArrowLeft, User, Bell, Lock, Palette, Save, Landmark, ShieldCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { getCurrentUser, getCurrentUserDisplay, setCurrentUser } from '../utils/currentUser';
import { getRoleHomePath } from '../utils/roleNavigation';
import { firebaseService } from '../services/firebase';
import type { BankDetails, BankDetailsFormValues } from '../types';
import './Settings.css';

export function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const user = getCurrentUser();
  const currentUser = getCurrentUserDisplay();
  const [firstName = 'Admin', lastName = 'User'] = currentUser.name.split(' ');

  const [profileData, setProfileData] = useState({
    firstName,
    lastName,
    email: currentUser.email,
    phone: '+1 555-0100',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    scheduleAlerts: true,
    payrollNotifications: true,
    attendanceAlerts: true,
  });
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [bankForm, setBankForm] = useState<BankDetailsFormValues>({
    accountHolder: currentUser.name,
    bankName: '',
    accountType: 'checking' as const,
    routingNumber: '',
    accountNumber: '',
  });
  const [bankMessage, setBankMessage] = useState('');
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    firebaseService.getBankDetails(user.uid).then((result) => {
      if (result.success && result.data) setBankDetails(result.data);
    });
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) return;
    const name = `${profileData.firstName.trim()} ${profileData.lastName.trim()}`.trim();
    const result = await firebaseService.updateUserProfile(user.uid, {
      name,
      email: profileData.email.trim(),
    });
    if (!result.success || !result.data) {
      setProfileMessage(result.error || 'Unable to save profile.');
      return;
    }
    setCurrentUser(result.data);
    setProfileMessage('Profile saved.');
  };

  const saveBankWire = async () => {
    const errors: Record<string, string> = {};
    if (!bankForm.accountHolder.trim()) errors.accountHolder = 'Account holder is required';
    if (!bankForm.bankName.trim()) errors.bankName = 'Bank name is required';
    if (!/^\d{9}$/.test(bankForm.routingNumber)) errors.routingNumber = 'Routing number must be 9 digits';
    if (!/^\d{4,17}$/.test(bankForm.accountNumber)) errors.accountNumber = 'Account number must be 4-17 digits';
    setBankErrors(errors);
    setBankMessage('');

    if (Object.keys(errors).length || !user?.uid) return;

    const result = await firebaseService.saveBankDetails(user.uid, bankForm);
    if (!result.success || !result.data) {
      setBankMessage(result.error || 'Unable to save bank wire details.');
      return;
    }

    setBankDetails(result.data);
    setBankForm({ ...bankForm, routingNumber: '', accountNumber: '' });
    await firebaseService.createNotification({
      userId: 'admin',
      title: 'Bank wire approval needed',
      message: `${currentUser.name} submitted bank wire details for ${result.data.bankName} ending ${result.data.accountLast4}.`,
      type: 'payroll',
    });
    setBankMessage('Bank wire details saved and sent to admin for approval.');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'bank', label: 'Bank Wire', icon: Landmark },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h2>Settings</h2>
          <p className="subtitle">Manage your account preferences</p>
        </div>
        <Button
          variant="secondary"
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate(getRoleHomePath(user))}
        >
          Back to dashboard
        </Button>
      </div>

      <div className="settings-container">
        {/* Sidebar Tabs */}
        <Card className="settings-nav">
          <nav>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Content Area */}
        <div className="settings-content">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader title="Profile Settings" subtitle="Update your personal information" />
              <CardContent>
                <div className="settings-form">
                  <div className="form-row">
                    <Input
                      label="First Name"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    />
                    <Input
                      label="Last Name"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <Input
                      label="Email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                    <Input
                      label="Phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-actions">
                    <Button icon={<Save size={18} />} onClick={handleSave}>
                      Save Changes
                    </Button>
                  </div>
                  {profileMessage && <div className="bank-message">{profileMessage}</div>}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader title="Notification Settings" subtitle="Configure how you receive notifications" />
              <CardContent>
                <div className="settings-form">
                  <div className="toggle-group">
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <span className="toggle-label">Email Notifications</span>
                        <span className="toggle-desc">Receive notifications via email</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailNotifications}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              emailNotifications: e.target.checked,
                            })
                          }
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <span className="toggle-label">Schedule Alerts</span>
                        <span className="toggle-desc">Get notified about schedule changes</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notificationSettings.scheduleAlerts}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              scheduleAlerts: e.target.checked,
                            })
                          }
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <span className="toggle-label">Payroll Notifications</span>
                        <span className="toggle-desc">Receive payroll updates</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notificationSettings.payrollNotifications}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              payrollNotifications: e.target.checked,
                            })
                          }
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <span className="toggle-label">Attendance Alerts</span>
                        <span className="toggle-desc">Get alerts about attendance issues</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notificationSettings.attendanceAlerts}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              attendanceAlerts: e.target.checked,
                            })
                          }
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>
                  <div className="form-actions">
                    <Button icon={<Save size={18} />} onClick={handleSave}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'bank' && (
            <Card>
              <CardHeader title="Bank Wire Setup" subtitle="Add direct deposit details with a secure setup link" />
              <CardContent>
                <div className="secure-bank-panel">
                  <ShieldCheck size={22} />
                  <div>
                    <strong>Secure transaction setup</strong>
                    <span>For safety, Connect stores only masked bank details in Firebase. Use the secure link to verify or update wire information.</span>
                  </div>
                </div>

                {bankDetails && (
                  <div className="bank-summary">
                    <div>
                      <span>Saved bank</span>
                      <strong>{bankDetails.bankName}</strong>
                    </div>
                    <div>
                      <span>Account</span>
                      <strong>{bankDetails.accountType} ending {bankDetails.accountLast4}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{bankDetails.status.replace('-', ' ')}</strong>
                    </div>
                  </div>
                )}

                <div className="settings-form">
                  <div className="form-row">
                    <Input
                      label="Account Holder"
                      value={bankForm.accountHolder}
                      onChange={(event) => setBankForm({ ...bankForm, accountHolder: event.target.value })}
                      error={bankErrors.accountHolder}
                    />
                    <Input
                      label="Bank Name"
                      value={bankForm.bankName}
                      onChange={(event) => setBankForm({ ...bankForm, bankName: event.target.value })}
                      error={bankErrors.bankName}
                    />
                  </div>
                  <div className="form-row">
                    <label className="input-group">
                      <span className="input-label">Account Type</span>
                      <select
                        className="input-field"
                        value={bankForm.accountType}
                        onChange={(event) => setBankForm({ ...bankForm, accountType: event.target.value as 'checking' | 'savings' })}
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </label>
                    <Input
                      label="Routing Number"
                      inputMode="numeric"
                      maxLength={9}
                      value={bankForm.routingNumber}
                      onChange={(event) => setBankForm({ ...bankForm, routingNumber: event.target.value.replace(/\D/g, '') })}
                      error={bankErrors.routingNumber}
                    />
                  </div>
                  <div className="form-row">
                    <Input
                      label="Account Number"
                      inputMode="numeric"
                      maxLength={17}
                      type="password"
                      value={bankForm.accountNumber}
                      onChange={(event) => setBankForm({ ...bankForm, accountNumber: event.target.value.replace(/\D/g, '') })}
                      error={bankErrors.accountNumber}
                    />
                  </div>
                  {bankMessage && <div className="bank-message">{bankMessage}</div>}
                  <div className="form-actions bank-actions">
                    {bankDetails?.secureLink && (
                      <Button
                        variant="secondary"
                        icon={<ExternalLink size={18} />}
                        onClick={() => window.open(bankDetails.secureLink, '_blank', 'noopener,noreferrer')}
                      >
                        Open secure link
                      </Button>
                    )}
                    <Button icon={<Save size={18} />} onClick={saveBankWire}>
                      Save Bank Wire
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader title="Security Settings" subtitle="Manage your account security" />
              <CardContent>
                <div className="settings-form">
                  <div className="form-row">
                    <Input
                      label="Current Password"
                      type="password"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="form-row">
                    <Input
                      label="New Password"
                      type="password"
                      placeholder="Enter new password"
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="form-actions">
                    <Button icon={<Save size={18} />} onClick={handleSave}>
                      Update Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardHeader title="Appearance Settings" subtitle="Customize the look and feel" />
              <CardContent>
                <div className="settings-form">
                  <div className="appearance-option">
                    <label className="input-label">Theme</label>
                    <div className="theme-options">
                      <button className="theme-option active">
                        <div className="theme-preview light" />
                        <span>Light</span>
                      </button>
                      <button className="theme-option">
                        <div className="theme-preview dark" />
                        <span>Dark</span>
                      </button>
                      <button className="theme-option">
                        <div className="theme-preview system" />
                        <span>System</span>
                      </button>
                    </div>
                  </div>
                  <div className="appearance-option">
                    <label className="input-label">Language</label>
                    <select className="input-field">
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  <div className="form-actions">
                    <Button icon={<Save size={18} />} onClick={handleSave}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
