import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICoupon extends Document {
  name: string;
  code: string;
  type: 'coupon' | 'automated-product' | 'automated-order';
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minQty: number;
  minOrderAmount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, enum: ['coupon', 'automated-product', 'automated-order'], required: true },
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minQty: { type: Number, default: 1, min: 1 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Coupon: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema);

export default Coupon;
