"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionCheckController = void 0;
const RbacService_1 = require("../services/RbacService");
class PermissionCheckController {
    constructor() {
        /**
         * Handler function for routes
         */
        this.checkPermissionHandler = (req, res, next) => {
            this.checkPermission(req, res).catch(next);
        };
    }
    /**
     * Check if the current user has a specific permission
     */
    async checkPermission(req, res) {
        var _a;
        try {
            const { resource, action } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                res.status(401).json({
                    hasPermission: false,
                    message: 'Authentication required'
                });
                return;
            }
            if (!resource || !action) {
                res.status(400).json({
                    hasPermission: false,
                    message: 'Resource and action are required'
                });
                return;
            }
            const rbacService = new RbacService_1.RbacService();
            const hasPermission = await rbacService.checkPermission(userId, resource, action);
            res.status(200).json({ hasPermission });
        }
        catch (error) {
            console.error('Error checking permission:', error);
            res.status(500).json({
                hasPermission: false,
                message: 'Error checking permission'
            });
        }
    }
}
exports.PermissionCheckController = PermissionCheckController;
