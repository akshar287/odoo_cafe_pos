import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: Types.ObjectId;
  price: number;
  unitOfMeasure: string;
  tax: number;
  description?: string;
  isVeg: boolean;
  sendToKDS: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0 },
    unitOfMeasure: { type: String, required: true },
    tax: { type: Number, default: 0, min: 0 },
    description: { type: String },
    isVeg: { type: Boolean, default: false },
    sendToKDS: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
