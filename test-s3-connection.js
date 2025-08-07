// test-s3-connection.js
// Script to verify AWS S3 credentials and connectivity

// Load environment variables from .env file (if needed)
require('dotenv').config();

// Import AWS SDK v3 S3 client
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testS3Connection() {
  console.log('Testing AWS S3 connection...');
  
  try {
    // Check if AWS credentials are set
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not found in environment variables');
    }
    
    // Get region from env var or use default
    const region = process.env.AWS_REGION || 'us-east-1';
    
    // Create S3 client
    const s3Client = new S3Client({ 
      region: region,
      // Credentials are automatically loaded from environment variables:
      // AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
    });
    
    console.log(`Attempting to connect to AWS S3 in region: ${region}`);
    
    // Execute list buckets command to test connectivity
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log('✅ S3 Connection Successful!');
    console.log(`Found ${response.Buckets.length} buckets:`);
    
    // Print bucket names but no other sensitive data
    response.Buckets.forEach(bucket => {
      console.log(`- ${bucket.Name} (created: ${bucket.CreationDate})`);
    });
    
    // If we need to specifically check for a particular bucket
    const bucketName = process.env.AWS_BUCKET_NAME;
    if (bucketName) {
      const bucketExists = response.Buckets.some(b => b.Name === bucketName);
      if (bucketExists) {
        console.log(`✅ Confirmed bucket "${bucketName}" exists and is accessible.`);
      } else {
        console.log(`⚠️  Warning: Configured bucket "${bucketName}" was not found among accessible buckets.`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ S3 Connection Test Failed:');
    
    // Provide helpful error messages without exposing credentials
    if (error.name === 'CredentialsProviderError') {
      console.error('Invalid AWS credentials. Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    } else if (error.name === 'InvalidAccessKeyId') {
      console.error('The AWS Access Key ID provided is invalid.');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.error('The AWS Secret Access Key is incorrect.');
    } else if (error.name === 'NetworkError' || error.code === 'ENOTFOUND') {
      console.error('Network error. Check your internet connection.');
    } else {
      // Log the error message but sanitize any potentially sensitive information
      console.error(`Error type: ${error.name}`);
      console.error(`Error message: ${error.message.replace(/[A-Za-z0-9/+]{40,}/g, '[REDACTED]')}`);
    }
    
    return false;
  }
}

// Run the test function
testS3Connection().then(success => {
  if (!success) {
    process.exit(1); // Exit with error code if test failed
  }
});

