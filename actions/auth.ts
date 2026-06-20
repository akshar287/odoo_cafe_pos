'use server';

import dbConnect from '@/lib/db';
import Employee from '@/models/Employee';
import bcrypt from 'bcryptjs';
import { createSession, clearSession } from '@/lib/auth';

export async function loginAction(formData: FormData) {
  try {
    const type = formData.get('type') as string;
    
    if (type === 'admin') {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      
      // Hardcoded admin
      if (email === 'aksharthakkar774@gmail.com' && password === 'akshar2109') {
        await createSession({
          userId: 'admin',
          role: 'admin',
          username: email,
          name: 'Admin',
        });
        return { success: true, redirect: '/backend' };
      }
      return { success: false, error: 'Invalid admin credentials' };
    } 
    
    if (type === 'staff') {
      const username = formData.get('username') as string;
      const password = formData.get('password') as string;

      await dbConnect();
      const employee = await Employee.findOne({ username });

      if (!employee) {
        return { success: false, error: 'Invalid Employee ID or password' };
      }

      if (employee.status !== 'active') {
        return { success: false, error: 'Account is disabled. Please contact admin.' };
      }

      const isValid = await bcrypt.compare(password, employee.passwordHash);
      if (!isValid) {
        return { success: false, error: 'Invalid Employee ID or password' };
      }

      await createSession({
        userId: employee._id.toString(),
        role: employee.role,
        username: employee.username,
        name: employee.name,
      });

      const redirectUrl = employee.role === 'kitchen-staff' ? '/kds' : '/pos';
      return { success: true, redirect: redirectUrl };
    }

    return { success: false, error: 'Invalid login type' };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, error: 'An error occurred during login' };
  }
}

export async function logoutAction() {
  await clearSession();
  return { success: true };
}
