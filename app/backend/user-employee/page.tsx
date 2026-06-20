'use client';

import React, { useState, useEffect } from 'react';
import BackendHeader from '@/components/BackendHeader';
import {
  getEmployeesAction,
  createEmployeeAction,
  toggleEmployeeStatusAction,
  updateEmployeePasswordAction,
} from '@/actions/employee';
import { Plus, KeyRound, Ban, CheckCircle, X, Eye, EyeOff } from 'lucide-react';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'kitchen-staff';
  clerkId: string;
  status: 'active' | 'disabled';
}

export default function UserEmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // New Employee modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState<'cashier' | 'kitchen-staff'>('cashier');
  const [submitting, setSubmitting] = useState(false);

  // Generated Credentials display
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

  // Change Password modal
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdTargetEmployee, setPwdTargetEmployee] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadEmployees = async () => {
    setLoading(true);
    const list = await getEmployeesAction();
    setEmployees(list.map((c: { _id: { toString: () => string } }) => ({
      ...c,
      _id: c._id.toString()
    } as unknown as Employee)));
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim()) return;

    setSubmitting(true);
    setMessage(null);
    setGeneratedCredentials(null);

    const res = await createEmployeeAction({
      name: empName.trim(),
      email: empEmail.trim(),
      role: empRole,
    });

    setSubmitting(false);

    if (res.success && res.email && res.tempPassword) {
      setGeneratedCredentials({
        email: res.email,
        tempPassword: res.tempPassword,
      });
      setEmpName('');
      setEmpEmail('');
      loadEmployees();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to create employee.' });
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    setMessage(null);
    const res = await toggleEmployeeStatusAction(emp._id);
    if (res.success) {
      setMessage({ type: 'success', text: `Status updated for ${emp.name}.` });
      loadEmployees();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update status.' });
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !pwdTargetEmployee) return;

    setPwdSubmitting(true);
    const res = await updateEmployeePasswordAction(pwdTargetEmployee.clerkId, newPassword.trim());
    setPwdSubmitting(false);

    if (res.success) {
      setShowPwdModal(false);
      setNewPassword('');
      setPwdTargetEmployee(null);
      setMessage({ type: 'success', text: 'Employee password updated successfully.' });
    } else {
      alert(res.error || 'Failed to update password.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <BackendHeader title="User & Employee Management" />

      <div className="p-6 flex flex-col gap-6 max-w-5xl w-full mx-auto">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Manage system users and cashiers. Programmatically register profiles with temporary credentials and configure roles.
          </p>

          <button
            onClick={() => {
              setGeneratedCredentials(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-primary/10"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Add User/Employee</span>
          </button>
        </div>

        {/* Messaging banner */}
        {message && (
          <div
            className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-bold hover:scale-105">
              &times;
            </button>
          </div>
        )}

        {/* Employees Table */}
        <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-4 px-6">Staff Member</th>
                <th className="py-4 px-6">Role Scope</th>
                <th className="py-4 px-6">Clerk Profile ID</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="h-4 w-32 bg-muted rounded mb-1" />
                      <div className="h-3 w-40 bg-muted rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-20 bg-muted rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-28 bg-muted rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-6 w-16 bg-muted rounded" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="h-8 w-24 bg-muted rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center text-muted-foreground">
                    No employees registered. Click &quot;Add User/Employee&quot; to register one.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-muted/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-foreground">{emp.name}</span>
                        <span className="text-xs text-muted-foreground">{emp.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="capitalize font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md text-xs">
                        {emp.role === 'admin' ? 'Admin' : 'Cashier/Staff'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground select-all font-mono text-xs">
                      {emp.clerkId}
                    </td>
                    <td className="py-4 px-6">
                      {emp.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive px-2.5 py-1 rounded-full text-xs font-semibold">
                          <Ban className="h-3 w-3" />
                          Banned
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {emp.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => {
                                setPwdTargetEmployee(emp);
                                setShowPwdModal(true);
                              }}
                              className="inline-flex items-center gap-1 text-primary hover:bg-primary/10 rounded-lg p-1.5 transition-colors cursor-pointer text-xs font-semibold"
                            >
                              <KeyRound className="h-4 w-4" />
                              <span>Reset Password</span>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border
                                ${
                                  emp.status === 'active'
                                    ? 'border-destructive/30 hover:bg-destructive/10 text-destructive'
                                    : 'border-green-500/30 hover:bg-green-500/10 text-green-700 dark:text-green-400'
                                }
                              `}
                            >
                              {emp.status === 'active' ? 'Ban Access' : 'Unban Access'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Create Employee Account</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Generated temporary credentials block */}
            {generatedCredentials ? (
              <div className="my-5 p-4 border border-green-500/20 bg-green-500/5 rounded-2xl flex flex-col gap-3">
                <span className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="h-4.5 w-4.5" />
                  Account programmatically registered!
                </span>
                <p className="text-xs text-muted-foreground">
                  Give these credentials to the employee to sign in. The password will not be shown again.
                </p>
                <div className="p-3 bg-background rounded-xl border border-border flex flex-col gap-1.5 font-mono text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold">Email/User ID:</span>
                    <p className="font-semibold select-all">{generatedCredentials.email}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold">Temp Password:</span>
                    <p className="font-semibold text-primary select-all">{generatedCredentials.tempPassword}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="bg-primary text-primary-foreground font-semibold py-2 rounded-xl text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddEmployeeSubmit} className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. cashier@cafe.com"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="px-4 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-muted-foreground">Role Scope</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as 'cashier' | 'kitchen-staff')}
                    className="px-3.5 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="cashier">Cashier (Full POS Terminal checkout access)</option>
                    <option value="kitchen-staff">Kitchen Staff (KDS screen access)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 text-sm pt-4 border-t border-border mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-border hover:bg-muted rounded-xl text-muted-foreground font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-md shadow-primary/10 hover:bg-primary/95 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowPwdModal(false)} />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-2xl">
            <h3 className="text-lg font-bold mb-1 text-foreground">Change Password</h3>
            <span className="text-xs text-muted-foreground">
              Update password for <strong className="text-foreground">{pwdTargetEmployee?.name}</strong>
            </span>

            <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-muted-foreground">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 text-sm pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPwdModal(false);
                    setNewPassword('');
                    setPwdTargetEmployee(null);
                  }}
                  className="px-4 py-2 border border-border hover:bg-muted rounded-xl text-muted-foreground font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdSubmitting}
                  className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-md shadow-primary/10 hover:bg-primary/95 disabled:opacity-50"
                >
                  {pwdSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
