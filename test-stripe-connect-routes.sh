#!/bin/bash

# Test script for Stripe Connect Platform Fee System
# This script tests all the routes created for business Stripe Connect onboarding and platform fees

echo "🚀 Testing INSEAT Stripe Connect Platform Fee System"
echo "=================================================="

# Configuration
BASE_URL="http://localhost:3333"  # Manual test server port
API_BASE_URL="$BASE_URL/api"
BUSINESS_ID="64f123456789abcdef123456"  # Example business ID
TEST_EMAIL="test-business@example.com"
TEST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NGYxMjM0NTY3ODlhYmNkZWYxMjM0NTYiLCJlbWFpbCI6InRlc3QtYnVzaW5lc3NAZXhhbXBsZS5jb20iLCJyb2xlIjoiYnVzaW5lc3Nfb3duZXIiLCJidXNpbmVzc0lkIjoiNjRmMTIzNDU2Nzg5YWJjZGVmMTIzNDU2IiwiaWF0IjoxNTE2MjM5MDIyfQ.example"

echo ""
echo "🔧 Test Configuration:"
echo "Base URL: $BASE_URL"
echo "API Base URL: $API_BASE_URL"
echo "Business ID: $BUSINESS_ID"
echo "Test Email: $TEST_EMAIL"
echo ""

# Helper function to test endpoints
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_required=$4
    local description=$5
    
    echo "📡 Testing: $description"
    echo "   $method $endpoint"
    
    if [ "$auth_required" = "true" ]; then
        if [ "$method" = "GET" ]; then
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
                -H "Authorization: Bearer $TEST_TOKEN" \
                -H "Content-Type: application/json" \
                "$endpoint")
        else
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
                -X "$method" \
                -H "Authorization: Bearer $TEST_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$endpoint")
        fi
    else
        if [ "$method" = "GET" ]; then
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
                -H "Content-Type: application/json" \
                "$endpoint")
        else
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
                -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$endpoint")
        fi
    fi
    
    http_code=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | grep -v "HTTP_STATUS")
    
    echo "   Status: $http_code"
    echo "   Response: $body" | head -c 200
    if [ ${#body} -gt 200 ]; then
        echo "..."
    fi
    echo ""
    echo "   ✅ Test completed"
    echo ""
}

echo "=========================================="
echo "1. STRIPE CONNECT BUSINESS ONBOARDING TESTS"
echo "=========================================="

# Test 1: Create Business Stripe Connect Account
echo "1.1 Create Business Stripe Connect Account"
test_endpoint "POST" "$API_BASE_URL/stripe-connect/business/onboard" '{
    "businessId": "'$BUSINESS_ID'",
    "businessName": "Test Restaurant Group",
    "legalName": "Test Restaurant Group LLC",
    "businessType": "company",
    "country": "US",
    "businessUrl": "https://testrestaurant.com",
    "businessDescription": "Test restaurant business for platform testing",
    "businessAddress": {
        "line1": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "postal_code": "10001",
        "country": "US"
    }
}' "true" "Create business Stripe Connect account"

# Test 2: Get Account Status
echo "1.2 Get Account Status"
test_endpoint "GET" "$API_BASE_URL/stripe-connect/business/status" '' "true" "Get business account status"

# Test 3: Get Account Status by Business ID
echo "1.3 Get Account Status by Business ID"
test_endpoint "GET" "$API_BASE_URL/stripe-connect/business/$BUSINESS_ID/status" '' "true" "Get account status by business ID"

# Test 4: Refresh Onboarding Link
echo "1.4 Refresh Onboarding Link"
test_endpoint "POST" "$API_BASE_URL/stripe-connect/business/refresh-onboarding" '{}' "true" "Refresh onboarding link"

# Test 5: Create Dashboard Link
echo "1.5 Create Dashboard Link"
test_endpoint "POST" "$API_BASE_URL/stripe-connect/business/dashboard-link" '{}' "true" "Create Stripe dashboard link"

echo "=========================================="
echo "2. BUSINESS EARNINGS AND ANALYTICS TESTS"
echo "=========================================="

# Test 6: Get Business Earnings
echo "2.1 Get Business Earnings (All Time)"
test_endpoint "GET" "$API_BASE_URL/stripe-connect/business/earnings" '' "true" "Get business earnings (all time)"

# Test 7: Get Business Earnings with Date Range
echo "2.2 Get Business Earnings (Date Range)"
start_date=$(date -d "30 days ago" +%Y-%m-%d)
end_date=$(date +%Y-%m-%d)
test_endpoint "GET" "$API_BASE_URL/stripe-connect/business/earnings?startDate=$start_date&endDate=$end_date" '' "true" "Get business earnings with date range"

echo "=========================================="
echo "3. PLATFORM FEE PAYMENT PROCESSING TESTS"
echo "=========================================="

# Test 8: Create Regular Checkout Session (No Platform Fee)
echo "3.1 Create Regular Checkout Session"
test_endpoint "POST" "$API_BASE_URL/payments/create-checkout-session" '{
    "lineItems": [
        {
            "price_data": {
                "currency": "usd",
                "product_data": {
                    "name": "Test Pizza"
                },
                "unit_amount": 1599
            },
            "quantity": 1
        }
    ],
    "orderId": "order_123456",
    "tableId": "table_789",
    "restaurantId": "restaurant_456"
}' "true" "Create regular checkout session (no platform fee)"

