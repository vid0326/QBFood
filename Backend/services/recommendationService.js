import orderModel from '../models/orderModel.js';
import foodModel from '../models/foodModel.js';
import userModel from '../models/userModel.js';
import restaurantModel from '../models/restaurantModel.js';

export const getPersonalizedRecommendations = async (userId, lat, lng, maxDistance = 15000) => {
    try {
        // 1. Fetch User Data
        const user = await userModel.findById(userId);
        if (!user) return [];

        const orders = await orderModel.find({ userId });
        
        // 2. Extract preferences (Categories)
        const categoryCounts = {};

        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.category) {
                    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
                }
            });
        });

        // Get top 3 categories the user orders from
        const topCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]).slice(0, 3);

        // 3. Find nearby restaurants using Geospatial queries
        let restaurantQuery = {};
        if (lat && lng) {
            restaurantQuery.location = {
                $near: {
                    $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                    $maxDistance: parseInt(maxDistance)
                }
            };
        }
        // If lat/lng not provided, this just finds all restaurants.
        const nearbyRestaurants = await restaurantModel.find(restaurantQuery).select('_id');
        const nearbyRestaurantIds = nearbyRestaurants.map(r => r._id);

        // 4. Query Food Model for Recommendations
        let foodQuery = {
            restaurantId: { $in: nearbyRestaurantIds }
        };

        // If they have order history, filter by their favorite categories
        if (topCategories.length > 0) {
            foodQuery.category = { $in: topCategories };
        }

        // Return up to 10 recommended items
        const recommendations = await foodModel.find(foodQuery).limit(10);
        
        // If we didn't find enough recommendations based on category, fetch random items from nearby
        if (recommendations.length < 5) {
             const genericRecs = await foodModel.find({ restaurantId: { $in: nearbyRestaurantIds } }).limit(10 - recommendations.length);
             return [...recommendations, ...genericRecs];
        }

        return recommendations;

    } catch (error) {
        console.error("Error in recommendation service:", error);
        return [];
    }
}

export const getTrendingItems = async (lat, lng, maxDistance = 15000) => {
    try {
        // 1. Find nearby restaurants
        let restaurantQuery = {};
        if (lat && lng) {
            restaurantQuery.location = {
                $near: {
                    $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                    $maxDistance: parseInt(maxDistance)
                }
            };
        }
        const nearbyRestaurants = await restaurantModel.find(restaurantQuery).select('_id');
        const nearbyRestaurantIds = nearbyRestaurants.map(r => r._id);

        // 2. Fetch generic "trending" items (In production, this would use MongoDB Aggregation pipelines to count most ordered food items)
        const trending = await foodModel.find({ restaurantId: { $in: nearbyRestaurantIds } }).limit(10);
        return trending;

    } catch (error) {
        console.error("Error in trending service:", error);
        return [];
    }
}
