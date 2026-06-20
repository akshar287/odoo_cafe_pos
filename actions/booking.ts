'use server';

import dbConnect from '@/lib/db';
import Floor from '@/models/Floor';
import Table from '@/models/Table';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/types/clerk';
import { getSession } from '@/lib/auth';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') throw new Error('Forbidden: Admin access required');
}

export async function getFloorsAndTables() {
  try {
    await dbConnect();
    const floors = await Floor.find({}).sort({ createdAt: 1 }).lean();
    const tables = await Table.find({}).populate('floor').sort({ number: 1 }).lean();

    return {
      floors: JSON.parse(JSON.stringify(floors)),
      tables: JSON.parse(JSON.stringify(tables)),
    };
  } catch (err) {
    console.error('getFloorsAndTables error:', err);
    return { floors: [], tables: [] };
  }
}

export async function createFloorAction(name: string) {
  try {
    await requireAdmin();
    await dbConnect();

    if (!name.trim()) return { success: false, error: 'Floor name cannot be empty' };

    const newFloor = await Floor.create({ name: name.trim() });

    revalidatePath('/backend/booking');
    revalidatePath('/pos');
    return { success: true, floor: JSON.parse(JSON.stringify(newFloor)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create floor' };
  }
}

export async function deleteFloorAction(floorId: string) {
  try {
    await requireAdmin();
    await dbConnect();

    // Check if there are tables under this floor
    const tableCount = await Table.countDocuments({ floor: floorId });
    if (tableCount > 0) {
      return {
        success: false,
        error: `Cannot delete floor: ${tableCount} table(s) are currently configured on it.`,
      };
    }

    await Floor.findByIdAndDelete(floorId);

    revalidatePath('/backend/booking');
    revalidatePath('/pos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete floor' };
  }
}

export interface SaveTableInput {
  id?: string;
  number: string | number;
  seats: number;
  floorId: string;
  active: boolean;
  status?: 'available' | 'occupied';
}

export async function saveTableAction(input: SaveTableInput) {
  try {
    await requireAdmin();
    await dbConnect();

    const data: any = {
      number: input.number,
      seats: input.seats,
      floor: input.floorId,
      active: input.active,
    };

    if (input.status) {
      data.status = input.status;
    }

    let saved;
    if (input.id) {
      saved = await Table.findByIdAndUpdate(input.id, data, { new: true });
    } else {
      saved = await Table.create(data);
    }

    revalidatePath('/backend/booking');
    revalidatePath('/pos');
    return { success: true, table: JSON.parse(JSON.stringify(saved)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save table' };
  }
}

export async function deleteTableAction(id: string) {
  try {
    await requireAdmin();
    await dbConnect();

    await Table.findByIdAndDelete(id);

    revalidatePath('/backend/booking');
    revalidatePath('/pos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete table' };
  }
}

export async function updateTableStatusAction(id: string, status: 'available' | 'occupied') {
  try {
    await dbConnect();
    const table = await Table.findByIdAndUpdate(id, { status }, { new: true });
    revalidatePath('/pos');
    return { success: true, table: JSON.parse(JSON.stringify(table)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update table status' };
  }
}
