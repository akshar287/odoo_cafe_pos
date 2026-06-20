import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentMethod extends Document {
  name: string;
  type: 'cash' | 'card' | 'upi';
  upiId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['cash', 'card', 'upi'], required: true },
    upiId: {
      type: String,
      required: function (this: IPaymentMethod) {
        return this.type === 'upi';
      },
    },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const PaymentMethod: Model<IPaymentMethod> =
  mongoose.models.PaymentMethod || mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);

export default PaymentMethod;
