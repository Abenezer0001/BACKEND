#!/usr/bin/env node

// Comprehensive INSEAT Database Analysis Script
// This script analyzes the current state of the INSEAT database for analytics purposes

const { MongoClient } = require('mongodb');

const connectionString = 'mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat-db?retryWrites=true&w=majority&appName=Cluster0';

async function analyzeDatabase() {
    const client = new MongoClient(connectionString);
    
    try {
        await client.connect();
        const db = client.db('inseat-db');
        
        console.log('🔍 COMPREHENSIVE INSEAT DATABASE ANALYSIS\n');
        console.log('=' .repeat(60));
        
        // 1. Collection Overview
        console.log('\n📊 COLLECTION OVERVIEW');
        console.log('-'.repeat(40));
        const collections = await db.listCollections().toArray();
        const collectionStats = {};
        
        for (const collection of collections) {
            const count = await db.collection(collection.name).countDocuments();
            collectionStats[collection.name] = count;
            console.log(`${collection.name.padEnd(20)}: ${count.toString().padStart(6)} documents`);
        }
        
        // 2. Restaurant Analysis
        console.log('\n🏪 RESTAURANT ANALYSIS');
        console.log('-'.repeat(40));
        const restaurants = await db.collection('restaurants').find({}).toArray();
        console.log(`Total Restaurants: ${restaurants.length}`);
        
        const pizzaPalace = restaurants.find(r => r.name.toLowerCase().includes('pizza palace'));
        if (pizzaPalace) {
            console.log(`\n🍕 PIZZA PALACE DETAILS:`);
            console.log(`  ID: ${pizzaPalace._id}`);
            console.log(`  Business ID: ${pizzaPalace.businessId}`);
            console.log(`  Venues: ${pizzaPalace.venues ? pizzaPalace.venues.length : 0}`);
            console.log(`  Active: ${pizzaPalace.isActive || 'undefined'}`);
            console.log(`  Service Charge: ${pizzaPalace.service_charge ? pizzaPalace.service_charge.percentage + '%' : 'N/A'}`);
        }
        
        // 3. Menu Analysis for Pizza Palace
        console.log('\n🍽️ MENU ANALYSIS - PIZZA PALACE');
        console.log('-'.repeat(40));
        if (pizzaPalace) {
            const menuItems = await db.collection('menuitems').find({ restaurantId: pizzaPalace._id }).toArray();
            console.log(`Total Menu Items: ${menuItems.length}`);
            
            const categories = await db.collection('categories').find({ restaurantId: pizzaPalace._id }).toArray();
            console.log(`Categories: ${categories.length}`);
            categories.forEach(cat => {
                const itemsInCategory = menuItems.filter(item => 
                    item.categories && item.categories.includes(cat._id.toString())
                );
                console.log(`  - ${cat.name}: ${itemsInCategory.length} items`);
            });
            
            // Price analysis
            const prices = menuItems.map(item => item.price).filter(p => p && p > 0);
            if (prices.length > 0) {
                const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                console.log(`\n💰 PRICING ANALYSIS:`);
                console.log(`  Average Price: $${avgPrice.toFixed(2)}`);
                console.log(`  Price Range: $${minPrice} - $${maxPrice}`);
            }
        }
        
        // 4. Orders Analysis
        console.log('\n📋 ORDERS ANALYSIS');
        console.log('-'.repeat(40));
        const totalOrders = await db.collection('orders').countDocuments();
        console.log(`Total Orders: ${totalOrders}`);
        
        if (pizzaPalace) {
            const pizzaPalaceOrders = await db.collection('orders').find({ 
                restaurantId: pizzaPalace._id 
            }).toArray();
            console.log(`Pizza Palace Orders: ${pizzaPalaceOrders.length}`);
            
            // Order status distribution
            const statusDistribution = {};
            pizzaPalaceOrders.forEach(order => {
                statusDistribution[order.status] = (statusDistribution[order.status] || 0) + 1;
            });
            
            console.log('\n📊 ORDER STATUS DISTRIBUTION (Pizza Palace):');
            Object.entries(statusDistribution).forEach(([status, count]) => {
                console.log(`  ${status}: ${count}`);
            });
            
            // Revenue analysis
            const completedOrders = pizzaPalaceOrders.filter(o => 
                o.status === 'COMPLETED' || o.status === 'DELIVERED' || o.paymentStatus === 'paid'
            );
            const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            console.log(`\n💵 REVENUE ANALYSIS (Pizza Palace):`);
            console.log(`  Completed Orders: ${completedOrders.length}`);
            console.log(`  Total Revenue: $${totalRevenue.toFixed(2)}`);
            console.log(`  Average Order Value: $${completedOrders.length > 0 ? (totalRevenue / completedOrders.length).toFixed(2) : '0.00'}`);
        }
        
        // Date range analysis
        const orderDateRange = await db.collection('orders').aggregate([
            {
                $group: {
                    _id: null,
                    minDate: { $min: '$createdAt' },
                    maxDate: { $max: '$createdAt' }
                }
            }
        ]).toArray();
        
        if (orderDateRange.length > 0) {
            console.log(`\n📅 ORDER DATE RANGE:`);
            console.log(`  From: ${orderDateRange[0].minDate}`);
            console.log(`  To: ${orderDateRange[0].maxDate}`);
        }
        
        // 5. User Analysis
        console.log('\n👥 USER ANALYSIS');
        console.log('-'.repeat(40));
        const userRoles = await db.collection('users').aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();
        
        console.log('User Role Distribution:');
        userRoles.forEach(role => {
            console.log(`  ${role._id || 'undefined'}: ${role.count}`);
        });
        
        // 6. Ratings Analysis
        console.log('\n⭐ RATINGS ANALYSIS');
        console.log('-'.repeat(40));
        const totalRatings = await db.collection('ratings').countDocuments();
        console.log(`Total Ratings: ${totalRatings}`);
        
        const ratingDistribution = await db.collection('ratings').aggregate([
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();
        
        console.log('Rating Distribution:');
        let totalRatingValue = 0;
        let totalRatingCount = 0;
        ratingDistribution.forEach(rating => {
            console.log(`  ${rating._id} stars: ${rating.count} ratings`);
            totalRatingValue += rating._id * rating.count;
            totalRatingCount += rating.count;
        });
        
        const averageRating = totalRatingCount > 0 ? (totalRatingValue / totalRatingCount).toFixed(2) : '0.00';
        console.log(`Average Rating: ${averageRating} stars`);
        
        // 7. Payment Analysis
        console.log('\n💳 PAYMENT ANALYSIS');  
        console.log('-'.repeat(40));
        const paymentStats = await db.collection('payments').aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]).toArray();
        
        paymentStats.forEach(stat => {
            console.log(`  ${stat._id}: ${stat.count} payments, $${(stat.totalAmount || 0).toFixed(2)}`);
        });
        
        // 8. Analytics Readiness Assessment
        console.log('\n🎯 ANALYTICS READINESS ASSESSMENT');
        console.log('-'.repeat(40));
        
        const assessments = [
            { 
                category: 'Menu Data', 
                status: pizzaPalace && menuItems && menuItems.length > 10 ? '✅ Good' : '⚠️ Needs more items',
                details: pizzaPalace ? `${menuItems.length} items` : 'Restaurant not found'
            },
            { 
                category: 'Order Volume', 
                status: totalOrders > 50 ? '✅ Sufficient' : '⚠️ Low volume',
                details: `${totalOrders} total orders`
            },
            { 
                category: 'User Reviews', 
                status: totalRatings > 100 ? '✅ Good coverage' : '⚠️ More reviews needed',
                details: `${totalRatings} ratings`
            },
            { 
                category: 'Customer Data', 
                status: collectionStats.users > 50 ? '✅ Good base' : '⚠️ More customers needed',
                details: `${collectionStats.users} users`
            },
            { 
                category: 'Payment Data', 
                status: collectionStats.payments > 30 ? '✅ Sufficient' : '⚠️ More transactions needed',
                details: `${collectionStats.payments} payments`
            }
        ];
        
        assessments.forEach(assessment => {
            console.log(`${assessment.category.padEnd(15)}: ${assessment.status} (${assessment.details})`);
        });
        
        // 9. Data Gaps and Recommendations
        console.log('\n🔧 RECOMMENDATIONS FOR ANALYTICS IMPROVEMENT');
        console.log('-'.repeat(40));
        
        const recommendations = [];
        
        if (pizzaPalace && menuItems && menuItems.length < 20) {
            recommendations.push('• Add more menu items to Pizza Palace (target: 30-50 items)');
        }
        
        if (totalOrders < 200) {
            recommendations.push('• Generate more order data for trend analysis (target: 500+ orders)');
        }
        
        if (totalRatings < 500) {
            recommendations.push('• Seed more customer ratings and reviews (target: 1000+ ratings)');
        }
        
        if (collectionStats.customerloyalties < 10) {
            recommendations.push('• Create more customer loyalty data for segmentation analysis');
        }
        
        if (collectionStats.promotions < 5) {
            recommendations.push('• Add more promotion data to analyze campaign effectiveness');
        }
        
        const ordersLastWeek = await db.collection('orders').countDocuments({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });
        
        if (ordersLastWeek < 20) {
            recommendations.push('• Generate recent order data for current performance metrics');
        }
        
        if (recommendations.length === 0) {
            console.log('✅ Database appears ready for comprehensive analytics!');
        } else {
            recommendations.forEach(rec => console.log(rec));
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📈 ANALYSIS COMPLETE');
        
    } catch (error) {
        console.error('❌ Error analyzing database:', error);
    } finally {
        await client.close();
    }
}

// Run the analysis
analyzeDatabase().catch(console.error);