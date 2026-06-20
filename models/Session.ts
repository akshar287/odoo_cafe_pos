import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISession extends Document {
  openedBy: Types.ObjectId;
  openedAt: Date;
  closedAt?: Date;
  openingAmount: number;
  closingAmount?: number;
  status: 'open' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    openedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    openingAmount: { type: Number, required: true, min: 0 },
    closingAmount: { type: Number },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  {
    timestamps: true,
  }
);

const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;
