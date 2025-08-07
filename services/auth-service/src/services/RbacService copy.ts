//       }
      
//       // Remove role from user
//       await User.findByIdAndUpdate(
//         userId,
//         { $pull: { roles: roleId } },
//         { new: true }
//       );
      
//       return true;
//     } catch (error) {
//       console.error('Error removing role from user:', error);
//       return false;
//     }
//   }
  
//   /**
//    * Get all permissions for a user (from roles and direct permissions)
//    */
//   async getUserPermissions(userId: string): Promise<any[]> {
//     try {
//       const user = await User.findById(userId)
//         .populate({
//           path: 'roles',
//           populate: {
//             path: 'permissions'
//           }
//         })
//         .populate('directPermissions');
      
//       if (!user) {
//         return [];
//       }
      
//       const permissions = new Set();
      
//       // Add direct permissions
//       if (user.directPermissions && Array.isArray(user.directPermissions)) {
//         user.directPermissions.forEach((permission: any) => {
//           permissions.add(JSON.stringify(permission));
//         });
//       }
      
//       // Add permissions from roles
//       if (user.roles && Array.isArray(user.roles)) {
//         for (const role of user.roles) {
//           // Skip if role is just a string ID
//           if (typeof role === 'string') continue;
          
//           const roleObj = role as IRole;
//           if (roleObj.permissions && Array.isArray(roleObj.permissions)) {
//             roleObj.permissions.forEach((permission: any) => {
//               permissions.add(JSON.stringify(permission));
//             });
//           }
//         }
//       }
      
//       // Convert back to objects
//       return Array.from(permissions).map(p => JSON.parse(p as string));
//     } catch (error) {
//       console.error('Error getting user permissions:', error);
//       return [];
//     }
//   }
  
//   /**
//    * Assign a direct permission to a user
//    */
//   async assignPermissionToUser(userId: string, permissionId: string): Promise<boolean> {
//     try {
//       // Check if user and permission exist
//       const user = await User.findById(userId);
//       const permission = await Permission.findById(permissionId);
      
//       if (!user || !permission) {
//         return false;
//       }
      
//       // Add permission to user if not already assigned
//       await User.findByIdAndUpdate(
//         userId,
//         { $addToSet: { directPermissions: permissionId } },
//         { new: true }
//       );
      
//       return true;
//     } catch (error) {
//       console.error('Error assigning permission to user:', error);
//       return false;
//     }
//   }
  
//   /**
//    * Remove a direct permission from a user
//    */
//   async removePermissionFromUser(userId: string, permissionId: string): Promise<boolean> {
//     try {
//       // Check if user and permission exist
//       const user = await User.findById(userId);
//       const permission = await Permission.findById(permissionId);
      
//       if (!user || !permission) {
//         return false;
//       }
      
//       // Remove permission from user
//       await User.findByIdAndUpdate(
//         userId,
//         { $pull: { directPermissions: permissionId } },
//         { new: true }
//       );
      
//       return true;
//     } catch (error) {
//       console.error('Error removing permission from user:', error);
//       return false;
//     }
//   }
// }
