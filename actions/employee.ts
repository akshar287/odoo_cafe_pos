'use server';

import dbConnect from '@/lib/db';
import Employee from '@/models/Employee';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

// Middleware / auth helper for these actions
async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
}

export async function getEmployeesAction() {
  try {
    await requireAdmin();
    await dbConnect();
    const employees = await Employee.find({}).sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(employees));
  } catch (err) {
    console.error('getEmployeesAction error:', err);
    return [];
  }
}

export interface CreateEmployeeInput {
  name: string;
  role: 'cashier' | 'kitchen-staff';
  username: string; // The Employee ID
  password?: string; // Explicit password provided by admin
}

export async function createEmployeeAction(input: CreateEmployeeInput) {
  try {
    await requireAdmin();
    await dbConnect();

    // Check if user exists in DB
    const existing = await Employee.findOne({ username: input.username });
    if (existing) {
      return { success: false, error: 'Employee ID (username) already exists' };
    }

    // Use provided password or generate one if not provided (fallback)
    const finalPassword = input.password && input.password.trim() !== '' 
      ? input.password 
      : Math.random().toString(36).slice(-6);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(finalPassword, salt);

    // Save in our DB
    const emp = new Employee({
      name: input.name,
      username: input.username,
      passwordHash: passwordHash,
      role: input.role,
      status: 'active',
    });
    await emp.save();

    revalidatePath('/backend/user-employee');
    return { success: true, tempPassword: finalPassword, username: input.username };
  } catch (err: any) {
    console.error('Create employee error:', err);
    return { success: false, error: err.message || 'Failed to create employee' };
  }
}

export async function toggleEmployeeStatusAction(employeeId: string, currentStatus: string) {
  try {
    await requireAdmin();
    await dbConnect();
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    await Employee.findByIdAndUpdate(employeeId, { status: newStatus });
    revalidatePath('/backend/user-employee');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Reset employee password to a new custom one
export async function updateEmployeePasswordAction(employeeId: string, newPassword: string) {
  try {
    await requireAdmin();
    await dbConnect();
    
    const emp = await Employee.findById(employeeId);
    if (!emp) return { success: false, error: 'Employee not found' };

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    emp.passwordHash = passwordHash;
    await emp.save();

    revalidatePath('/backend/user-employee');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
