import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
  name: string;
  username: string; // Used as the login ID (Employee ID)
  passwordHash: string; // Store bcrypt hashed password
  role: 'admin' | 'cashier' | 'kitchen-staff';
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'cashier', 'kitchen-staff'], required: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  {
    timestamps: true,
  }
);

const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
