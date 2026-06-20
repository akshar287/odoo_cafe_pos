import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITable extends Document {
  number: number | string;
  seats: number;
  floor: Types.ObjectId;
  active: boolean;
  status: 'available' | 'occupied';
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    number: { type: Schema.Types.Mixed, required: true },
    seats: { type: Number, required: true, min: 1 },
    floor: { type: Schema.Types.ObjectId, ref: 'Floor', required: true },
    active: { type: Boolean, default: true },
    status: { type: String, enum: ['available', 'occupied'], default: 'available' },
  },
  {
    timestamps: true,
  }
);

const Table: Model<ITable> =
  mongoose.models.Table || mongoose.model<ITable>('Table', TableSchema);

export default Table;
