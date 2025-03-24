"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PermissionController_1 = require("../controllers/PermissionController");
const rbacMiddleware_1 = require("../middleware/rbacMiddleware");
const PermissionCheckController_1 = require("../controllers/PermissionCheckController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const permissionController = new PermissionController_1.PermissionController();
const permissionCheckController = new PermissionCheckController_1.PermissionCheckController();
// Get all permissions
router.get('/', (0, rbacMiddleware_1.requirePermission)('permissions', 'read'), permissionController.getAllPermissions);
// Get a permission by ID
router.get('/:id', (0, rbacMiddleware_1.requirePermission)('permissions', 'read'), permissionController.getPermissionById);
// Create a new permission
router.post('/', (0, rbacMiddleware_1.requirePermission)('permissions', 'create'), permissionController.createPermission);
// Update a permission
router.patch('/:id', (0, rbacMiddleware_1.requirePermission)('permissions', 'update'), permissionController.updatePermission);
// Delete a permission
router.delete('/:id', (0, rbacMiddleware_1.requirePermission)('permissions', 'delete'), permissionController.deletePermission);
// Get permissions by resource
router.get('/resource/:resource', (0, rbacMiddleware_1.requirePermission)('permissions', 'read'), permissionController.getPermissionsByResource);
// Create multiple permissions at once
router.post('/batch', (0, rbacMiddleware_1.requirePermission)('permissions', 'create'), permissionController.createMultiplePermissions);
// Route to check if a user has a specific permission (using @ts-ignore to bypass type check issues)
// @ts-ignore - Express route handler type issues
router.post('/check', auth_1.authenticateJWT, async (req, res, next) => {
    try {
        await permissionCheckController.checkPermission(req, res);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
