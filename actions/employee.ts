'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Employee from '@/models/Employee';
import type { UserRole } from '@/types/clerk';

/** Generate a secure random temporary password */
function generateTempPassword(length = 12): string {
  const charset =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  role: 'cashier' | 'kitchen-staff';
}

export interface CreateEmployeeResult {
  success: boolean;
  employeeId?: string;
  email?: string;
  tempPassword?: string;
  error?: string;
}

/**
 * Server Action: Create a new employee account (admin only).
 * 1. Verifies caller is an admin.
 * 2. Creates Clerk user with generated credentials.
 * 3. Sets role in publicMetadata.
 * 4. Syncs record into MongoDB Employee collection.
 * Returns credentials to display once to the admin.
 */
export async function createEmployeeAction(
  input: CreateEmployeeInput
): Promise<CreateEmployeeResult> {
  try {
    // 1. Verify caller is authenticated and is an admin
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: You must be signed in.' };
    }

    const callerRole = (sessionClaims?.metadata as { role?: UserRole })?.role;
    if (callerRole !== 'admin') {
      return {
        success: false,
        error: 'Forbidden: Only admins can create employee accounts.',
      };
    }

    // 2. Generate temporary password
    const tempPassword = generateTempPassword();

    // 3. Create Clerk user
    const client = await clerkClient();
    const clerkUser = await client.users.createUser({
      emailAddress: [input.email],
      password: tempPassword,
      firstName: input.name.split(' ')[0],
      lastName: input.name.split(' ').slice(1).join(' ') || undefined,
      publicMetadata: {
        role: input.role,
      } satisfies { role: UserRole },
    });

    // 4. Sync to MongoDB
    await dbConnect();
    const employee = await Employee.create({
      name: input.name,
      email: input.email,
      role: 'employee',
      clerkId: clerkUser.id,
      status: 'active',
    });

    return {
      success: true,
      employeeId: (employee._id as unknown as string).toString(),
      email: input.email,
      tempPassword,
    };
  } catch (err: unknown) {
    console.error('[createEmployeeAction] Error:', err);
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

/**
 * Server Action: Toggle employee active/disabled status (admin only).
 */
export async function toggleEmployeeStatusAction(
  employeeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const callerRole = (sessionClaims?.metadata as { role?: UserRole })?.role;
    if (callerRole !== 'admin') return { success: false, error: 'Forbidden' };

    await dbConnect();
    const employee = await Employee.findById(employeeId);
    if (!employee) return { success: false, error: 'Employee not found' };

    const newStatus = employee.status === 'active' ? 'disabled' : 'active';
    employee.status = newStatus;
    await employee.save();

    // Also ban/unban in Clerk
    const client = await clerkClient();
    if (newStatus === 'disabled') {
      await client.users.banUser(employee.clerkId);
    } else {
      await client.users.unbanUser(employee.clerkId);
    }

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

/**
 * Server Action: Get all employees (admin only).
 */
export async function getEmployeesAction() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const callerRole = (sessionClaims?.metadata as { role?: UserRole })?.role;
    if (callerRole !== 'admin') throw new Error('Forbidden');

    await dbConnect();
    const list = await Employee.find({}).sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(list));
  } catch (err) {
    console.error('getEmployeesAction error:', err);
    return [];
  }
}

/**
 * Server Action: Change password of employee in Clerk programmatically (admin only).
 */
export async function updateEmployeePasswordAction(
  employeeClerkId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const callerRole = (sessionClaims?.metadata as { role?: UserRole })?.role;
    if (callerRole !== 'admin') return { success: false, error: 'Forbidden' };

    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const client = await clerkClient();
    await client.users.updateUser(employeeClerkId, {
      password: newPassword,
    });

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
