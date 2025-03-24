"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const RoleController_1 = require("../controllers/RoleController");
const rbacMiddleware_1 = require("../middleware/rbacMiddleware");
const router = express_1.default.Router();
const roleController = new RoleController_1.RoleController();
// Get all roles
router.get('/', (0, rbacMiddleware_1.requirePermission)('roles', 'read'), roleController.getAllRoles);
// Get a role by ID
router.get('/:id', (0, rbacMiddleware_1.requirePermission)('roles', 'read'), roleController.getRoleById);
// Create a new role
router.post('/', (0, rbacMiddleware_1.requirePermission)('roles', 'create'), roleController.createRole);
// Update a role
router.patch('/:id', (0, rbacMiddleware_1.requirePermission)('roles', 'update'), roleController.updateRole);
// Delete a role
router.delete('/:id', (0, rbacMiddleware_1.requirePermission)('roles', 'delete'), roleController.deleteRole);
// Get permissions for a role
router.get('/:id/permissions', (0, rbacMiddleware_1.requirePermission)('roles', 'read'), roleController.getRolePermissions);
// Add permissions to a role
router.post('/:id/permissions', (0, rbacMiddleware_1.requirePermission)('roles', 'update'), roleController.addPermissionsToRole);
// Remove a permission from a role
router.delete('/:id/permissions/:permissionId', (0, rbacMiddleware_1.requirePermission)('roles', 'update'), roleController.removePermissionFromRole);
exports.default = router;
