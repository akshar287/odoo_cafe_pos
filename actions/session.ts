'use server';

import dbConnect from '@/lib/db';
import Session from '@/models/Session';
import Employee from '@/models/Employee';
import Order from '@/models/Order';
import PaymentMethod from '@/models/PaymentMethod';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/types/clerk';

// Helper to get or sync the current logged in employee
export async function getOrCreateCurrentEmployee() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();
  let employee = await Employee.findOne({ clerkId: userId });

  if (!employee) {
    // If not in DB, sync from Clerk details
    const role = (sessionClaims?.metadata as { role?: UserRole })?.role || 'employee';
    const email = (sessionClaims?.email as string) || `user-${userId}@example.com`;
    const name = (sessionClaims?.name as string) || 'Admin User';

    employee = await Employee.create({
      name,
      email,
      role: role === 'admin' ? 'admin' : 'employee',
      clerkId: userId,
      status: 'active',
    });
  }

  return employee;
}

export async function getCurrentSession() {
  try {
    await dbConnect();
    const employee = await getOrCreateCurrentEmployee();
    
    // Find open session
    const session = await Session.findOne({ status: 'open' })
      .populate('openedBy')
      .lean();
    
    return JSON.parse(JSON.stringify(session));
  } catch (err) {
    console.error('getCurrentSession error:', err);
    return null;
  }
}

export async function openSessionAction(openingAmount: number) {
  try {
    await dbConnect();
    const employee = await getOrCreateCurrentEmployee();

    // Check if there is already an open session
    const existing = await Session.findOne({ status: 'open' });
    if (existing) {
      return { success: false, error: 'A session is already open' };
    }

    const session = await Session.create({
      openedBy: employee._id,
      openingAmount,
      status: 'open',
      openedAt: new Date(),
    });

    revalidatePath('/pos');
    return { success: true, session: JSON.parse(JSON.stringify(session)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to open session' };
  }
}

export async function closeSessionAction(sessionId: string, closingAmount: number) {
  try {
    await dbConnect();

    const session = await Session.findById(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    if (session.status === 'closed') return { success: false, error: 'Session is already closed' };

    session.closingAmount = closingAmount;
    session.closedAt = new Date();
    session.status = 'closed';
    await session.save();

    revalidatePath('/pos');
    return { success: true, session: JSON.parse(JSON.stringify(session)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to close session' };
  }
}

export async function getSessionCloseSummary(sessionId: string) {
  try {
    await dbConnect();

    const session = await Session.findById(sessionId).populate('openedBy').lean();
    if (!session) throw new Error('Session not found');

    // Aggregate orders placed during this session
    // Since we filter by active session, let's find paid orders created after session.openedAt and before closedAt (or now if not closed)
    const orderQuery: any = {
      status: 'paid',
      createdAt: { $gte: session.openedAt },
    };
    if (session.closedAt) {
      orderQuery.createdAt.$lte = session.closedAt;
    }

    const orders = await Order.find(orderQuery).populate('paymentMethod').lean();

    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);

    // Group sales by payment method type
    const breakdown: Record<string, number> = {
      cash: 0,
      card: 0,
      upi: 0,
    };

    orders.forEach((order) => {
      const pm = order.paymentMethod as any;
      if (pm && pm.type) {
        breakdown[pm.type] = (breakdown[pm.type] || 0) + order.total;
      } else {
        // Fallback to cash if payment method metadata is missing
        breakdown['cash'] = (breakdown['cash'] || 0) + order.total;
      }
    });

    return {
      success: true,
      openedBy: (session.openedBy as any)?.name || 'Unknown',
      openedAt: session.openedAt,
      closedAt: session.closedAt || null,
      openingAmount: session.openingAmount,
      closingAmount: session.closingAmount || null,
      totalSales,
      breakdown,
      orderCount: orders.length,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate session summary' };
  }
}

export async function getLastSessionStats() {
  try {
    await dbConnect();
    const lastSession = await Session.findOne({ status: 'closed' })
      .sort({ closedAt: -1 })
      .lean();

    if (!lastSession) {
      return {
        lastClosedAt: null,
        lastSellAmount: 0,
      };
    }

    // Find all paid orders in that last session
    const nextSession = await Session.findOne({
      status: 'closed',
      closedAt: { $gt: lastSession.closedAt },
    }).sort({ closedAt: 1 });

    const orderQuery: any = {
      status: 'paid',
      createdAt: { $gte: lastSession.openedAt, $lte: lastSession.closedAt },
    };

    const orders = await Order.find(orderQuery).lean();
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);

    return {
      lastClosedAt: lastSession.closedAt,
      lastSellAmount: totalSales,
    };
  } catch (err) {
    console.error('getLastSessionStats error:', err);
    return {
      lastClosedAt: null,
      lastSellAmount: 0,
    };
  }
}
