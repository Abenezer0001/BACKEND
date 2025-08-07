import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPermission extends Document {
  resource: string;
  action: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// Export the schema separately for flexibility
export const PermissionSchema = new Schema<IPermission>(
  {
    resource: {
      type: String,
      required: true,
      trim: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Create a compound index for efficient querying and to ensure uniqueness
PermissionSchema.index({ resource: 1, action: 1 }, { unique: true });

// Create and export the model
export const Permission = mongoose.model<IPermission>('Permission', PermissionSchema);

// Export default for backward compatibility
export default Permission;
