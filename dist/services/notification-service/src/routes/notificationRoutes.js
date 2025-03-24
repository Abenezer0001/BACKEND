"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const NotificationController_1 = __importDefault(require("../controllers/NotificationController"));
const router = (0, express_1.Router)();
router.post('/', NotificationController_1.default.createNotification);
router.get('/', NotificationController_1.default.getNotifications);
exports.default = router;
