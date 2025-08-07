# MongoDB Database Copy Guide

This guide explains how to create a complete copy of a MongoDB Atlas database, either to restore it back to the same database or to create a copy with a different name.

## Prerequisites

- MongoDB tools installed (`mongodump`, `mongorestore`)
- Connection string for MongoDB Atlas

## Connection String

```
mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority
```

## Step 1: Backup the Source Database

Create a complete backup of the database using `mongodump`:

```bash
# Set the connection string as an environment variable for security
export MONGO_URL="mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority"

# Create a backup directory with timestamp
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"

# Run mongodump to create the backup
mongodump --uri="$MONGO_URL" --out="./$BACKUP_DIR"

# Verify backup was created
echo "Backup created in directory: $BACKUP_DIR"
```

## Step 2: Verify the Backup Content

List the backup directory to verify all collections were backed up:

```bash
ls -la backup-*/inseat/
```

## Step 3: Restore to the Original Database (Optional)

If you need to restore the backup to the original database:

```bash
# Keep using the same connection string
export MONGO_URL="mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority"

# Restore the backup with --drop flag to replace existing collections
mongorestore --uri="$MONGO_URL" --nsInclude="inseat.*" --drop "./backup-YOUR_TIMESTAMP/inseat/"
```

## Step 4: Create a Copy with a Different Name

To create a copy of the database with a different name (e.g., "inseat-demo"):

```bash
# Update the connection string to point to the new database name
export MONGO_URL="mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat-demo?retryWrites=true&w=majority"

# Restore the backup with namespace mapping to rename the database
mongorestore --uri="$MONGO_URL" --nsFrom="inseat.*" --nsTo="inseat-demo.*" --drop "./backup-YOUR_TIMESTAMP/inseat/"
```

## Step 5: Verify the Copy

Verify that all collections were copied correctly:

```bash
# Connect to the new database and list collection counts
mongosh "mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat-demo" --eval 'db.getCollectionNames().forEach(function(c) { print(c + ": " + db[c].countDocuments()) })'
```

## Summary of Exact Commands Used

Here are the exact commands used in this process with timestamps:

```bash
# Create backup
export MONGO_URL="mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority" && BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)" && mongodump --uri="$MONGO_URL" --out="./$BACKUP_DIR" && echo "Backup created in directory: $BACKUP_DIR"

# Verify backup content
ls -la backup-20250506-215252/inseat/

# Restore to original database
export MONGO_URL="mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority" && mongorestore --uri="$MONGO_URL" --nsInclude="inseat.*" --drop "./backup-20250506-215252/inseat/"

# Create copy with different name (inseat-demo)
export MONGO_URL="mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat-demo?retryWrites=true&w=majority" && mongorestore --uri="$MONGO_URL" --nsFrom="inseat.*" --nsTo="inseat-demo.*" --drop "./backup-20250506-215252/inseat/"

# Verify the copy
mongosh "mongodb+srv://abenezer:YXVC8lBaPIcb2o3s@cluster0.oljifwd.mongodb.net/inseat-demo" --eval 'db.getCollectionNames().forEach(function(c) { print(c + ": " + db[c].countDocuments()) })'
```

Note: Replace "20250506-215252" with your actual backup timestamp directory.

