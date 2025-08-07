import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Debug logging for environment variables
console.log('S3Config - Environment Variables:');
console.log('S3_BUCKET:', process.env.S3_BUCKET);
console.log('S3_REGION:', process.env.S3_REGION);
console.log('AWS_ACCESS_KEY_ID present:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('AWS_SECRET_ACCESS_KEY present:', !!process.env.AWS_SECRET_ACCESS_KEY);

// Get credentials from environment variables
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.S3_REGION || 'us-east-1';

// Configure S3 Client
export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || ''
  },
  forcePathStyle: false
});

// S3 bucket name
export const bucketName = process.env.S3_BUCKET;
console.log('S3Config - Using bucket name:', bucketName);
