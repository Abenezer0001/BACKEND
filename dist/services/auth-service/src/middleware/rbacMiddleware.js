"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requirePermission = void 0;
const RbacService_1 = require("../services/RbacService");
/**
 * Middleware to check if a user has the required permission for a resource and action
 * @param resource The resource being accessed (e.g., 'orders', 'menu-items')
 * @param action The action being performed (e.g., 'create', 'read', 'update', 'delete')
 */
const requirePermission = (resource, action) => {
    return async (req, res, next) => {
        var _a;
        try {
            // Get the user ID from the request (set by auth middleware)
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const rbacService = new RbacService_1.RbacService();
            const hasPermission = await rbacService.checkPermission(userId, resource, action);
            if (!hasPermission) {
                res.status(403).json({
                    message: 'Access denied. Insufficient permissions.',
                    details: `Required permission: ${action} on ${resource}`
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('RBAC authorization error:', error);
            res.status(500).json({ message: 'Authorization error' });
        }
    };
};
exports.requirePermission = requirePermission;
/**
 * Middleware to check if a user has any of the specified roles
 * @param roles Array of role names to check against
 */
const requireRole = (roles) => {
    return async (req, res, next) => {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const rbacService = new RbacService_1.RbacService();
            const hasRole = await rbacService.checkUserHasRole(userId, roles);
            if (!hasRole) {
                res.status(403).json({
                    message: 'Access denied. Insufficient role.',
                    details: `Required roles: ${roles.join(', ')}`
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('RBAC role check error:', error);
            res.status(500).json({ message: 'Authorization error' });
        }
    };
};
exports.requireRole = requireRole;
