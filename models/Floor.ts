import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFloor extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const FloorSchema = new Schema<IFloor>(
  {
    name: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);

const Floor: Model<IFloor> =
  mongoose.models.Floor || mongoose.model<IFloor>('Floor', FloorSchema);

export default Floor;
