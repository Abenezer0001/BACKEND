import mongoose, { Document, Schema, Model } from 'mongoose';
import { IPermission } from './permission.model';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: IPermission[] | string[];
  // NEW: Business-level fields
  businessId?: mongoose.Types.ObjectId; // null for system-wide roles, specific businessId for business-scoped roles
  isSystemRole: boolean; // true for roles created by system (Super Admin), false for business-created roles
  scope: 'system' | 'business'; // Explicit scope field
  createdAt: Date;
  updatedAt: Date;
}

// Export the schema separately for flexibility
export const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: false
    },
    permissions: [{
      type: Schema.Types.ObjectId,
      ref: 'Permission'
    }],
    // NEW: Business-level fields
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true
    },
    isSystemRole: {
      type: Boolean,
      default: false
    },
    scope: {
      type: String,
      enum: ['system', 'business'],
      default: 'business',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Create indexes only once when the model is first defined
if (!mongoose.models.Role) {
  // Business-scoped unique constraint: role names must be unique within a business
  // For system roles (businessId: null), global uniqueness
  RoleSchema.index({ businessId: 1, name: 1 }, { 
    unique: true,
    partialFilterExpression: { businessId: { $ne: null } }
  });
  
  // System roles unique index
  RoleSchema.index({ name: 1 }, { 
    unique: true,
    partialFilterExpression: { businessId: null }
  });
  
  // Additional performance indexes
  RoleSchema.index({ scope: 1, isSystemRole: 1 });
  RoleSchema.index({ businessId: 1 });
}

// Use the shared mongoose connection
// Check if model already exists to prevent model overwrite errors
const RoleModel: Model<IRole> = mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);

// Export both the model and schema for flexibility
export { RoleModel as Role };
export default RoleModel;

/**
 * Find a role by name
 * @param name Role name to search for
 * @returns The role document or null if not found
 */
export const findRoleByName = async (name: string): Promise<IRole | null> => {
  return await RoleModel.findOne({ name }).populate('permissions').exec();
};

/**
 * Find a role by ID
 * @param id Role ID to search for
 * @returns The role document or null if not found
 */
export const findRoleById = async (id: string): Promise<IRole | null> => {
  return await RoleModel.findById(id).populate('permissions').exec();
};

/**
 * Create a new role
 * @param roleData Role data to create
 * @returns The created role document
 */
export const createRole = async (roleData: Partial<IRole>): Promise<IRole> => {
  const role = new RoleModel(roleData);
  return await role.save();
};

/**
 * Get all roles
 * @returns Array of role documents
 */
export const getAllRoles = async (): Promise<IRole[]> => {
  return await RoleModel.find().populate('permissions').exec();
};

/**
 * Get roles by business ID (includes system roles)
 * @param businessId Business ID to filter by
 * @returns Array of role documents
 */
export const getRolesByBusinessId = async (businessId: string): Promise<IRole[]> => {
  return await RoleModel.find({
    $or: [
      { businessId: businessId },
      { scope: 'system' }
    ]
  }).populate('permissions').exec();
};

/**
 * Get system roles only
 * @returns Array of system role documents
 */
export const getSystemRoles = async (): Promise<IRole[]> => {
  return await RoleModel.find({ scope: 'system', isSystemRole: true }).populate('permissions').exec();
};

/**
 * Add permissions to a role
 * @param roleId Role ID to update
 * @param permissionIds Array of permission IDs to add
 * @returns The updated role document
 */
export const addPermissionsToRole = async (roleId: string, permissionIds: string[]): Promise<IRole | null> => {
  return await RoleModel.findByIdAndUpdate(
    roleId,
    { $addToSet: { permissions: { $each: permissionIds } } },
    { new: true }
  ).populate('permissions').exec();
};

/**
 * Remove permissions from a role
 * @param roleId Role ID to update
 * @param permissionIds Array of permission IDs to remove
 * @returns The updated role document
 */
export const removePermissionsFromRole = async (roleId: string, permissionIds: string[]): Promise<IRole | null> => {
  return await RoleModel.findByIdAndUpdate(
    roleId,
    { $pull: { permissions: { $in: permissionIds } } },
    { new: true }
  ).populate('permissions').exec();
};
