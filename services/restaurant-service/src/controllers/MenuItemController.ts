import { Request, Response } from 'express';
import MenuItem, { IMenuItem } from '../models/MenuItem';
import Category from '../models/Category'; // To validate parent exists
import SubCategory from '../models/SubCategory'; // To validate parent exists
import SubSubCategory from '../models/SubSubCategory'; // Import SubSubCategory model
import Venue from '../models/Venue'; // To validate parent exists
import Restaurant from '../models/Restaurant'; // To validate restaurantId
import mongoose from 'mongoose';
import multer from 'multer';
// import path from 'path'; // No longer needed for constructing local paths
// import fs from 'fs'; // No longer needed for directory creation or file deletion
import ImageService  from '../services/ImageService'; // Import ImageService
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
        nutritionalInfo, restaurantId // Note: image is handled by req.file
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
      // --- End Validation ---

      // --- Image Handling ---
      let imageUrl: string | undefined = undefined;
      if (req.file) {
        try {
          // Upload to S3 using ImageService
          imageUrl = await ImageService.uploadImage(req.file.buffer, req.file.originalname);
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
        restaurantId // Store restaurant ID
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
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { restaurantId, venueId, categoryId, subCategoryId, subSubCategoryId } = req.query;
      const filter: any = {};

      if (restaurantId) {
        if (!mongoose.Types.ObjectId.isValid(restaurantId as string)) {
          res.status(400).json({ error: 'Invalid Restaurant ID format' });
          return;
        }
        filter.restaurantId = restaurantId;
      }
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

      // Add isActive filter by default unless explicitly requested otherwise
      if (req.query.includeInactive !== 'true') {
          filter.isActive = true;
      }

      const menuItems = await MenuItem.find(filter)
        .populate('venueId', 'name address') // Populate venue details
        .populate('categories', 'name') // Populate category names
        .populate('subCategories', 'name') // Populate subcategory names
        .populate('subSubCategory', 'name') // Populate optional subSubCategory name
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
                                    .populate('subSubCategory', 'name'); // Populate optional subSubCategory
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
      } else if (updateData.hasOwnProperty('subSubCategory') && updateData.subSubCategory === '') {
          // If explicitly setting to empty string, prepare to unset/set null
          updateData.subSubCategory = null;
      }
      // Optional: Check existence of referenced Categories/SubCategories during update
      // Prevent changing restaurantId if needed
      delete updateData.restaurantId; // Prevent changing restaurantId

      // Fetch existing item to check current image URL before update
      const existingItem = await MenuItem.findById(id).lean(); // Use lean for plain object
      if (!existingItem) {
        res.status(404).json({ error: 'MenuItem not found for update' });
        return;
      }

      // --- S3 Image Handling ---
      let newImageUrl: string | undefined | null = undefined; // Use null to signify deletion intent

      if (req.file) {
        // 1. Upload new image
        try {
          newImageUrl = await ImageService.uploadImage(req.file.buffer, req.file.originalname);
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

      const menuItem = await MenuItem.findById(id);
      if (!menuItem) {
        res.status(404).json({ error: 'MenuItem not found' });
        return;
      }

      // Toggle the isAvailable field
      menuItem.isAvailable = !menuItem.isAvailable;
      await menuItem.save();

      res.status(200).json(menuItem);
    } catch (error) {
      console.error('Error toggling menu item availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Error toggling menu item availability: ${errorMessage}` });
    }
  }
}
