"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AuthController_1 = __importDefault(require("../controllers/AuthController"));
const rbacMiddleware_1 = require("../middleware/rbacMiddleware");
const RbacService_1 = require("../services/RbacService");
const router = express_1.default.Router();
const rbacService = new RbacService_1.RbacService();
// Authentication routes
router.post('/register', async (req, res) => {
    await AuthController_1.default.register(req, res);
});
router.post('/login', async (req, res) => {
    await AuthController_1.default.login(req, res);
});
router.post('/refresh-token', async (req, res) => {
    await AuthController_1.default.refreshToken(req, res);
});
router.post('/logout', async (req, res) => {
    await AuthController_1.default.logout(req, res);
});
// User-Role management routes
router.get('/users/:id/roles', (0, rbacMiddleware_1.requirePermission)('users', 'read'), async (req, res) => {
    try {
        const user = await AuthController_1.default.getUserById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Populate roles
        await user.populate('roles');
        res.status(200).json(user.roles);
    }
    catch (error) {
        console.error('Error fetching user roles:', error);
        res.status(500).json({ message: 'Error fetching user roles' });
    }
});
router.post('/users/:id/roles', (0, rbacMiddleware_1.requirePermission)('users', 'update'), async (req, res) => {
    try {
        const { roleId } = req.body;
        if (!roleId) {
            res.status(400).json({ message: 'Role ID is required' });
            return;
        }
        const success = await rbacService.assignRoleToUser(req.params.id, roleId);
        if (!success) {
            res.status(404).json({ message: 'User or role not found' });
            return;
        }
        res.status(200).json({ message: 'Role assigned successfully' });
    }
    catch (error) {
        console.error('Error assigning role to user:', error);
        res.status(500).json({ message: 'Error assigning role to user' });
    }
});
router.delete('/users/:id/roles/:roleId', (0, rbacMiddleware_1.requirePermission)('users', 'update'), async (req, res) => {
    try {
        const success = await rbacService.removeRoleFromUser(req.params.id, req.params.roleId);
        if (!success) {
            res.status(404).json({ message: 'User or role not found' });
            return;
        }
        res.status(200).json({ message: 'Role removed successfully' });
    }
    catch (error) {
        console.error('Error removing role from user:', error);
        res.status(500).json({ message: 'Error removing role from user' });
    }
});
// User-Permission management routes
router.get('/users/:id/permissions', (0, rbacMiddleware_1.requirePermission)('users', 'read'), async (req, res) => {
    try {
        const permissions = await rbacService.getUserPermissions(req.params.id);
        res.status(200).json(permissions);
    }
    catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ message: 'Error fetching user permissions' });
    }
});
router.post('/users/:id/permissions', (0, rbacMiddleware_1.requirePermission)('users', 'update'), async (req, res) => {
    try {
        const { permissionId } = req.body;
        if (!permissionId) {
            res.status(400).json({ message: 'Permission ID is required' });
            return;
        }
        const success = await rbacService.assignPermissionToUser(req.params.id, permissionId);
        if (!success) {
            res.status(404).json({ message: 'User or permission not found' });
            return;
        }
        res.status(200).json({ message: 'Permission assigned successfully' });
    }
    catch (error) {
        console.error('Error assigning permission to user:', error);
        res.status(500).json({ message: 'Error assigning permission to user' });
    }
});
router.delete('/users/:id/permissions/:permissionId', (0, rbacMiddleware_1.requirePermission)('users', 'update'), async (req, res) => {
    try {
        const success = await rbacService.removePermissionFromUser(req.params.id, req.params.permissionId);
        if (!success) {
            res.status(404).json({ message: 'User or permission not found' });
            return;
        }
        res.status(200).json({ message: 'Permission removed successfully' });
    }
    catch (error) {
        console.error('Error removing permission from user:', error);
        res.status(500).json({ message: 'Error removing permission from user' });
    }
});
exports.default = router;
