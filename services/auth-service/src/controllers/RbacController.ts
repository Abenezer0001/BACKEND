import { Request, Response } from 'express';
import { RbacService } from '../services/RbacService';
import { NotFoundError } from '../errors/AppError';

export class RbacController {
  private static rbacService = new RbacService();

  static async assignRoleToUser(req: Request, res: Response) {
    const { userId, roleId } = req.params;
    
    const result = await RbacController.rbacService.assignRoleToUser(userId, roleId);
    
    if (!result) {
      throw new NotFoundError('User or role not found');
    }
    
    res.status(200).json({ 
      message: 'Role assigned successfully',
      userId,
      roleId
    });
  }

  static async removeRoleFromUser(req: Request, res: Response) {
    const { userId, roleId } = req.params;
    
    const result = await RbacController.rbacService.removeRoleFromUser(userId, roleId);
    
    if (!result) {
      throw new NotFoundError('User or role not found');
    }
    
    res.status(200).json({ 
      message: 'Role removed successfully',
      userId,
      roleId
    });
  }

  static async getUserPermissions(req: Request, res: Response) {
    const { userId } = req.params;
    
    const permissions = await RbacController.rbacService.getUserPermissions(userId);
    
    res.status(200).json({ permissions });
  }
}

