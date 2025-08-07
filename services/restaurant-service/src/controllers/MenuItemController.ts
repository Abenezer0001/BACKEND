import { Request, Response } from 'express';
import MenuItem, { IMenuItem } from '../models/MenuItem';
import Category from '../models/Category'; // To validate parent exists
import SubCategory from '../models/SubCategory'; // To validate parent exists
import SubSubCategory from '../models/SubSubCategory'; // Import SubSubCategory model
import Venue from '../models/Venue'; // To validate parent exists
import Restaurant from '../models/Restaurant'; // To validate restaurantId
import mongoose from 'mongoose';
// Import Kitchen model for kitchen validation
import multer from 'multer';
// import path from 'path'; // No longer needed for constructing local paths
// import fs from 'fs'; // No longer needed for directory creation or file deletion
import ImageService  from '../services/ImageService'; // Import ImageService
import { AuthenticatedRequest } from '../../../auth-service/src/types/auth.types';
// --- Multer Configuration ---
// Use memoryStorage to handle files as buffers in memory for S3 upload
const storage = multer.memoryStorage();
// File filter (optional: restrict to image types)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.') as any, false); // Cast to any to satisfy callback type
  }
};

// Add limits for file size (e.g., 5MB)
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
// --- End Multer Configuration ---

export class MenuItemController {

