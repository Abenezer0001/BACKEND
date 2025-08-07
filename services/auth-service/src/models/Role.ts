// Re-export the Role model from role.model.ts to avoid duplicate model definitions
import { Role as RoleModel, IRole, RoleSchema } from './role.model';

// Re-export all the utility functions from role.model.ts
export {
  findRoleByName,
  findRoleById,
  createRole,
  getAllRoles,
  addPermissionsToRole,
  removePermissionsFromRole
} from './role.model';

// Re-export the model as both default and named export
export { RoleModel as Role };
export default RoleModel;

// Re-export the interface
export { IRole };
