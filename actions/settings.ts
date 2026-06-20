'use server';

import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

// Helper to ensure admin access
async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
}

export async function getSettingsAction() {
  try {
    await dbConnect();
    let settings = await Settings.findOne().lean();
    if (!settings) {
      // Create default settings if none exist
      const newSettings = await Settings.create({});
      settings = newSettings.toObject();
    }
    return JSON.parse(JSON.stringify(settings));
  } catch (err) {
    console.error('getSettingsAction error:', err);
    return null;
  }
}

export interface SaveSettingsInput {
  mobileOrderEnabled: boolean;
  mobileOrderMode: 'online-ordering' | 'qr-menu';
  mobileOrderBackgrounds: string[];
}

export async function saveSettingsAction(input: SaveSettingsInput) {
  try {
    await requireAdmin();
    await dbConnect();

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.mobileOrderEnabled = input.mobileOrderEnabled;
    settings.mobileOrderMode = input.mobileOrderMode;
    settings.mobileOrderBackgrounds = input.mobileOrderBackgrounds;

    await settings.save();
    revalidatePath('/backend/settings/mobile-order');
    return { success: true, settings: JSON.parse(JSON.stringify(settings)) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save settings' };
  }
}
