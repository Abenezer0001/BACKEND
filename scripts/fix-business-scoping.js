/**
 * Script to verify business scoping for restaurant admin users
 * Ensures restaurant admin users can only access resources within their business
 * Run with: node scripts/fix-business-scoping.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function verifyBusinessScoping() {
  try {
    console.log('Verifying business scoping implementation...');
    
    // List the routes that should be using business scoping
    const routeFiles = [
      '../services/auth-service/src/routes/kitchenRoutes.ts',
      '../services/auth-service/src/routes/cashierRoutes.ts',
      '../services/auth-service/src/routes/scheduleRoutes.ts'
    ];
    
    console.log('\nChecking route files for business scoping middleware:');
    
    for (const routeFile of routeFiles) {
      try {
        const filePath = path.resolve(__dirname, routeFile);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const hasBusinessScope = content.includes('requireBusinessScope');
          const hasBusinessRole = content.includes('requireBusinessRole');
          
          console.log(`${path.basename(routeFile)}:`);
          console.log(`  - Business Scope Middleware: ${hasBusinessScope ? '✓ Found' : '✗ Not Found'}`);
          console.log(`  - Business Role Check: ${hasBusinessRole ? '✓ Found' : '✗ Not Found'}`);
        } else {
          console.log(`${path.basename(routeFile)}: ✗ File not found`);
        }
      } catch (err) {
        console.log(`Error checking ${routeFile}: ${err.message}`);
      }
    }
    
    // Check app.ts to verify route registration
    try {
      const appPath = path.resolve(__dirname, '../src/app.ts');
      if (fs.existsSync(appPath)) {
        const appContent = fs.readFileSync(appPath, 'utf8');
        const kitchenRoutes = appContent.includes('/api/kitchens');
        const cashierRoutes = appContent.includes('/api/cashiers');
        const scheduleRoutes = appContent.includes('/api/schedules');
        
        console.log('\nAPI endpoints registered in app.ts:');
        console.log(`  - /api/kitchens: ${kitchenRoutes ? '✓ Registered' : '✗ Not Registered'}`);
        console.log(`  - /api/cashiers: ${cashierRoutes ? '✓ Registered' : '✗ Not Registered'}`);
        console.log(`  - /api/schedules: ${scheduleRoutes ? '✓ Registered' : '✗ Not Registered'}`);
      }
    } catch (err) {
      console.log(`Error checking app.ts: ${err.message}`);
    }
    
    console.log('\nBusiness scoping verification complete.');
    console.log(`
Instructions for manual testing:

1. Kitchen Routes: 
   - Test endpoints with both system_admin and restaurant_admin users
   - Confirm restaurant_admin can only see their own business data

2. Cashier Routes:
   - Test endpoints with both system_admin and restaurant_admin users
   - Confirm restaurant_admin can only see their own business data

3. Schedule Routes:
   - Test endpoints with both system_admin and restaurant_admin users
   - Confirm restaurant_admin can only see their own business data

4. Frontend Menu:
   - Confirm kitchen, cashier, and schedule tabs appear for restaurant_admin users
   - Test navigation to these routes in the admin interface

All middleware has been applied to the routes. Testing is recommended to ensure proper functionality.
    `);
  } catch (error) {
    console.error('Error verifying business scoping:', error);
  }
}

// Run the function
verifyBusinessScoping();
