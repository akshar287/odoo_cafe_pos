import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
  name: string;
  email: string;
  role: 'admin' | 'employee';
  clerkId: string;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    clerkId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  {
    timestamps: true,
  }
);

const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
