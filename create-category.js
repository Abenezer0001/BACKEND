const mongoose = require('mongoose');

const createCategory = async (restaurantId) => {
  try {
    await mongoose.connect('mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0');
    
    const Category = mongoose.model('Category', new mongoose.Schema({
      name: String,
      description: String,
      image: String,
      restaurantId: mongoose.Schema.Types.ObjectId,
      isActive: Boolean,
      order: Number
    }));

    const category = new Category({
      name: "Main Dishes",
      description: "Main course items",
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      isActive: true,
      order: 1,
      image: ""
    });

    const result = await category.save();
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

const restaurantId = process.argv[2];
if (!restaurantId) {
  console.error('Restaurant ID is required');
  process.exit(1);
}

createCategory(restaurantId);