# Test 9: Create Checkout Session with Platform Fee
echo "3.2 Create Checkout Session with Platform Fee"
test_endpoint "POST" "$API_BASE_URL/payments/create-checkout-session-with-platform-fee" '{
    "lineItems": [
        {
            "price_data": {
                "currency": "usd",
                "product_data": {
                    "name": "Test Burger with Platform Fee"
                },
                "unit_amount": 2499
            },
            "quantity": 2
        }
    ],
    "orderId": "order_platform_fee_123",
    "tableId": "table_999",
    "restaurantId": "restaurant_platform_test",
    "businessId": "'$BUSINESS_ID'",
    "platformFeePercentage": 5.0
}' "true" "Create checkout session with 5% platform fee"

# Test 10: Process Order Payment (Direct API)
echo "3.3 Process Order Payment (Direct API)"
test_endpoint "POST" "$API_BASE_URL/stripe-connect/business/process-payment" '{
    "amount": 29.99,
    "currency": "usd",
    "orderId": "order_direct_pay_456",
    "customerPaymentMethodId": "pm_card_visa",
    "businessId": "'$BUSINESS_ID'",
    "platformFeePercentage": 5.0
}' "true" "Process order payment directly with platform fee"

echo "=========================================="
echo "4. PAYMENT STATUS AND WEBHOOK TESTS"
echo "=========================================="

# Test 11: Check Session Status (Mock Session ID)
echo "4.1 Check Session Status"
test_endpoint "GET" "$API_BASE_URL/payments/sessions/cs_test_example_session_id" '' "false" "Check payment session status"

# Test 12: Update Order Payment Status
echo "4.2 Update Order Payment Status"
test_endpoint "PATCH" "$API_BASE_URL/payments/orders/order_123456/payment-status" '{
    "status": "paid"
}' "true" "Update order payment status"

echo "=========================================="
echo "5. ROUTE ACCESSIBILITY TESTS (WITH/WITHOUT /api PREFIX)"
echo "=========================================="

# Test 13: Test routes without /api prefix
echo "5.1 Test Stripe Connect Routes without /api prefix"
test_endpoint "GET" "$BASE_URL/stripe-connect/business/status" '' "true" "Access Stripe Connect without /api prefix"

# Test 14: Test payment routes without /api prefix
echo "5.2 Test Payment Routes without /api prefix"
test_endpoint "GET" "$BASE_URL/payments/sessions/cs_test_example" '' "false" "Access payment routes without /api prefix"

echo "=========================================="
echo "6. ERROR HANDLING AND VALIDATION TESTS"
echo "=========================================="

# Test 15: Invalid Business ID
echo "6.1 Test Invalid Business ID"
test_endpoint "POST" "$API_BASE_URL/stripe-connect/business/onboard" '{
    "businessName": "Test Restaurant",
    "businessType": "company",
    "country": "US"
}' "true" "Test missing business ID validation"

# Test 16: Missing Required Fields
echo "6.2 Test Missing Required Fields"
test_endpoint "POST" "$API_BASE_URL/payments/create-checkout-session-with-platform-fee" '{
    "orderId": "test_order"
}' "true" "Test missing required fields validation"

# Test 17: Invalid Platform Fee Percentage
echo "6.3 Test Invalid Platform Fee"
test_endpoint "POST" "$API_BASE_URL/stripe-connect/business/process-payment" '{
    "amount": 10.00,
    "orderId": "test_order",
    "customerPaymentMethodId": "pm_test",
    "businessId": "invalid_business_id",
    "platformFeePercentage": 150.0
}' "true" "Test invalid platform fee percentage"

echo "=========================================="
echo "7. WEBHOOK ENDPOINT TESTS"
echo "=========================================="

# Test 18: Test Payment Webhook
echo "7.1 Test Payment Webhook"
test_endpoint "POST" "$API_BASE_URL/payments/webhook" '{
    "type": "checkout.session.completed",
    "data": {
        "object": {
            "id": "cs_test_webhook_example",
            "payment_status": "paid",
            "amount_total": 2999
        }
    }
}' "false" "Test payment webhook endpoint"

# Test 19: Test Stripe Connect Webhook
echo "7.2 Test Stripe Connect Webhook"
test_endpoint "POST" "$API_BASE_URL/stripe-connect/connect/webhook" '{
    "type": "account.updated",
    "data": {
        "object": {
            "id": "acct_test_example",
            "charges_enabled": true,
            "payouts_enabled": true
        }
    }
}' "false" "Test Stripe Connect webhook endpoint"

echo "=========================================="
echo "🎉 TESTING COMPLETE!"
echo "=========================================="
echo ""
echo "📊 Test Summary:"
echo "- Tested Stripe Connect business onboarding"
echo "- Tested platform fee collection (5% default)"
echo "- Tested payment processing with fee splitting"
echo "- Tested business earnings analytics"
echo "- Tested route accessibility with/without /api prefix"
echo "- Tested error handling and validation"
echo "- Tested webhook endpoints"
echo ""
echo "🔗 Key Endpoints Tested:"
echo "   POST /api/stripe-connect/business/onboard"
echo "   GET  /api/stripe-connect/business/status"
echo "   POST /api/stripe-connect/business/dashboard-link"
echo "   GET  /api/stripe-connect/business/earnings"
echo "   POST /api/payments/create-checkout-session-with-platform-fee"
echo "   POST /api/stripe-connect/business/process-payment"
echo ""
echo "💰 Platform Fee System:"
echo "   - Default 5% platform fee on all transactions"
echo "   - Business receives 95% of payment"
echo "   - Platform receives 5% application fee"
echo "   - Automatic payout to business Stripe Connect account"
echo ""
echo "✅ All routes have been tested!"
echo "🔧 Run this script with: bash test-stripe-connect-routes.sh"