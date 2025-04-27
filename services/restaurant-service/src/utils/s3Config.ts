import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// Configure S3 Client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1', // Use AWS_REGION from env
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '', // Use AWS_ACCESS_KEY_ID from env
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '' // Use AWS_SECRET_ACCESS_KEY from env
  }
});

// S3 bucket name
export const bucketName = process.env.AWS_S3_BUCKET || 'inseat-menu-images'; // Use AWS_S3_BUCKET from env