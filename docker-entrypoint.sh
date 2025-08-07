#!/bin/sh
set -e

# Print S3 configuration status (without exposing secrets)
echo "S3 Configuration:"
echo "- AWS_ACCESS_KEY_ID is set: $(if [ -n "$AWS_ACCESS_KEY_ID" ]; then echo "YES"; else echo "NO"; fi)"
echo "- AWS_SECRET_ACCESS_KEY is set: $(if [ -n "$AWS_SECRET_ACCESS_KEY" ]; then echo "YES"; else echo "NO"; fi)"
echo "- S3_REGION is set: $(if [ -n "$S3_REGION" ]; then echo "YES ($S3_REGION)"; else echo "NO"; fi)"
echo "- S3_BUCKET is set: $(if [ -n "$S3_BUCKET" ]; then echo "YES ($S3_BUCKET)"; else echo "NO"; fi)"

# Create S3 bucket if it doesn't exist
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ] && [ -n "$S3_BUCKET" ]; then
    echo "Checking if S3 bucket exists: $S3_BUCKET"
    
    # Set default region if not specified
    if [ -z "$S3_REGION" ]; then
        export S3_REGION="us-east-1"
        echo "S3_REGION not set, defaulting to: us-east-1"
    fi
    
    # Configure AWS credentials
    aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
    aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
    aws configure set region "$S3_REGION"
    
    # Check if bucket exists
    if ! aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
        echo "S3 bucket '$S3_BUCKET' does not exist. Creating..."
        if [ "$S3_REGION" = "us-east-1" ]; then
            aws s3api create-bucket --bucket "$S3_BUCKET"
        else
            aws s3api create-bucket --bucket "$S3_BUCKET" --create-bucket-configuration LocationConstraint="$S3_REGION"
        fi
        
        # Configure CORS for the bucket
        echo "Configuring CORS for S3 bucket..."
        if [ -f "/app/cors.json" ]; then
            aws s3api put-bucket-cors --bucket "$S3_BUCKET" --cors-configuration file:///app/cors.json
            echo "CORS configuration applied from /app/cors.json"
        else
            echo "CORS configuration file not found at /app/cors.json"
        fi
    else
        echo "S3 bucket '$S3_BUCKET' exists and is accessible."
        # Update CORS configuration
        if [ -f "/app/cors.json" ]; then
            echo "Updating CORS configuration for S3 bucket..."
            aws s3api put-bucket-cors --bucket "$S3_BUCKET" --cors-configuration file:///app/cors.json
            echo "CORS configuration updated"
        fi
    fi
else
    echo "WARNING: Missing AWS credentials or bucket name. S3 operations may fail."
fi

# Start the application
exec ts-node -r tsconfig-paths/register ./src/app.ts
