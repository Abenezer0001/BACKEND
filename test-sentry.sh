#!/bin/bash

echo "🧪 Testing Sentry Integration for INSEAT-Backend"
echo "================================================"

# Check if server is running
echo "📍 Checking if server is running..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Server is running on port 3001"
else
    echo "❌ Server is not running. Please start with: npm start"
    exit 1
fi

echo ""
echo "🚨 Testing Basic Error (this should trigger a Sentry alert)..."
curl -X GET http://localhost:3001/api/test/sentry-error
echo ""
echo ""

echo "🚨 Testing Async Error (this should trigger a Sentry alert)..."
curl -X GET http://localhost:3001/api/test/sentry-async-error
echo ""
echo ""

echo "🚨 Testing Custom Error with Context (this should trigger a Sentry alert with user data)..."
curl -X GET http://localhost:3001/api/test/sentry-custom-error
echo ""
echo ""

echo "✅ All test requests sent!"
echo ""
echo "🔍 Now check your Sentry dashboard at:"
echo "   👉 https://achievengine.sentry.io/issues/"
echo ""
echo "You should see 3 new error reports within a few seconds."
echo "Look for errors with these messages:"
echo "   • 'This is a test error for Sentry monitoring!'"
echo "   • 'This is a test async error for Sentry monitoring!'"
echo "   • 'Custom test error with context and tags!'" 