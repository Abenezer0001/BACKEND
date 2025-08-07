import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, bucketName } from '../utils/s3Config';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

class ImageService {
  /**
   * Upload an image to S3
   * @param file The image file buffer
   * @param originalFilename Original filename for extension
   * @returns The URL of the uploaded image
   */
  async uploadImage(file: Buffer, originalFilename: string): Promise<string> {
    try {
      // Debug logging for bucket name
      console.log('DEBUG - Environment variables:');
      console.log('S3_BUCKET:', process.env.S3_BUCKET);
      console.log('Configured bucket name:', bucketName);
      
      // Log the operation we're attempting
      console.log(`Attempting to upload image: ${originalFilename} to S3 bucket: ${bucketName}`);
      
      const fileExtension = path.extname(originalFilename);
      const key = `menu-items/${uuidv4()}${fileExtension}`;

      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: file,
        ContentType: this.getContentType(fileExtension)
      };

      console.log(`S3 upload params:`, JSON.stringify(uploadParams, null, 2));
      
      // Attempt to upload to S3
      const result = await s3Client.send(new PutObjectCommand(uploadParams));
      console.log('S3 upload successful:', result);

      // Get the region from environment variables
      const region = process.env.S3_REGION || 'us-east-1';
      
      // Construct the S3 URL based on the region
      let imageUrl;
      if (region === 'us-east-1') {
        // Virtual-hosted style URL for us-east-1
        imageUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;
      } else {
        // Path-style URL for other regions
        imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      }
      
      console.log(`Generated S3 image URL: ${imageUrl}`);
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image to S3:', error);
      
      // More detailed error handling
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}, message: ${error.message}`);
        if ('$metadata' in error) {
          console.error(`AWS metadata:`, (error as any).$metadata);
        }
      }
      
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an image from S3
   * @param imageUrl The URL of the image to delete
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract the key from the URL more robustly
      const url = new URL(imageUrl);
      const key = url.pathname.substring(1); // Remove leading '/'

      if (!key) {
        throw new Error('Invalid S3 image URL, could not extract key');
      }

      const deleteParams = {
        Bucket: bucketName,
        Key: key
      };

      await s3Client.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
      console.error('Error deleting image from S3:', error);
      if (error instanceof Error && error.name === 'NoSuchKey') {
         console.warn(`Attempted to delete non-existent key: ${imageUrl}`);
         return;
      }
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Get the content type based on file extension
   */
  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };

    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}

export default new ImageService();
