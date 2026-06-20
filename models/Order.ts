import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IOrderItem {
  product: Types.ObjectId;
  qty: number;
  price: number;
  discount: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  table?: Types.ObjectId;
  customer?: Types.ObjectId;
  employee?: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'paid' | 'cancelled';
  paymentMethod?: Types.ObjectId;
  source: 'pos' | 'self-order';
  kdsStatus: 'none' | 'to-cook' | 'preparing' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    table: { type: Schema.Types.ObjectId, ref: 'Table' },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', sparse: true },
    employee: { type: Schema.Types.ObjectId, ref: 'Employee' },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['draft', 'paid', 'cancelled'], default: 'draft' },
    paymentMethod: { type: Schema.Types.ObjectId, ref: 'PaymentMethod', sparse: true },
    source: { type: String, enum: ['pos', 'self-order'], default: 'pos' },
    kdsStatus: { type: String, enum: ['none', 'to-cook', 'preparing', 'completed'], default: 'none' },
  },
  {
    timestamps: true,
  }
);

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