  // Create a new menu item
  // Create a new menu item (handles image upload)
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        name, description, venueId, categories, subCategories, subSubCategory, price, modifierGroups,
        image, preparationTime, isAvailable, isActive, allergens,
        nutritionalInfo, restaurantId, kitchenId, activeRecipeId // Note: image is handled by req.file
      } = req.body;

      // --- Validation ---
      if (!name || !venueId || !price || !preparationTime || !restaurantId) {
        res.status(400).json({ error: 'Missing required fields: name, venueId, price, preparationTime, restaurantId' });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(venueId)) {
        res.status(400).json({ error: 'Invalid Venue ID format' });
        return;
      }
      if (categories && !Array.isArray(categories)) {
          res.status(400).json({ error: 'Categories must be an array of IDs' });
          return;
      }
      if (subCategories && !Array.isArray(subCategories)) {
          res.status(400).json({ error: 'SubCategories must be an array of IDs' });
          return;
      }
      // Optional: Validate each ID in the arrays
      if (categories && categories.some((id: string) => !mongoose.Types.ObjectId.isValid(id))) {
          res.status(400).json({ error: 'Invalid Category ID format found in categories array' });
          return;
      }
      if (subCategories && subCategories.some((id: string) => !mongoose.Types.ObjectId.isValid(id))) {
          res.status(400).json({ error: 'Invalid SubCategory ID format found in subCategories array' });
          return;
      }
      // Validate subSubCategory if provided
      if (subSubCategory && !mongoose.Types.ObjectId.isValid(subSubCategory)) {
        res.status(400).json({ error: 'Invalid SubSubCategory ID format' });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ error: 'Invalid Restaurant ID format' });
        return;
      }
      // Validate kitchenId if provided
      if (kitchenId && !mongoose.Types.ObjectId.isValid(kitchenId)) {
        res.status(400).json({ error: 'Invalid Kitchen ID format' });
        return;
      }

      // Check if referenced Venue exists
      const parentVenue = await Venue.findById(venueId);
      if (!parentVenue) {
        res.status(404).json({ error: 'Venue not found' });
        return;
      }
      // Optional: Check if referenced Categories/SubCategories exist
      // const parentCategories = await Category.find({ _id: { $in: categories || [] } });
      // if (categories && parentCategories.length !== categories.length) { ... }
      // const parentSubCategories = await SubCategory.find({ _id: { $in: subCategories || [] } });
      // if (subCategories && parentSubCategories.length !== subCategories.length) { ... }
      // Optional: Check if referenced SubSubCategory exists
      if (subSubCategory) {
        const parentSubSubCategory = await SubSubCategory.findById(subSubCategory);
        if (!parentSubSubCategory) {
          res.status(404).json({ error: 'SubSubCategory not found' });
          return;
        }
      }
       // Check if Restaurant exists
      const parentRestaurant = await Restaurant.findById(restaurantId);
      if (!parentRestaurant) {
        res.status(404).json({ error: 'Restaurant not found' });
        return;
      }
      // Note: Kitchen validation can be added here when kitchen service is available
      // For now, we'll store the kitchenId if provided and let the application handle validation
      // --- End Validation ---

      // --- Image Handling ---
      let imageUrl: string | undefined = undefined;
      // Handle multiple file fields - look for 'image' field first, then any image file
      const imageFile = req.files ? 
        (Array.isArray(req.files) ? 
          req.files.find(file => file.fieldname === 'image') || 
          req.files.find(file => file.mimetype.startsWith('image/')) :
          req.files['image'] ? req.files['image'][0] : undefined) :
        req.file;
      
      if (imageFile) {
        try {
          // Upload to S3 using ImageService
          imageUrl = await ImageService.uploadImage(imageFile.buffer, imageFile.originalname);
        } catch (uploadError) {
          console.error('Error uploading image to S3:', uploadError);
          // Decide how to handle upload errors - here we'll proceed without an image URL
          // You might want to return a 500 error instead
           res.status(500).json({ error: 'Failed to upload image.' });
           return;
        }
      }
      // Note: Removed manual image URL setting via req.body.image for simplicity with S3.
      // If manual URLs are needed, consider a separate field or logic.
      // --- End Image Handling ---

      const menuItem = new MenuItem({
        name,
        description,
        venueId,
        categories: categories || [],
        subCategories: subCategories || [],
        subSubCategory: subSubCategory || null, // Add optional subSubCategory
        price,
        modifierGroups: modifierGroups || [],
        image: imageUrl, // Use the S3 URL
        preparationTime,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        isActive: isActive !== undefined ? isActive : true,
        allergens: allergens || [],
        nutritionalInfo: nutritionalInfo || {},
        restaurantId, // Store restaurant ID
        kitchenId: kitchenId || null // Store kitchen ID if provided
      });

      const savedMenuItem = await menuItem.save();
      res.status(201).json(savedMenuItem);

    } catch (error) {
      console.error('Error creating menu item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error creating menu item: ${errorMessage}` });
    }
  }

  // Get all menu items (optionally filter by restaurant or subSubCategory)
  public async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { restaurantId, venueId, categoryId, subCategoryId, subSubCategoryId, kitchenId } = req.query;
      const user = req.user;
      const filter: any = {};

      // Allow public access when no user authentication is present
      if (!user) {
        // Public access: Apply basic filters only
        if (restaurantId) {
          if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
            res.status(400).json({ error: 'Invalid Restaurant ID format' });
            return;
          }
          filter.restaurantId = restaurantId;
        }
        // For public access, only show active and available items
        filter.isActive = true;
        filter.isAvailable = true;
      } else {
        // Authenticated user access - apply role-based scoping
        if (user.role === 'restaurant_admin') {
          // Restaurant admin can only see menu items from their business restaurants
          if (!user.businessId) {
            res.status(403).json({ error: 'Restaurant admin user must be associated with a business' });
            return;
          }

          // Get all restaurants for this business
          const businessRestaurants = await Restaurant.find({ businessId: user.businessId }).select('_id');
          const restaurantIds = businessRestaurants.map(r => r._id);

          if (restaurantIds.length === 0) {
            res.status(200).json([]); // No restaurants, return empty array
            return;
          }

          // Filter by business restaurants
          filter.restaurantId = { $in: restaurantIds };

          // If restaurantId is provided in query, validate it belongs to the business
          if (restaurantId) {
            if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
              res.status(400).json({ error: 'Invalid Restaurant ID format' });
              return;
            }
            
            const requestedRestaurantId = new mongoose.Types.ObjectId(restaurantId as string);
            const isValidRestaurant = restaurantIds.some(id => id.equals(requestedRestaurantId));
            
            if (!isValidRestaurant) {
              res.status(403).json({ error: 'Access denied - restaurant does not belong to your business' });
              return;
            }
            
            filter.restaurantId = requestedRestaurantId;
          }
        } else if (user.role === 'system_admin') {
          // System admin can see all menu items, apply restaurantId filter if provided
          if (restaurantId) {
            if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
              res.status(400).json({ error: 'Invalid Restaurant ID format' });
              return;
            }
            filter.restaurantId = restaurantId;
          }
        } else {
          res.status(403).json({ error: 'Access denied - insufficient role permissions' });
          return;
        }
      }

      // Apply other filters
      if (venueId) {
         if (!mongoose.Types.ObjectId.isValid(venueId as string)) {
          res.status(400).json({ error: 'Invalid Venue ID format' });
          return;
        }
        filter.venueId = venueId;
      }
       if (categoryId) {
         if (!mongoose.Types.ObjectId.isValid(categoryId as string)) {
          res.status(400).json({ error: 'Invalid Category ID format' });
          return;
        }
        filter.categories = categoryId; // Find items containing this category
      }
       if (subCategoryId) {
         if (!mongoose.Types.ObjectId.isValid(subCategoryId as string)) {
          res.status(400).json({ error: 'Invalid SubCategory ID format' });
          return;
        }
        filter.subCategories = subCategoryId; // Find items containing this subcategory
      }
      if (subSubCategoryId) {
         if (!mongoose.Types.ObjectId.isValid(subSubCategoryId as string)) {
          res.status(400).json({ error: 'Invalid SubSubCategory ID format' });
          return;
        }
        filter.subSubCategory = subSubCategoryId; // Find items with this subSubCategory
      }
      if (kitchenId) {
         if (!mongoose.Types.ObjectId.isValid(kitchenId as string)) {
          res.status(400).json({ error: 'Invalid Kitchen ID format' });
          return;
        }
        filter.kitchenId = kitchenId; // Find items assigned to this kitchen
      }

      // Add isActive filter by default unless explicitly requested otherwise
      // For public access, this is already set above
      if (user && req.query.includeInactive !== 'true' && !filter.hasOwnProperty('isActive')) {
          filter.isActive = true;
      }

      // DO NOT filter by isAvailable - show both available and unavailable items
      // The frontend will handle availability toggling

      const menuItems = await MenuItem.find(filter)
        .populate('venueId', 'name address') // Populate venue details
        .populate('categories', 'name') // Populate category names
        .populate('subCategories', 'name') // Populate subcategory names
        .populate('subSubCategory', 'name') // Populate optional subSubCategory name
        .populate('modifierGroups') // Populate modifier groups with full details
        .sort({ name: 1 }); // Sort alphabetically by name

      res.status(200).json(menuItems);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching menu items: ${errorMessage}` });
    }
  }

  // Get menu item by ID
  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid menu item ID format' });
        return;
      }

      const menuItem = await MenuItem.findById(id)
                                    .populate('venueId', 'name address')
                                    .populate('categories', 'name')
                                    .populate('subCategories', 'name')
                                    .populate('subSubCategory', 'name') // Populate optional subSubCategory
                                    .populate('modifierGroups'); // Populate modifier groups with full details
      if (!menuItem) {
        res.status(404).json({ error: 'MenuItem not found' });
        return;
      }

      res.status(200).json(menuItem);
    } catch (error) {
      console.error('Error fetching menu item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error fetching menu item: ${errorMessage}` });
    }
  }

  // Update menu item (handles image upload)
  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid menu item ID format' });
        return;
      }

      // Validate Venue if it's being changed
      if (updateData.venueId && !mongoose.Types.ObjectId.isValid(updateData.venueId)) {
        res.status(400).json({ error: 'Invalid Venue ID format' });
        return;
      }
      if (updateData.venueId) {
          const venueExists = await Venue.findById(updateData.venueId);
          if (!venueExists) {
              res.status(404).json({ error: 'Venue not found' });
              return;
          }
      }
      // Validate categories/subCategories arrays if provided
       if (updateData.categories && (!Array.isArray(updateData.categories) || updateData.categories.some((id: string) => !mongoose.Types.ObjectId.isValid(id)))) {
          res.status(400).json({ error: 'Invalid format for categories array' });
          return;
      }
       if (updateData.subCategories && (!Array.isArray(updateData.subCategories) || updateData.subCategories.some((id: string) => !mongoose.Types.ObjectId.isValid(id)))) {
          res.status(400).json({ error: 'Invalid format for subCategories array' });
          return;
      }
      // Validate subSubCategory if provided and being changed
      if (updateData.subSubCategory && !mongoose.Types.ObjectId.isValid(updateData.subSubCategory)) {
          res.status(400).json({ error: 'Invalid SubSubCategory ID format' });
          return;
      }
      if (updateData.subSubCategory) {
          const subSubCatExists = await SubSubCategory.findById(updateData.subSubCategory);
          if (!subSubCatExists) {
              res.status(404).json({ error: 'SubSubCategory not found' });
              return;
          }
      } else if (Object.prototype.hasOwnProperty.call(updateData, 'subSubCategory') && updateData.subSubCategory === '') {
          // If explicitly setting to empty string, prepare to unset/set null
          updateData.subSubCategory = null;
      }
      // Validate kitchenId if provided and being changed
      if (updateData.kitchenId && !mongoose.Types.ObjectId.isValid(updateData.kitchenId)) {
          res.status(400).json({ error: 'Invalid Kitchen ID format' });
          return;
      }
      // Note: Kitchen validation can be added here when kitchen service is available
      // For now, we'll store the kitchenId if provided and let the application handle validation
      if (Object.prototype.hasOwnProperty.call(updateData, 'kitchenId') && updateData.kitchenId === '') {
          // If explicitly setting to empty string, prepare to unset/set null
          updateData.kitchenId = null;
      }
      // Optional: Check existence of referenced Categories/SubCategories during update
      // Prevent changing restaurantId if needed
      delete updateData.restaurantId; // Prevent changing restaurantId

      // Validate activeRecipeId if provided
      if (Object.prototype.hasOwnProperty.call(updateData, 'activeRecipeId')) {
        if (updateData.activeRecipeId && !mongoose.Types.ObjectId.isValid(updateData.activeRecipeId)) {
          res.status(400).json({ error: 'Invalid activeRecipeId format' });
          return;
        }
        if (updateData.activeRecipeId === '' || updateData.activeRecipeId === null) {
          updateData.activeRecipeId = null; // Ensure it's set to null if cleared
        }
      }

      // Fetch existing item to check current image URL before update
      const existingItem = await MenuItem.findById(id).lean(); // Use lean for plain object
      if (!existingItem) {
        res.status(404).json({ error: 'MenuItem not found for update' });
        return;
      }

      // --- S3 Image Handling ---
      let newImageUrl: string | undefined | null = undefined; // Use null to signify deletion intent

      // Handle multiple file fields - look for 'image' field first, then any image file
      const imageFile = req.files ? 
        (Array.isArray(req.files) ? 
          req.files.find(file => file.fieldname === 'image') || 
          req.files.find(file => file.mimetype.startsWith('image/')) :
          req.files['image'] ? req.files['image'][0] : undefined) :
        req.file;

      if (imageFile) {
        // 1. Upload new image
        try {
          newImageUrl = await ImageService.uploadImage(imageFile.buffer, imageFile.originalname);
          updateData.image = newImageUrl; // Set the new S3 URL in updateData
          // 2. Delete old image if it exists and is an S3 URL
          if (existingItem.image && existingItem.image.includes('amazonaws.com')) {
            try {
              await ImageService.deleteImage(existingItem.image);
            } catch (deleteError) {
              console.error(`Error deleting old S3 image (${existingItem.image}):`, deleteError);
              // Log error but continue the update process
            }
          }
        } catch (uploadError) {
          console.error('Error uploading new image to S3 during update:', uploadError);
          res.status(500).json({ error: 'Failed to upload new image.' });
          return;
        }
      } else if (updateData.image === '') {
        // 3. Explicitly clearing the image
        newImageUrl = null; // Signal deletion
        // Delete old image if it exists and is an S3 URL
        if (existingItem.image && existingItem.image.includes('amazonaws.com')) {
          try {
            await ImageService.deleteImage(existingItem.image);
          } catch (deleteError) {
            console.error(`Error deleting S3 image (${existingItem.image}) on clear:`, deleteError);
            // Log error but continue
          }
        }
        // Use $unset for reliable field removal in MongoDB
        delete updateData.image; // Remove from standard update object
        updateData.$unset = { image: 1 }; // Add $unset operator
      } else if (updateData.image && updateData.image !== existingItem.image) {
        // 4. Manual URL provided and it's different from the old one
        // Delete old S3 image if it existed
        if (existingItem.image && existingItem.image.includes('amazonaws.com')) {
           try {
              await ImageService.deleteImage(existingItem.image);
            } catch (deleteError) {
              console.error(`Error deleting old S3 image (${existingItem.image}) when setting manual URL:`, deleteError);
              // Log error but continue
            }
        }
        // Keep the manually provided updateData.image
        if (updateData.$unset) delete updateData.$unset.image; // Ensure $unset is not used
      } else {
        // 5. No file uploaded, and image field not present or unchanged in body
        // -> Keep the existing image, remove 'image' from updateData to avoid accidental overwrite
        delete updateData.image;
        if (updateData.$unset) delete updateData.$unset.image; // Ensure $unset is not used
      }
      // --- End S3 Image Handling ---


      const menuItem = await MenuItem.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
      .populate('venueId', 'name address')
      .populate('categories', 'name')
      .populate('subCategories', 'name')
      .populate('subSubCategory', 'name'); // Populate optional subSubCategory

      if (!menuItem) {
        res.status(404).json({ error: 'MenuItem not found' });
        return;
      }

      res.status(200).json(menuItem);
    } catch (error) {
      console.error('Error updating menu item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error updating menu item: ${errorMessage}` });
    }
  }

  // Delete menu item (soft delete by default)
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { hardDelete } = req.query; // Option for permanent deletion

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid menu item ID format' });
        return;
      }

      // Fetch the item first to get its details, including the image URL
      const menuItem = await MenuItem.findById(id).lean(); // Use lean for plain object

      if (!menuItem) {
          res.status(404).json({ error: 'MenuItem not found for deletion' });
          return;
      }

      const deleteImageOnSoftDelete = process.env.DELETE_IMAGE_ON_SOFT_DELETE === 'true';
      let deletedItem; // To store result of delete/update operation
      if (hardDelete === 'true') {
        // --- Permanent Delete ---
        // Delete image from S3 if it exists
        if (menuItem.image && menuItem.image.includes('amazonaws.com')) {
            try {
                await ImageService.deleteImage(menuItem.image);
            } catch (deleteError) {
                console.error(`Error deleting S3 image (${menuItem.image}) during hard delete:`, deleteError);
                // Log error but proceed with DB deletion
            }
        }
        // Perform the actual database deletion
        deletedItem = await MenuItem.findByIdAndDelete(id);
         if (!deletedItem) {
             // This case should technically be caught by the initial findById, but added for safety
            res.status(404).json({ error: 'MenuItem not found during final delete attempt' });
            return;
         }
         res.status(200).json({ message: 'MenuItem permanently deleted successfully' });

      } else {
        // --- Soft Delete (set isActive to false) ---
         // Delete image from S3 only if the environment variable is set
        if (deleteImageOnSoftDelete && menuItem.image && menuItem.image.includes('amazonaws.com')) {
             try {
                await ImageService.deleteImage(menuItem.image);
            } catch (deleteError) {
                console.error(`Error deleting S3 image (${menuItem.image}) during soft delete:`, deleteError);
                // Log error but proceed with DB update
            }
        }
        // Perform the soft delete (update isActive flag)
        deletedItem = await MenuItem.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true } // Return the updated document
        );
         if (!deletedItem) {
            // This case should technically be caught by the initial findById, but added for safety
            res.status(404).json({ error: 'MenuItem not found during final soft delete attempt' });
            return;
         }
        res.status(200).json({ message: 'MenuItem deactivated successfully', menuItem: deletedItem });
      }

    } catch (error) {
      console.error('Error deleting menu item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error deleting menu item: ${errorMessage}` });
    }
  }

  // Toggle item availability (isAvailable field)
   public async toggleAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid menu item ID format' });
        return;
      }

      // First get the current menu item to check its current availability
      const currentMenuItem = await MenuItem.findById(id);
      if (!currentMenuItem) {
        res.status(404).json({ error: 'MenuItem not found' });
        return;
      }

      // Toggle the isAvailable field using findByIdAndUpdate to bypass validation
      const updatedMenuItem = await MenuItem.findByIdAndUpdate(
        id,
        { isAvailable: !currentMenuItem.isAvailable },
        { new: true, runValidators: false } // Don't run validators to avoid required field issues
      );

      if (!updatedMenuItem) {
        res.status(404).json({ error: 'MenuItem not found during update' });
        return;
      }

      res.status(200).json(updatedMenuItem);
    } catch (error) {
      console.error('Error toggling menu item availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error toggling menu item availability: ${errorMessage}` });
    }
  }

  // Add a modifier to a menu item
  public async addModifier(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, options, price } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid menu item ID format' });
        return;
      }

      if (!name || !options || !Array.isArray(options) || options.length === 0) {
        res.status(400).json({ error: 'Missing required fields: name and options (must be a non-empty array)' });
        return;
      }

      const menuItem = await MenuItem.findById(id);
      if (!menuItem) {
        res.status(404).json({ error: 'MenuItem not found' });
        return;
      }

      // Assuming modifierGroups is an array of objects with name, options, and price
      // And options within a modifierGroup is an array of objects like { name: string, price: number }
      // For simplicity, let's assume the request body 'options' are just names and 'price' is for the group or each option.
      // The swagger suggests 'options' is an array of strings and 'price' is a single number for the modifier group.

      const newModifierGroup = {
        name,
        options: options.map((opt: string) => ({ name: opt, price: price || 0 })), // Default price to 0 if not provided for each option
        // Or, if price is for the group:
        // price: price || 0, // Price for the whole modifier group
        // options: options.map((opt: string) => ({ name: opt }))
      };
      
      // Let's adjust based on a common structure for modifier groups:
      // A modifier group has a name (e.g., "Size") and options (e.g., "Small", "Medium", "Large")
      // Each option within the group can have an additional price.
      // The request body has `name` (for the group), `options` (array of strings for option names), and `price` (which could be a base price for selecting this group or an additional price for each option).
      // The swagger example: `[{"name":"Size","options":["Small","Medium","Large"],"price":2.00}]` for the `modifiers` field in `MenuItemRequest`
      // This suggests `modifiers` (or `modifierGroups`) is an array of objects, where each object has `name`, `options` (array of strings), and `price`.

      // Let's assume `modifierGroups` on the MenuItem model is an array of objects like:
      // { name: string, options: [{ name: string, additionalPrice: number }], minSelection: number, maxSelection: number }
      // The request for `addModifier` is simpler: `name`, `options` (string[]), `price` (number for the group or each option).

      // For this implementation, let's assume `modifierGroups` on `MenuItem` stores an array of:
      // { name: string; options: Array<{ name: string; price?: number }>; price?: number }
      // And the `addModifier` endpoint adds one such group.

      const modifierToAdd = {
        name,
        options: options.map((optName: string) => ({ name: optName, price: 0 })), // Assuming options themselves don't have individual prices from this endpoint, or default to 0
        price: price // Price for selecting an option from this group, or a base price for the group
      };

      if (!menuItem.modifierGroups) {
        menuItem.modifierGroups = [];
      }
      menuItem.modifierGroups.push(modifierToAdd as any); // Cast to any if IModifierGroup type is not perfectly matched

      await menuItem.save();
      res.status(201).json(menuItem);

    } catch (error) {
      console.error('Error adding modifier to menu item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error adding modifier: ${errorMessage}` });
    }
  }
}
