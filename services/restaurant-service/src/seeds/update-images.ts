import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Import Models
import Category from '../models/Category';
import SubCategory from '../models/SubCategory';
import SubSubCategory from '../models/SubSubCategory';
import MenuItem from '../models/MenuItem';
// Add other models if they also need image updates (e.g., Promotions)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // Adjust path as needed

// --- MCP Client Setup ---
// This assumes the MCP client library is available and configured
// In a real scenario, you might need a more robust way to interact with the MCP server
// For this script, we'll simulate the call structure.
// A proper implementation would involve setting up the MCP client connection.
// We will use placeholders for now and assume the MCP tool can be called.

// Placeholder for MCP interaction - Replace with actual MCP client usage
async function callUnsplashMcpTool(query: string): Promise<string | null> {
  console.log(`[MCP Placeholder] Simulating call to 'unsplash' server, tool 'fetch_unsplash_image' with query: "${query}"`);
  // In a real implementation:
  // 1. Instantiate McpClient with appropriate transport
  // 2. Connect the client
  // 3. Call client.callTool('unsplash', 'fetch_unsplash_image', { query })
  // 4. Handle response and errors
  // 5. Disconnect client

  // Simulate a successful response (replace with actual call)
  // This is just a placeholder URL structure
  const simulatedUrl = `https://images.unsplash.com/search/photos?query=${encodeURIComponent(query)}`;
  // Simulate finding an image vs. not finding one
  if (query.includes('not found')) { // Simple simulation of no result
      console.log(`[MCP Placeholder] Simulating no image found for "${query}"`);
      return null;
  }
   console.log(`[MCP Placeholder] Simulating success, returning URL: ${simulatedUrl}`);
  return simulatedUrl; // Return a simulated URL or null if no image found
}


// --- Database Update Logic ---

const updateModelImages = async (Model: mongoose.Model<any>, modelName: string) => {
  console.log(`\n--- Updating images for ${modelName} ---`);
  const documents = await Model.find({ 
    imageSearchTerm: { 
      $exists: true, 
      $ne: null, 
      $nin: ['', null] 
    } 
  }).exec();
  console.log(`Found ${documents.length} ${modelName}(s) with an imageSearchTerm.`);

  let updatedCount = 0;
  for (const doc of documents) {
    // Only update if the image field is currently empty or a placeholder
    if (!doc.image || doc.image.startsWith('https://via.placeholder.com')) {
      const searchTerm = doc.imageSearchTerm;
      console.log(`Fetching image for ${modelName} "${doc.name}" (ID: ${doc._id}) using term: "${searchTerm}"`);

      const imageUrl = await callUnsplashMcpTool(searchTerm); // Use the placeholder

      if (imageUrl) {
        doc.image = imageUrl;
        try {
          await doc.save();
          console.log(`Successfully updated image for ${modelName} "${doc.name}" (ID: ${doc._id})`);
          updatedCount++;
        } catch (saveError) {
          console.error(`Error saving ${modelName} "${doc.name}" (ID: ${doc._id}) after image update:`, saveError);
        }
      } else {
        console.log(`No image found or MCP tool failed for ${modelName} "${doc.name}" (ID: ${doc._id}). Keeping image field as is or empty.`);
        // Optionally set a default placeholder if needed
        // doc.image = 'https://via.placeholder.com/400x300.png?text=Not+Found';
        // await doc.save();
      }
    } else {
       console.log(`Skipping ${modelName} "${doc.name}" (ID: ${doc._id}) - already has an image: ${doc.image}`);
    }
     // Add a small delay to avoid hitting potential API rate limits (even with placeholder)
     await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
  }
  console.log(`--- Finished updating ${modelName}. Updated ${updatedCount} images. ---`);
};

const runImageUpdate = async () => {
  const dbUri = process.env.MONGO_URL || 'mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0';

  if (!dbUri) {
    console.error('Error: MONGO_URL is not defined in the .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUri);
    console.log('MongoDB connected successfully for image update.');

    // Update images for each model that has imageSearchTerm
    await updateModelImages(Category, 'Category');
    await updateModelImages(SubCategory, 'SubCategory');
    await updateModelImages(SubSubCategory, 'SubSubCategory');
    await updateModelImages(MenuItem, 'MenuItem');
    // Add calls for other models like Promotions if needed

    console.log('\nImage update process completed.');

  } catch (error) {
    console.error('Error during image update process:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

// Run the image update function
runImageUpdate();
