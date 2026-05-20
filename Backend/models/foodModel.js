import mongoose, { mongo } from "mongoose";

const foodSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        image: { type: String, required: true },
        images: [{ type: String }], // Up to 5 additional gallery photos of the food item
        category: { type: String, required: true },
        restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'restaurant', required: false }, // Optional initially to prevent breaking existing data
        dietaryTags: [{ type: String }], // e.g. 'Veg', 'Vegan', 'Gluten-Free'
        isAvailable: { type: Boolean, default: true } // Can be marked sold out by vendor
    }
)

const foodModel = mongoose.models.food || mongoose.model("food", foodSchema)

export default foodModel;