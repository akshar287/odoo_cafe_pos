import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScheduledTask extends Document {
  name: string;
  prompt: string;
  taskType: 'create-coupon' | 'create-product' | 'create-category' | 'db-action';
  payload: any;
  executeAt: Date;
  intervalDays?: number;
  endAt?: Date;
  status: 'pending' | 'completed' | 'failed';
  logs?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledTaskSchema = new Schema<IScheduledTask>(
  {
    name: { type: String, required: true },
    prompt: { type: String, required: true },
    taskType: { type: String, enum: ['create-coupon', 'create-product', 'create-category', 'db-action'], required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    executeAt: { type: Date, required: true },
    intervalDays: { type: Number },
    endAt: { type: Date },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    logs: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

const ScheduledTask: Model<IScheduledTask> =
  mongoose.models.ScheduledTask || mongoose.model<IScheduledTask>('ScheduledTask', ScheduledTaskSchema);

export default ScheduledTask;
