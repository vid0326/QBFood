import express from 'express';
import restaurantModel from '../models/restaurantModel.js';
import upload from '../config/multer.js';

const restaurantRouter = express.Router();

// Vendor Onboarding / Profile Update: Create or update restaurant profile with multiple images
restaurantRouter.post('/onboard', upload.fields([
    { name: 'bannerImage', maxCount: 1 },
    { name: 'images', maxCount: 5 }
]), async (req, res) => {
    try {
        const { name, description, ownerId, address, lat, lng, cuisineTypes } = req.body;
        
        let existingRestaurant = await restaurantModel.findOne({ ownerId });

        let bannerImagePath = existingRestaurant ? existingRestaurant.bannerImage : "";
        if (req.files && req.files['bannerImage'] && req.files['bannerImage'][0]) {
            bannerImagePath = req.files['bannerImage'][0].filename;
        }

        let additionalImages = existingRestaurant ? existingRestaurant.images : [];
        if (req.files && req.files['images']) {
            const newFiles = req.files['images'].map(file => file.filename);
            // Merge existing and new images, capping at 5
            additionalImages = [...additionalImages, ...newFiles].slice(-5);
        }

        const parsedAddress = JSON.parse(address || "{}");
        const parsedCuisines = JSON.parse(cuisineTypes || "[]");

        if (existingRestaurant) {
            existingRestaurant.name = name || existingRestaurant.name;
            existingRestaurant.description = description || existingRestaurant.description;
            existingRestaurant.address = { ...existingRestaurant.address, ...parsedAddress };
            if (lat && lng) {
                existingRestaurant.location = {
                    type: 'Point',
                    coordinates: [parseFloat(lng), parseFloat(lat)]
                };
            }
            existingRestaurant.cuisineTypes = parsedCuisines.length > 0 ? parsedCuisines : existingRestaurant.cuisineTypes;
            existingRestaurant.bannerImage = bannerImagePath;
            existingRestaurant.images = additionalImages;

            const updatedRestaurant = await existingRestaurant.save();
            return res.json({ success: true, message: "Restaurant Profile Updated Successfully! ✨", data: updatedRestaurant });
        }

        const newRestaurant = new restaurantModel({
            name,
            description,
            ownerId,
            address: parsedAddress,
            location: {
                type: 'Point',
                coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0]
            },
            cuisineTypes: parsedCuisines,
            bannerImage: bannerImagePath,
            images: additionalImages
        });

        const savedRestaurant = await newRestaurant.save();
        res.json({ success: true, message: "Restaurant onboarded successfully! 🏪", data: savedRestaurant });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error onboarding restaurant." });
    }
});

// Fetch restaurant details for a specific owner
restaurantRouter.get('/owner/:ownerId', async (req, res) => {
    try {
        const { ownerId } = req.params;
        const restaurant = await restaurantModel.findOne({ ownerId });
        if (!restaurant) {
            return res.json({ success: false, message: "No restaurant found for this owner." });
        }
        res.json({ success: true, data: restaurant });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching restaurant profile." });
    }
});

// Get all restaurants (with optional geospatial filtering)
restaurantRouter.get('/list', async (req, res) => {
    try {
        const { lat, lng, maxDistance } = req.query;
        let query = {};

        if (lat && lng) {
            query.location = {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(maxDistance) || 15000 // Default 15km
                }
            };
        }

        const restaurants = await restaurantModel.find(query);
        res.json({ success: true, data: restaurants });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching restaurants" });
    }
});

// #34: Get a single restaurant by ID (for restaurant profile page)
restaurantRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await restaurantModel.findById(id);
        if (!restaurant) return res.json({ success: false, message: 'Restaurant not found' });
        res.json({ success: true, data: restaurant });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error fetching restaurant' });
    }
});

export default restaurantRouter;
