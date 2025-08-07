// MongoDB script to create test customers with restaurant IDs
db = db.getSiblingDB('inseat');

// Define restaurant IDs from the list
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

// Create 16 test customers, distributing them across restaurants (2 per restaurant)
const testCustomers = [
  // CINEMA CITY ARABIAN CENTRE customers
  {
    email: "customer1@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq", // hashed "Password123"
    firstName: "John",
    lastName: "Doe",
    role: "customer",
    restaurantId: restaurantIds[0],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: "customer2@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Jane",
    lastName: "Smith",
    role: "customer",
    restaurantId: restaurantIds[0],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // CINEMA CITY AL QANA customers
  {
    email: "customer3@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Robert",
    lastName: "Johnson",
    role: "customer",
    restaurantId: restaurantIds[1],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: "customer4@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Emily",
    lastName: "Williams",
    role: "customer",
    restaurantId: restaurantIds[1],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // CINEMA CITY AL QANA VIP customers
  {
    email: "customer5@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Michael",
    lastName: "Brown",
    role: "customer",
    restaurantId: restaurantIds[2],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: "customer6@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Sarah",
    lastName: "Davis",
    role: "customer",
    restaurantId: restaurantIds[2],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Test Restaurant customers
  {
    email: "customer7@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "David",
    lastName: "Miller",
    role: "customer",
    restaurantId: restaurantIds[3],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: "customer8@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Emma",
    lastName: "Wilson",
    role: "customer",
    restaurantId: restaurantIds[3],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Updated Test Restaurant customers
  {
    email: "customer9@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "James",
    lastName: "Moore",
    role: "customer",
    restaurantId: restaurantIds[4],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: "customer10@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Olivia",
    lastName: "Taylor",
    role: "customer",
    restaurantId: restaurantIds[4],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Test Restaurant 2 customers
  {
    email: "customer11@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "William",
    lastName: "Anderson",
    role: "customer",
    restaurantId: restaurantIds[5],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: "customer12@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Sophia",
    lastName: "Thomas",
    role: "customer",
    restaurantId: restaurantIds[5],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Medge Pruittsdfsdsdf customers
  {
    email: "customer13@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Benjamin",
    lastName: "Jackson",
    role: "customer",
    restaurantId: restaurantIds[6],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: "customer14@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Ava",
    lastName: "White",
    role: "customer",
    restaurantId: restaurantIds[6],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Marina customers
  {
    email: "customer15@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Daniel",
    lastName: "Harris",
    role: "customer",
    restaurantId: restaurantIds[7],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: "customer16@example.com",
    password: "$2b$10$dPA.Fy2rny2K8oGo9Nxfh.Tz.dZbX5TEP1xSCWZG96gV2o2iBGiVq",
    firstName: "Mia",
    lastName: "Martin",
    role: "customer",
    restaurantId: restaurantIds[7],
    businessId: businessId,
    roles: [],
    isActive: true,
    isPasswordSet: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Insert the test customers
const result = db.users.insertMany(testCustomers);
print(`Inserted ${result.insertedCount} customers with restaurant IDs`);

// Verify the insertions
const customerCount = db.users.find({role: "customer"}).count();
print(`Total customer count: ${customerCount}`);

// Print the first few customers with their assigned restaurants for verification
const sampleCustomers = db.users.find({role: "customer"}).limit(5).toArray();
print("Sample customers with their assigned restaurants:");
sampleCustomers.forEach(customer => {
  print(`${customer.firstName} ${customer.lastName} (${customer.email}) - Restaurant ID: ${customer.restaurantId}`);
});
