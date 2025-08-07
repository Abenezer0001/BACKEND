// MongoDB script to check existing customers and update them with restaurant IDs
print("Checking for existing customers in the database...");

// Query to find customers
db.users.find({role: "customer"}).forEach(function(customer) {
  print(`${customer._id}: ${customer.firstName} ${customer.lastName} (${customer.email}) - Restaurant ID: ${customer.restaurantId || 'Not assigned'}`);
});
