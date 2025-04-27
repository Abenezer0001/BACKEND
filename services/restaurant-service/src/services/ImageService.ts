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
      const fileExtension = path.extname(originalFilename);
      const key = `menu-items/${uuidv4()}${fileExtension}`;

      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: file,
        ContentType: this.getContentType(fileExtension)
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      // Return the S3 URL to the image
      // Construct the URL based on the region and bucket name
      const region = process.env.AWS_REGION || 'us-east-1';
      // Handle us-east-1 specifically as it doesn't require region in the hostname for older buckets
      // For consistency and future-proofing, including the region is generally safer.
      // Check AWS documentation for the most current S3 URL formats.
      // Example format: https://s3.<region>.amazonaws.com/<bucket-name>/<key>
      // Or for us-east-1: https://<bucket-name>.s3.amazonaws.com/<key>
      // Let's use the format that includes the region for broader compatibility.
      // However, the original snippet used the format without region, let's stick to that for now.
      return `https://${bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Error uploading image to S3:', error);
      throw new Error('Failed to upload image');
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
      // Check if the error is because the key doesn't exist (NotFoundError)
      // Depending on the SDK version, the error name might vary.
      // Log the specific error for debugging but throw a generic message.
      if (error instanceof Error && error.name === 'NoSuchKey') {
         console.warn(`Attempted to delete non-existent key: ${imageUrl}`);
         // Optionally, just return successfully if the object is already gone
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
      '.svg': 'image/svg+xml' // Added SVG
    };

    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}

export default new ImageService();