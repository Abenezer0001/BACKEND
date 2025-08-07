import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Permission interface for TypeScript type checking
 */
export interface IPermission extends Document {
  name: string;
  description: string;
  resource: string;
  action: string;
}

/**
 * Permission schema definition
 * Exported separately for reuse
 */
const PermissionSchema = new Schema<IPermission>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: false
  },
  resource: {
    type: String,
    required: true
  },
  action: {
    type: String, 
    required: true
  }
}, {
  timestamps: true
});

// Create indexes for efficient searches
if (!mongoose.models.Permission) {
  PermissionSchema.index({ name: 1 }, { unique: true });
  PermissionSchema.index({ resource: 1, action: 1 }, { unique: true });
}

// Singleton instance to avoid duplicate model initialization
let permissionModelInstance: Model<IPermission> | null = null;

/**
 * Get the Permission model instance (singleton)
 * @returns Mongoose model for permissions
 */
export const getPermissionModel = (): Model<IPermission> => {
  try {
    // Initialize model only once (singleton pattern)
    if (!permissionModelInstance) {
      // Check if model already exists to prevent model overwrite errors
      permissionModelInstance = mongoose.models.Permission || 
        mongoose.model<IPermission>('Permission', PermissionSchema);
      
      console.log('Permission model initialized');
    }
    
    return permissionModelInstance;
  } catch (error) {
    console.error('Error initializing Permission model:', error);
    throw new Error(`Permission model initialization failed: ${(error as Error).message}`);
  }
};

/**
 * Find a permission by name
 * @param name Permission name to search for
 * @returns The permission document or null if not found
 */
export const findPermissionByName = async (name: string): Promise<IPermission | null> => {
  const model = getPermissionModel();
  return await model.findOne({ name }).exec();
};

/**
 * Find a permission by resource and action
 * @param resource Resource to search for
 * @param action Action to search for
 * @returns The permission document or null if not found
 */
export const findPermissionByResourceAndAction = async (resource: string, action: string): Promise<IPermission | null> => {
  const model = getPermissionModel();
  return await model.findOne({ resource, action }).exec();
};

/**
 * Find a permission by ID
 * @param id Permission ID to search for
 * @returns The permission document or null if not found
 */
export const findPermissionById = async (id: string): Promise<IPermission | null> => {
  const model = getPermissionModel();
  return await model.findById(id).exec();
};

/**
 * Create a new permission
 * @param permissionData Permission data to create
 * @returns The created permission document
 */
export const createPermission = async (permissionData: Partial<IPermission>): Promise<IPermission> => {
  const model = getPermissionModel();
  const permission = new model(permissionData);
  return await permission.save();
};

/**
 * Get all permissions
 * @returns Array of permission documents
 */
export const getAllPermissions = async (): Promise<IPermission[]> => {
  const model = getPermissionModel();
  return await model.find().exec();
};

export default getPermissionModel();
