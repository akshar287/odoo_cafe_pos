import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const getPusherServer = () => {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
    console.warn('Pusher environment variables are not set. Realtime features will not work.');
    return null;
  }

  return new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true,
  });
};

// Client-side Pusher instance
export const getPusherClient = () => {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  
  if (!key || !cluster) {
    console.warn('Pusher client environment variables are not set.');
    return null;
  }

  return new PusherClient(key, {
    cluster: cluster,
  });
};

// Event Publishing Helpers
export const publishKdsUpdate = async (event: string, data: unknown) => {
  const pusher = getPusherServer();
  if (!pusher) return;
  try {
    await pusher.trigger('kds-channel', event, data);
  } catch (error) {
    console.error('Failed to publish KDS update:', error);
  }
};

export const publishTableUpdate = async (tableToken: string, event: string, data: unknown) => {
  const pusher = getPusherServer();
  if (!pusher) return;
  try {
    await pusher.trigger(`table-${tableToken}`, event, data);
  } catch (error) {
    console.error('Failed to publish Table update:', error);
  }
};
