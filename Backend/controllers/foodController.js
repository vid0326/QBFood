import foodModel from "../models/foodModel.js";
import fs from 'fs'

// add food items 
const addFood = async (req, res) =>{
    try{
        let image_filename = "";
        if (req.files && req.files['image'] && req.files['image'][0]) {
            image_filename = req.files['image'][0].filename;
        }

        let additionalImages = [];
        if (req.files && req.files['images']) {
            additionalImages = req.files['images'].map(file => file.filename);
        }

        const food = new foodModel({
            name : req.body.name,
            description: req.body.description,
            price: Number(req.body.price),
            category: req.body.category,
            image: image_filename,
            images: additionalImages,
            restaurantId: req.body.restaurantId || null
        })

        await food.save()
        res.json({success:true,message:"Food Added successfully! 🍽️"})
    }catch(error){
        console.log(error)
        res.json({success:false,message:"Error adding food"})
    }
}

// List of All Food
const listfood = async (req, res) => {
    try {
        const { category, price_max, price_min, tags, search, restaurantId } = req.query;
        let query = {};

        if (restaurantId) {
            query.restaurantId = restaurantId;
        }

        if (category) {
            query.category = category;
        }

        if (price_min || price_max) {
            query.price = {};
            if (price_min) query.price.$gte = Number(price_min);
            if (price_max) query.price.$lte = Number(price_max);
        }

        if (tags) {
            const tagsArray = tags.split(',').map(tag => new RegExp(tag.trim(), 'i'));
            query.dietaryTags = { $in: tagsArray };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Populate restaurant references to easily read restaurant name, rating, address
        const foods = await foodModel.find(query).populate('restaurantId');
        res.json({success: true, data: foods})
    } catch (error) {
        console.log(error)
        res.json({success: false, message: "Error"})
    }
}

// Remove food items
const removeFood = async (req, res)=>{
    try {
        const food = await foodModel.findById(req.body.id);
        fs.unlink(`uploads/${food.image}`,()=>{})
        await foodModel.findByIdAndDelete(req.body.id);
        res.json({success: true, message: "food Removed"})
    } catch (error) {
        console.log(error)
        res.json({success: false, message: "Error"})
    }
}

// #22: Update food item (vendor inline edit)
const updateFood = async (req, res) => {
    try {
        const { id, name, description, price, category, isAvailable } = req.body;
        const update = {};
        if (name !== undefined) update.name = name;
        if (description !== undefined) update.description = description;
        if (price !== undefined) update.price = Number(price);
        if (category !== undefined) update.category = category;
        if (isAvailable !== undefined) update.isAvailable = isAvailable;

        // Handle image replacement if uploaded
        if (req.files && req.files['image'] && req.files['image'][0]) {
            const food = await foodModel.findById(id);
            if (food && food.image) fs.unlink(`uploads/${food.image}`, () => {});
            update.image = req.files['image'][0].filename;
        }

        await foodModel.findByIdAndUpdate(id, update);
        res.json({ success: true, message: 'Food item updated! ✅' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error updating food item' });
    }
};

export {addFood, listfood, removeFood, updateFood}