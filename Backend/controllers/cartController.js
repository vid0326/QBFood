import userModel from '../models/userModel.js'


// Add Items to cart
const addToCart = async (req, res) => {
    try {
        let userData = await userModel.findById(req.body.userId)
        if (!userData) {
            return res.json({ success: false, message: "User not found" })
        }
        let cartData = await userData.cartData;
        if (!cartData[req.body.itemId]) {
            cartData[req.body.itemId] = 1
        } else {
            cartData[req.body.itemId] += 1
        }

        await userModel.findByIdAndUpdate(req.body.userId, { cartData })
        res.json({ success: true, message: "Added to Cart" })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

// Remove Items from cart
const removeFromCart = async (req, res) => {
    try {
        let userData = await userModel.findById(req.body.userId)
        if (!userData) {
            return res.json({ success: false, message: "User not found" })
        }
        let cartData = await userData.cartData;
        if (cartData[req.body.itemId] > 0) {
            cartData[req.body.itemId] -= 1;
        }

        await userModel.findByIdAndUpdate(req.body.userId, { cartData })
        res.json({ success: true, message: "Removed From Cart" })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

// Fetch Cart Data
const getCart = async (req, res) => {
    try {
        let userData = await userModel.findById(req.body.userId)
        if (!userData) {
            return res.json({ success: false, message: "User not found" })
        }
        let cartData = await userData.cartData;
        res.json({ success: true, cartData })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: " Error" })
    }
}

// Clear entire cart (after payment)
const clearCart = async (req, res) => {
    try {
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });
        res.json({ success: true, message: "Cart cleared" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

export { addToCart, removeFromCart, getCart, clearCart }