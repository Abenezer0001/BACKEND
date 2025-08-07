import { S3Client, ListBucketsCommand, CreateBucketCommand, HeadBucketCommand, BucketLocationConstraint } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.production') });

// Get credentials from environment variables
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.S3_REGION || 'us-east-1';
const bucketName = process.env.S3_BUCKET || 'inseat-s3-bucket';

// Log configuration (without exposing secrets)
console.log(`S3 Configuration:`);
console.log(`- Region: ${region}`);
console.log(`- AccessKeyID: ${accessKeyId ? 'PROVIDED' : 'MISSING'}`);
console.log(`- SecretKey: ${secretAccessKey ? 'PROVIDED' : 'MISSING'}`);
console.log(`- Target Bucket: ${bucketName}`);

// Configure S3 Client
const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || ''
    },
});

const checkBucketExists = async (bucketName: string): Promise<boolean> => {
    try {
        const command = new HeadBucketCommand({ Bucket: bucketName });
        await s3Client.send(command);
        return true;
    } catch (error: any) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return false;
        }
        console.error(`Error checking bucket: ${error.message}`);
        throw error;
    }
};

const createBucket = async (bucketName: string, region: string): Promise<void> => {
    try {
        const command = new CreateBucketCommand({
            Bucket: bucketName,
            CreateBucketConfiguration: region !== 'us-east-1' ? {
                LocationConstraint: region as BucketLocationConstraint
            } : undefined
        });

        await s3Client.send(command);
        console.log(`Bucket ${bucketName} created successfully`);
    } catch (error) {
        console.error(`Error creating bucket: ${error}`);
        throw error;
    }
};

// Main function to diagnose and fix S3 issues
async function diagnoseS3Issues() {
    console.log('Starting S3 diagnostic tool...');
    
    try {
        // 1. List all available buckets
        const listCommand = new ListBucketsCommand({});
        const { Buckets } = await s3Client.send(listCommand);

        console.log('\nAvailable S3 buckets:');
        if (Buckets && Buckets.length > 0) {
            Buckets.forEach(bucket => console.log(`- ${bucket.Name} (created: ${bucket.CreationDate})`));
        } else {
            console.log('No buckets found in this account');
        }

        // 2. Check if our target bucket exists
        console.log(`\nChecking if bucket '${bucketName}' exists...`);
        const exists = await checkBucketExists(bucketName);
        
        if (exists) {
            console.log(`✓ Bucket '${bucketName}' exists and is accessible`);
        } else {
            console.log(`✗ Bucket '${bucketName}' does not exist or is not accessible`);
            
            // 3. Offer to create bucket if needed
            console.log(`\nAttempting to create bucket '${bucketName}'...`);
            await createBucket(bucketName, region);
            
            // Verify bucket was created
            const verifyExists = await checkBucketExists(bucketName);
            if (verifyExists) {
                console.log(`✓ Bucket '${bucketName}' was created successfully`);
            } else {
                console.log(`✗ Failed to verify bucket '${bucketName}' was created`);
            }
        }

        // 4. Check if hardcoded bucket name exists
        const hardcodedBucket = 'inseat-menu-images';
        if (hardcodedBucket !== bucketName) {
            console.log(`\nChecking if hardcoded bucket '${hardcodedBucket}' exists...`);
            const hardcodedExists = await checkBucketExists(hardcodedBucket);
            
            if (hardcodedExists) {
                console.log(`✓ Hardcoded bucket '${hardcodedBucket}' exists and is accessible`);
                console.log(`NOTE: Your code may be using this bucket name instead of '${bucketName}'`);
            } else {
                console.log(`✗ Hardcoded bucket '${hardcodedBucket}' does not exist or is not accessible`);
            }
        }

    } catch (error) {
        console.error('S3 diagnostic failed:', error);
    }
}

// Run the diagnostic tool
diagnoseS3Issues();
