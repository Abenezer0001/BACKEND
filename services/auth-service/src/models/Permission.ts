import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission extends Document {
  resource: string;
  action: string;
  description: string;
}

const PermissionSchema = new Schema<IPermission>({
  resource: { type: String, required: true },
  action: { type: String, required: true },
  description: { type: String, required: true }
});

// Compound index to ensure unique resource-action pairs
PermissionSchema.index({ resource: 1, action: 1 }, { unique: true });

export const Permission = mongoose.model<IPermission>('Permission', PermissionSchema);
