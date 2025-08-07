// Script to update existing customers with restaurant IDs in the remote MongoDB database

// Connection string
const connectionString = "mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0";

// Restaurant IDs from the provided list
const restaurantIds = [
  "681a581d1a12c59b214b386f", // CINEMA CITY ARABIAN CENTRE
  "681a581d1a12c59b214b3879", // CINEMA CITY AL QANA
  "681a581e1a12c59b214b3883", // CINEMA CITY AL QANA VIP
  "681b09f9f62e7b54cf524c5a", // Test Restaurant
  "681b0e3bf62e7b54cf524cb1", // Updated Test Restaurant
  "681b43b9592bdb7e29df8c51", // Test Restaurant 2
  "681df284f17b0eeadc010280", // Medge Pruittsdfsdsdf
  "6845f53d534799c145f2791b"  // Marina
];

// Business ID for all customers
const businessId = "68415b8095a2208cec9743a2";

// Run this in MongoDB shell to update existing customers with restaurant IDs
// For this script, we'll distribute customers evenly across restaurants
print("Updating existing customers with restaurant IDs...");

// First, let's get all customers
const customers = db.users.find({role: "customer"}).toArray();
print(`Found ${customers.length} customers to update.`);

if (customers.length === 0) {
  print("No customers found. Nothing to update.");
  quit();
}

// Distribute customers evenly across restaurants
customers.forEach((customer, index) => {
  // Assign a restaurant ID using modulo to cycle through the restaurant IDs
  const restaurantId = restaurantIds[index % restaurantIds.length];
  
  // Update the customer record
  const result = db.users.updateOne(
    { _id: customer._id },
    { 
      $set: { 
        restaurantId: restaurantId,
        // Also ensure they have the business ID
        businessId: businessId
      } 
    }
  );
  
  print(`Updated customer ${customer.firstName} ${customer.lastName} (${customer.email}) with restaurant ID: ${restaurantId} - Result: ${result.modifiedCount > 0 ? 'Success' : 'No change'}`);
});

// Verify the updates
print("\nVerification of updates:");
db.users.find({role: "customer"}).forEach(function(customer) {
  print(`${customer._id}: ${customer.firstName} ${customer.lastName} (${customer.email}) - Restaurant ID: ${customer.restaurantId || 'Not assigned'}`);
});
