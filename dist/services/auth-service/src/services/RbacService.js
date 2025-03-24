"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbacService = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const role_model_1 = require("../models/role.model");
const permission_model_1 = require("../models/permission.model");
class RbacService {
    /**
     * Check if a user has a specific permission for a resource and action
     */
    async checkPermission(userId, resource, action) {
        try {
            // Find the user and populate roles and direct permissions
            const user = await user_model_1.default.findById(userId)
                .populate({
                path: 'roles',
                populate: {
                    path: 'permissions'
                }
            })
                .populate('directPermissions');
            if (!user) {
                return false;
            }
            // Check direct permissions first
            if (user.directPermissions && Array.isArray(user.directPermissions)) {
                const hasDirectPermission = user.directPermissions.some((permission) => permission.resource === resource && permission.action === action);
                if (hasDirectPermission) {
                    return true;
                }
            }
            // Check permissions from roles
            if (user.roles && Array.isArray(user.roles)) {
                for (const role of user.roles) {
                    // Skip if role is just a string ID
                    if (typeof role === 'string')
                        continue;
                    const roleObj = role;
                    if (roleObj.permissions && Array.isArray(roleObj.permissions)) {
                        const hasPermissionFromRole = roleObj.permissions.some((permission) => permission.resource === resource && permission.action === action);
                        if (hasPermissionFromRole) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    }
    /**
     * Check if a user has any of the specified roles
     */
    async checkUserHasRole(userId, roleNames) {
        try {
            const user = await user_model_1.default.findById(userId).populate('roles');
            if (!user || !user.roles || !Array.isArray(user.roles)) {
                return false;
            }
            return user.roles.some((role) => {
                if (typeof role === 'string')
                    return false;
                return roleNames.includes(role.name);
            });
        }
        catch (error) {
            console.error('Error checking user roles:', error);
            return false;
        }
    }
    /**
     * Assign a role to a user
     */
    async assignRoleToUser(userId, roleId) {
        try {
            // Check if user and role exist
            const user = await user_model_1.default.findById(userId);
            const role = await role_model_1.Role.findById(roleId);
            if (!user || !role) {
                return false;
            }
            // Add role to user if not already assigned
            await user_model_1.default.findByIdAndUpdate(userId, { $addToSet: { roles: roleId } }, { new: true });
            return true;
        }
        catch (error) {
            console.error('Error assigning role to user:', error);
            return false;
        }
    }
    /**
     * Remove a role from a user
     */
    async removeRoleFromUser(userId, roleId) {
        try {
            // Check if user and role exist
            const user = await user_model_1.default.findById(userId);
            const role = await role_model_1.Role.findById(roleId);
            if (!user || !role) {
                return false;
            }
            // Remove role from user
            await user_model_1.default.findByIdAndUpdate(userId, { $pull: { roles: roleId } }, { new: true });
            return true;
        }
        catch (error) {
            console.error('Error removing role from user:', error);
            return false;
        }
    }
    /**
     * Get all permissions for a user (from roles and direct permissions)
     */
    async getUserPermissions(userId) {
        try {
            const user = await user_model_1.default.findById(userId)
                .populate({
                path: 'roles',
                populate: {
                    path: 'permissions'
                }
            })
                .populate('directPermissions');
            if (!user) {
                return [];
            }
            const permissions = new Set();
            // Add direct permissions
            if (user.directPermissions && Array.isArray(user.directPermissions)) {
                user.directPermissions.forEach((permission) => {
                    permissions.add(JSON.stringify(permission));
                });
            }
            // Add permissions from roles
            if (user.roles && Array.isArray(user.roles)) {
                for (const role of user.roles) {
                    // Skip if role is just a string ID
                    if (typeof role === 'string')
                        continue;
                    const roleObj = role;
                    if (roleObj.permissions && Array.isArray(roleObj.permissions)) {
                        roleObj.permissions.forEach((permission) => {
                            permissions.add(JSON.stringify(permission));
                        });
                    }
                }
            }
            // Convert back to objects
            return Array.from(permissions).map(p => JSON.parse(p));
        }
        catch (error) {
            console.error('Error getting user permissions:', error);
            return [];
        }
    }
    /**
     * Assign a direct permission to a user
     */
    async assignPermissionToUser(userId, permissionId) {
        try {
            // Check if user and permission exist
            const user = await user_model_1.default.findById(userId);
            const permission = await permission_model_1.Permission.findById(permissionId);
            if (!user || !permission) {
                return false;
            }
            // Add permission to user if not already assigned
            await user_model_1.default.findByIdAndUpdate(userId, { $addToSet: { directPermissions: permissionId } }, { new: true });
            return true;
        }
        catch (error) {
            console.error('Error assigning permission to user:', error);
            return false;
        }
    }
    /**
     * Remove a direct permission from a user
     */
    async removePermissionFromUser(userId, permissionId) {
        try {
            // Check if user and permission exist
            const user = await user_model_1.default.findById(userId);
            const permission = await permission_model_1.Permission.findById(permissionId);
            if (!user || !permission) {
                return false;
            }
            // Remove permission from user
            await user_model_1.default.findByIdAndUpdate(userId, { $pull: { directPermissions: permissionId } }, { new: true });
            return true;
        }
        catch (error) {
            console.error('Error removing permission from user:', error);
            return false;
        }
    }
}
exports.RbacService = RbacService;
