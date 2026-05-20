import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';

import userModel from './models/userModel.js';
import restaurantModel from './models/restaurantModel.js';
import foodModel from './models/foodModel.js';
import deliveryAgentModel from './models/deliveryAgentModel.js';
import reviewModel from './models/reviewModel.js';
import couponModel from './models/couponModel.js';

const seedDatabase = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_DBurl);
        console.log("Connected to Database!");

        console.log("Clearing existing database collections...");
        await userModel.deleteMany({});
        await restaurantModel.deleteMany({});
        await foodModel.deleteMany({});
        await deliveryAgentModel.deleteMany({});
        await reviewModel.deleteMany({});
        await couponModel.deleteMany({});
        console.log("Collections cleared!");

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("12345678", salt);

        console.log("Creating Users (Customers, Vendors, Drivers, Admins)...");
        
        const customer = {
            name: "Customer John",
            email: "customer@quickbite.com",
            password: hashedPassword,
            role: "customer",
            addresses: [{
                label: "Home",
                street: "Duncan Basti",
                city: "Dimapur",
                state: "Nagaland",
                zipCode: "797112",
                country: "India"
            }],
            currentLocation: { type: "Point", coordinates: [93.7270, 25.9061] }
        };

        const admin = {
            name: "Super Admin",
            email: "admin@quickbite.com",
            password: hashedPassword,
            role: "admin",
            addresses: [],
            currentLocation: { type: "Point", coordinates: [93.7270, 25.9061] }
        };

        const driverUser = {
            name: "Delivery Agent A",
            email: "driver@quickbite.com",
            password: hashedPassword,
            role: "delivery",
            addresses: [],
            currentLocation: { type: "Point", coordinates: [93.7270, 25.9061] }
        };

        const totalVendors = 18;
        const vendors = [];
        for(let i=1; i<=totalVendors; i++) {
            const lng = 93.7270 + (i * (93.7844 - 93.7270) / totalVendors);
            const lat = 25.9061 + (i * (25.8276 - 25.9061) / totalVendors);
            vendors.push({
                name: `Vendor ${i}`,
                email: `vendor${i}@quickbite.com`,
                password: hashedPassword,
                role: "restaurant_owner",
                addresses: [{
                    label: `Work ${i}`,
                    street: `Street ${i}`,
                    city: i <= (totalVendors/2) ? "Dimapur" : "Chumoukedima",
                    state: "Nagaland",
                    zipCode: "797112",
                    country: "India"
                }],
                currentLocation: { type: "Point", coordinates: [lng, lat] }
            });
        }

        const createdUsers = await userModel.insertMany([customer, admin, driverUser, ...vendors]);
        const vendorDocs = createdUsers.slice(3);
        const driverDoc = createdUsers[2];

        console.log("Creating 18 Restaurants...");
        const restaurantsData = [
            { name: "Bihari Zaika", description: "Authentic Bihari cuisine.", ownerId: vendorDocs[0]._id, address: { city: "Dimapur", street: "Duncan Basti", state: "Nagaland", zipCode: "797112", country: "India" }, location: { type: "Point", coordinates: [93.7270, 25.9061] }, rating: 4.5, cuisineTypes: ["Bihari", "North Indian"], bannerImage: "bihari_zaika_banner.png", isActive: true },
            { name: "Royal Rajasthani", description: "Traditional Dal Bati Churma.", ownerId: vendorDocs[1]._id, address: { city: "Dimapur", street: "Super Market", state: "Nagaland", zipCode: "797112", country: "India" }, location: { type: "Point", coordinates: [93.7350, 25.8980] }, rating: 4.8, cuisineTypes: ["Rajasthani", "Thali"], bannerImage: "royal_rajasthani_banner.png", isActive: true },
            { name: "Sonar Bangla", description: "Traditional Bengali fish curry and rasgulla.", ownerId: vendorDocs[2]._id, address: { city: "Dimapur", street: "Nagarjan", state: "Nagaland", zipCode: "797112", country: "India" }, location: { type: "Point", coordinates: [93.7550, 25.8750] }, rating: 4.6, cuisineTypes: ["Bengali", "Seafood"], bannerImage: "sonar_bangla_banner.png", isActive: true },
            { name: "Naga Kitchen", description: "Spicy & traditional Naga delicacies.", ownerId: vendorDocs[3]._id, address: { city: "Chumoukedima", street: "Ward 4", state: "Nagaland", zipCode: "797103", country: "India" }, location: { type: "Point", coordinates: [93.7750, 25.8500] }, rating: 4.9, cuisineTypes: ["Naga", "Traditional"], bannerImage: "header_img.png", isActive: true },
            { name: "The Veg Salad Bowl", description: "Fresh and healthy pure veg salads.", ownerId: vendorDocs[4]._id, address: { city: "Dimapur", street: "Circular Rd", state: "Nagaland", zipCode: "797112", country: "India" }, location: { type: "Point", coordinates: [93.7300, 25.9020] }, rating: 4.8, cuisineTypes: ["Salad", "Healthy"], bannerImage: "header_img.png", isActive: true },
            { name: "Sandwich Haven", description: "Delicious grilled and vegan sandwiches.", ownerId: vendorDocs[5]._id, address: { city: "Dimapur", street: "Half Nagarjan", state: "Nagaland", zipCode: "797112", country: "India" }, location: { type: "Point", coordinates: [93.7500, 25.8800] }, rating: 4.5, cuisineTypes: ["Sandwich", "Fast Food"], bannerImage: "header_img.png", isActive: true },
            { name: "Subway Bites", description: "Premium chicken and bread sandwiches.", ownerId: vendorDocs[6]._id, address: { city: "Dimapur", street: "Purana Bazar", state: "Nagaland", zipCode: "797112", country: "India" }, location: { type: "Point", coordinates: [93.7400, 25.8900] }, rating: 4.4, cuisineTypes: ["Sandwich"], bannerImage: "header_img.png", isActive: true },
            { name: "Cake Walk", description: "Specialty cakes and vegan cakes.", ownerId: vendorDocs[7]._id, address: { city: "Chumoukedima", street: "Ward 1", state: "Nagaland", zipCode: "797103", country: "India" }, location: { type: "Point", coordinates: [93.7600, 25.8700] }, rating: 4.9, cuisineTypes: ["Cake", "Dessert"], bannerImage: "header_img.png", isActive: true },
            { name: "Sweet Tooth Bakery", description: "Cakes, pastries and chocolate waffles.", ownerId: vendorDocs[8]._id, address: { city: "Chumoukedima", street: "Ward 2", state: "Nagaland", zipCode: "797103", country: "India" }, location: { type: "Point", coordinates: [93.7650, 25.8650] }, rating: 4.7, cuisineTypes: ["Cake", "Waffles"], bannerImage: "header_img.png", isActive: true },
            { name: "Dimapur Burgers", description: "Juicy chicken and veg burgers. 100% no beef.", ownerId: vendorDocs[9]._id, address: { city: "Dimapur", street: "City Tower", state: "Nagaland", zipCode: "797112", country: "India" }, location: { type: "Point", coordinates: [93.7310, 25.9010] }, rating: 4.5, cuisineTypes: ["Burger", "Fast Food"], bannerImage: "header_img.png", isActive: true },
            { name: "Cluck Cluck", description: "Best crispy fried chicken in town.", ownerId: vendorDocs[10]._id, address: { city: "Chumoukedima", street: "Ward 3", state: "Nagaland", zipCode: "797103", country: "India" }, location: { type: "Point", coordinates: [93.7700, 25.8600] }, rating: 4.6, cuisineTypes: ["Fried Chicken"], bannerImage: "header_img.png", isActive: true },
            { name: "Crunchy Bird", description: "Fried chicken popcorn and drumsticks.", ownerId: vendorDocs[11]._id, address: { city: "Chumoukedima", street: "Ward 5", state: "Nagaland", zipCode: "797103", country: "India" }, location: { type: "Point", coordinates: [93.7800, 25.8400] }, rating: 4.8, cuisineTypes: ["Fried Chicken"], bannerImage: "header_img.png", isActive: true },
            { name: "Fresh Picks", description: "Fresh healthy fruit bowls and salads.", ownerId: vendorDocs[12]._id, address: { city: "Dimapur", street: "Walford", state: "Nagaland", zipCode: "797112", country: "India" }, location: { type: "Point", coordinates: [93.7450, 25.8850] }, rating: 4.9, cuisineTypes: ["Fruits", "Healthy"], bannerImage: "header_img.png", isActive: true },
            { name: "Morning Delight", description: "Classic and berry waffles.", ownerId: vendorDocs[13]._id, address: { city: "Chumoukedima", street: "Highway", state: "Nagaland", zipCode: "797103", country: "India" }, location: { type: "Point", coordinates: [93.7844, 25.8276] }, rating: 4.8, cuisineTypes: ["Waffles", "Dessert"], bannerImage: "header_img.png", isActive: true },
            
            // Re-added categories
            { name: "Pizza Paradise", description: "Wood fired veg and chicken pizzas.", ownerId: vendorDocs[14]._id, address: { city: "Dimapur", street: "Central Rd", state: "Nagaland", zipCode: "797112", country: "India" }, location: { type: "Point", coordinates: [93.7410, 25.8910] }, rating: 4.5, cuisineTypes: ["Pizza"], bannerImage: "header_img.png", isActive: true },
            { name: "Hyderabadi House", description: "Authentic chicken biryani.", ownerId: vendorDocs[15]._id, address: { city: "Chumoukedima", street: "Ward 6", state: "Nagaland", zipCode: "797103", country: "India" }, location: { type: "Point", coordinates: [93.7710, 25.8610] }, rating: 4.8, cuisineTypes: ["Biryani"], bannerImage: "header_img.png", isActive: true },
            { name: "Tokyo Bites", description: "Fresh vegetarian and chicken sushi.", ownerId: vendorDocs[16]._id, address: { city: "Dimapur", street: "Midland", state: "Nagaland", zipCode: "797112", country: "India" }, location: { type: "Point", coordinates: [93.7480, 25.8820] }, rating: 4.7, cuisineTypes: ["Sushi"], bannerImage: "header_img.png", isActive: true },
            { name: "Fit Foods", description: "Nutritious healthy bowls.", ownerId: vendorDocs[17]._id, address: { city: "Chumoukedima", street: "Ward 7", state: "Nagaland", zipCode: "797103", country: "India" }, location: { type: "Point", coordinates: [93.7780, 25.8420] }, rating: 4.9, cuisineTypes: ["Healthy Bowl"], bannerImage: "header_img.png", isActive: true }
        ];

        const createdRestaurants = await restaurantModel.insertMany(restaurantsData);
        console.log("Restaurants created successfully!");

        console.log("Creating Food Items linked to Restaurants...");
        const foodItems = [
            // Bihari Zaika (Pure Veg / Curry)
            { name: "Litti Chokha", description: "Roasted wheat balls stuffed with sattu.", price: 150, image: "litti_chokha.png", category: "Pure Veg", restaurantId: createdRestaurants[0]._id, dietaryTags: ["Veg"] },
            { name: "Sattu Paratha", description: "Paratha stuffed with spiced roasted gram flour.", price: 80, image: "sattu_paratha.png", category: "Pure Veg", restaurantId: createdRestaurants[0]._id, dietaryTags: ["Veg"] },

            // Royal Rajasthani (Pure Veg / Curry)
            { name: "Dal Bati Churma", description: "Traditional Rajasthani dish with lentils.", price: 300, image: "dal_bati.png", category: "Pure Veg", restaurantId: createdRestaurants[1]._id, dietaryTags: ["Veg"] },
            { name: "Gatte Ki Sabzi", description: "Gram flour dumplings in a spicy yogurt curry.", price: 200, image: "gatte_ki_sabzi.png", category: "Curry", restaurantId: createdRestaurants[1]._id, dietaryTags: ["Veg"] },

            // Sonar Bangla (Curry / Dessert)
            { name: "Machher Jhol", description: "Traditional Bengali fish curry.", price: 250, image: "machher_jhol.png", category: "Curry", restaurantId: createdRestaurants[2]._id, dietaryTags: ["Non-Veg"] },
            { name: "Rosogolla", description: "Spongy cottage cheese balls in sugar syrup.", price: 100, image: "rosogolla.png", category: "Dessert", restaurantId: createdRestaurants[2]._id, dietaryTags: ["Veg"] },

            // Naga Kitchen (Curry) - No Pork! Replaced with Chicken
            { name: "Axone Chicken", description: "Chicken cooked with fermented soybean.", price: 280, image: "food_16.png", category: "Curry", restaurantId: createdRestaurants[3]._id, dietaryTags: ["Non-Veg"] },
            { name: "Bamboo Shoot Chicken", description: "Chicken with fresh bamboo shoots.", price: 260, image: "food_15.png", category: "Curry", restaurantId: createdRestaurants[3]._id, dietaryTags: ["Non-Veg"] },

            // The Veg Salad Bowl (Salad) - STRICTLY VEG SALAD
            { name: "Veg Salad", description: "Fresh and healthy pure veg salad with organic greens.", price: 120, image: "food_2.png", category: "Salad", restaurantId: createdRestaurants[4]._id, dietaryTags: ["Veg", "Vegan"] },

            // Sandwich Haven (Sandwich)
            { name: "Grilled Sandwich", description: "Toasted and grilled sandwich loaded with veggies.", price: 100, image: "food_15.png", category: "Sandwich", restaurantId: createdRestaurants[5]._id, dietaryTags: ["Veg"] },
            { name: "Vegan Sandwich", description: "Healthy vegan sandwich.", price: 150, image: "food_14.png", category: "Sandwich", restaurantId: createdRestaurants[5]._id, dietaryTags: ["Veg", "Vegan"] },

            // Subway Bites (Sandwich)
            { name: "Chicken Sandwich", description: "Freshly made chicken sandwich.", price: 180, image: "food_13.png", category: "Sandwich", restaurantId: createdRestaurants[6]._id, dietaryTags: ["Non-Veg"] },
            { name: "Bread Sandwich", description: "Classic simple bread sandwich.", price: 80, image: "food_16.png", category: "Sandwich", restaurantId: createdRestaurants[6]._id, dietaryTags: ["Veg"] },

            // Cake Walk (Cake)
            { name: "Butterscotch Cake", description: "Freshly baked butterscotch cake.", price: 400, image: "food_19.png", category: "Cake", restaurantId: createdRestaurants[7]._id, dietaryTags: ["Veg"] },
            { name: "Vegan Cake", description: "Delicious vegan friendly cake.", price: 350, image: "food_18.png", category: "Cake", restaurantId: createdRestaurants[7]._id, dietaryTags: ["Veg", "Vegan"] },

            // Sweet Tooth Bakery (Cake & Waffles)
            { name: "Chocolate Cup Cake", description: "Delicious rich chocolate cupcake.", price: 90, image: "food_17.png", category: "Cake", restaurantId: createdRestaurants[8]._id, dietaryTags: ["Veg"] },
            { name: "Sliced Cake", description: "A perfect slice of vanilla cake.", price: 60, image: "food_20.png", category: "Cake", restaurantId: createdRestaurants[8]._id, dietaryTags: ["Veg"] },
            { name: "Chocolate Waffle", description: "Hot waffle dripping with chocolate syrup.", price: 140, image: "menu_17.png", category: "Waffles", restaurantId: createdRestaurants[8]._id, dietaryTags: ["Veg"] },

            // Dimapur Burgers (Burger) - NO BEEF!
            { name: "Chicken Burger", description: "Juicy chicken patty with cheese.", price: 180, image: "menu_9.png", category: "Burger", restaurantId: createdRestaurants[9]._id, dietaryTags: ["Non-Veg"] },
            { name: "Veg Burger", description: "Crispy veg patty with mayo and lettuce.", price: 120, image: "menu_9.png", category: "Burger", restaurantId: createdRestaurants[9]._id, dietaryTags: ["Veg"] },

            // Cluck Cluck (Fried Chicken)
            { name: "Crispy Fried Chicken", description: "Perfectly seasoned crispy fried chicken.", price: 250, image: "menu_10.png", category: "Fried Chicken", restaurantId: createdRestaurants[10]._id, dietaryTags: ["Non-Veg"] },
            { name: "Spicy Wings", description: "Hot and spicy chicken wings.", price: 220, image: "menu_10.png", category: "Fried Chicken", restaurantId: createdRestaurants[10]._id, dietaryTags: ["Non-Veg"] },

            // Crunchy Bird (Fried Chicken)
            { name: "Chicken Popcorn", description: "Bite-sized fried chicken pieces.", price: 180, image: "menu_10.png", category: "Fried Chicken", restaurantId: createdRestaurants[11]._id, dietaryTags: ["Non-Veg"] },
            { name: "Drumsticks", description: "Fried chicken drumsticks.", price: 240, image: "menu_10.png", category: "Fried Chicken", restaurantId: createdRestaurants[11]._id, dietaryTags: ["Non-Veg"] },

            // Fresh Picks (Fruits)
            { name: "Fresh Fruit Bowl", description: "Assorted seasonal fresh fruits.", price: 150, image: "menu_18.png", category: "Fruits", restaurantId: createdRestaurants[12]._id, dietaryTags: ["Veg", "Vegan"] },
            { name: "Mixed Fruit Salad", description: "Chopped fruits with a dash of honey.", price: 180, image: "menu_18.png", category: "Fruits", restaurantId: createdRestaurants[12]._id, dietaryTags: ["Veg", "Vegan"] },

            // Morning Delight (Waffles)
            { name: "Classic Waffle", description: "Classic waffle with maple syrup and butter.", price: 120, image: "menu_17.png", category: "Waffles", restaurantId: createdRestaurants[13]._id, dietaryTags: ["Veg"] },
            { name: "Berry Waffle", description: "Waffle topped with fresh berries and cream.", price: 160, image: "menu_17.png", category: "Waffles", restaurantId: createdRestaurants[13]._id, dietaryTags: ["Veg"] },
            
            // Re-added Categories Food Items (Pizza, Biryani, Sushi, Healthy Bowl) - NO BEEF/PORK/STEAK
            { name: "Margherita Pizza", description: "Classic cheese and tomato pizza.", price: 250, image: "menu_11.png", category: "Pizza", restaurantId: createdRestaurants[14]._id, dietaryTags: ["Veg"] },
            { name: "Chicken BBQ Pizza", description: "Smoky chicken and cheese.", price: 350, image: "menu_11.png", category: "Pizza", restaurantId: createdRestaurants[14]._id, dietaryTags: ["Non-Veg"] },
            
            { name: "Chicken Biryani", description: "Aromatic basmati rice with spiced chicken.", price: 200, image: "menu_12.png", category: "Biryani", restaurantId: createdRestaurants[15]._id, dietaryTags: ["Non-Veg"] },
            { name: "Veg Biryani", description: "Flavorful rice cooked with mixed vegetables.", price: 150, image: "menu_12.png", category: "Biryani", restaurantId: createdRestaurants[15]._id, dietaryTags: ["Veg"] },
            
            { name: "Chicken Sushi Roll", description: "Sushi rolls filled with cooked chicken.", price: 300, image: "menu_13.png", category: "Sushi", restaurantId: createdRestaurants[16]._id, dietaryTags: ["Non-Veg"] },
            { name: "Avocado Veg Sushi", description: "Fresh avocado wrapped in sushi rice and nori.", price: 280, image: "menu_13.png", category: "Sushi", restaurantId: createdRestaurants[16]._id, dietaryTags: ["Veg", "Vegan"] },
            
            { name: "Quinoa Bowl", description: "Healthy bowl of quinoa and roasted veg.", price: 220, image: "menu_14.png", category: "Healthy Bowl", restaurantId: createdRestaurants[17]._id, dietaryTags: ["Veg", "Vegan"] },
            { name: "Chicken Salad Bowl", description: "Protein rich bowl with chicken breast.", price: 250, image: "menu_14.png", category: "Healthy Bowl", restaurantId: createdRestaurants[17]._id, dietaryTags: ["Non-Veg"] }
        ];

        await foodModel.insertMany(foodItems);
        console.log("Food items created successfully!");

        console.log("Creating Delivery Agent Profile...");
        await deliveryAgentModel.create({
            userId: driverDoc._id,
            vehicleDetails: "Honda Activa",
            currentLocation: {
                type: "Point",
                coordinates: [93.7275, 25.9065]
            },
            isAvailable: true
        });
        console.log("Delivery agent profile created!");

        console.log("Creating Coupons...");
        await couponModel.insertMany([
            { code: "WELCOME50", discountPercentage: 50, maxDiscountAmount: 150, minOrderValue: 200, expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isActive: true }
        ]);
        console.log("Coupons created successfully!");

        console.log("=========================================");
        console.log("DATABASE SEEDING COMPLETED SUCCESSFULLY!");
        console.log("=========================================");

    } catch (error) {
        console.error("Error seeding database:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from Database.");
    }
};

seedDatabase();
