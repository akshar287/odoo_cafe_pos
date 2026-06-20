import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  mobileOrderEnabled: boolean;
  mobileOrderMode: 'online-ordering' | 'qr-menu';
  mobileOrderBackgrounds: string[];
}

const SettingsSchema = new Schema<ISettings>(
  {
    mobileOrderEnabled: { type: Boolean, default: false },
    mobileOrderMode: {
      type: String,
      enum: ['online-ordering', 'qr-menu'],
      default: 'online-ordering',
    },
    mobileOrderBackgrounds: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
