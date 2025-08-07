import mongoose, { Schema, Document } from 'mongoose';

// Purchase Order Item interface
export interface IPurchaseOrderItem extends Document {
  id: string;
  purchaseOrderId: mongoose.Schema.Types.ObjectId;
  inventoryItemId: mongoose.Schema.Types.ObjectId;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  quality?: 'excellent' | 'good' | 'acceptable' | 'poor' | 'rejected';
  expiryDate?: Date;
  notes?: string;
}

// Purchase Order interface as specified in PRD
export interface IPurchaseOrder extends Document {
  id: string;
  orderNumber: string;
  supplierId: mongoose.Schema.Types.ObjectId;
  restaurantId: mongoose.Schema.Types.ObjectId;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  status: 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';
  totalAmount: number;
  tax: number;
  shippingCost: number;
  createdBy: mongoose.Schema.Types.ObjectId;
  approvedBy?: mongoose.Schema.Types.ObjectId;
  receivedBy?: mongoose.Schema.Types.ObjectId;
  items: IPurchaseOrderItem[];
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Purchase Order Item schema
const PurchaseOrderItemSchema: Schema = new Schema({
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  orderedQuantity: { type: Number, required: true },
  receivedQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  quality: {
    type: String,
    enum: ['excellent', 'good', 'acceptable', 'poor', 'rejected'],
    default: 'good'
  },
  expiryDate: { type: Date },
  notes: { type: String }
}, { timestamps: true });

const PurchaseOrderSchema: Schema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    orderDate: { type: Date, default: Date.now, index: true },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'],
      default: 'draft',
      index: true
    },
    totalAmount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [PurchaseOrderItemSchema],
    notes: { type: String }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance
PurchaseOrderSchema.index({ restaurantId: 1, orderDate: -1 });
PurchaseOrderSchema.index({ restaurantId: 1, status: 1 });
PurchaseOrderSchema.index({ restaurantId: 1, supplierId: 1 });
PurchaseOrderSchema.index({ orderNumber: 1 });
PurchaseOrderSchema.index({ expectedDeliveryDate: 1 });

// Virtual for completion percentage
PurchaseOrderSchema.virtual('completionPercentage').get(function() {
  if (this.items.length === 0) return 0;
  
  const totalOrdered = this.items.reduce((sum: number, item: any) => sum + item.orderedQuantity, 0);
  const totalReceived = this.items.reduce((sum: number, item: any) => sum + item.receivedQuantity, 0);
  
  return totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
});

// Virtual for grand total (including tax and shipping)
PurchaseOrderSchema.virtual('grandTotal').get(function() {
  return this.totalAmount + this.tax + this.shippingCost;
});

// Method to calculate totals
PurchaseOrderSchema.methods.calculateTotals = function() {
  this.totalAmount = this.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
  return this;
};

// Method to mark as received
PurchaseOrderSchema.methods.markAsReceived = function(receivedBy: mongoose.Schema.Types.ObjectId) {
  this.status = 'received';
  this.receivedBy = receivedBy;
  this.actualDeliveryDate = new Date();
  return this.save();
};

// Method to auto-generate order number
PurchaseOrderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `PO-${dateStr}-${randomNum}`;
  }
  next();
});

// Export the PurchaseOrderItem model separately
export const PurchaseOrderItem = mongoose.model<IPurchaseOrderItem>('PurchaseOrderItem', PurchaseOrderItemSchema);

const PurchaseOrderModel = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);

export default PurchaseOrderModel;
export { PurchaseOrderModel as PurchaseOrder };