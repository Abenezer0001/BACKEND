import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0');

// Basic health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'inseat-backend' });
});

// Inventory endpoints
app.get('/api/inventory/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'inventory-direct', 
    timestamp: new Date().toISOString()
  });
});

app.get('/api/inventory/items', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId required' });
    }
    
    const db = mongoose.connection.db;
    const items = await db.collection('inventoryitems').find({
      restaurantId: new mongoose.Types.ObjectId(restaurantId as string),
      isActive: true
    }).toArray();
    
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/inventory/recipes', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId required' });
    }
    
    const db = mongoose.connection.db;
    const recipes = await db.collection('recipes').find({
      restaurantId: new mongoose.Types.ObjectId(restaurantId as string),
      isActive: true
    }).toArray();
    
    res.json({ success: true, data: recipes });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Minimal INSEAT server running on port ${PORT}`);
});
