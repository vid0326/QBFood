// Login and Sign in logic

import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import validator from "validator"

// Generate Access and Refresh Tokens
const generateTokens = async (user) => {
    const accessToken = jwt.sign(
        { id: user._id, role: user.role, version: user.tokenVersion },
        process.env.JWT_SECRET || "random#secret",
        { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
        { id: user._id, version: user.tokenVersion },
        process.env.JWT_SECRET || "random#secret",
        { expiresIn: '7d' }
    );
    
    // Save to database
    user.activeToken = accessToken;
    user.refreshToken = refreshToken;
    await user.save();
    
    return { accessToken, refreshToken };
}

// Login user
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userModel.findOne({ email })
        if (!user) {
            return res.json({ success: false, message: "User does not exist!!" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.json({ success: false, message: "Invalid Credentials, Please try again!!" })
        }

        const { accessToken, refreshToken } = await generateTokens(user);
        
        return res.json({ 
            success: true, 
            token: accessToken, 
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic || "",
                addresses: user.addresses || [],
                vehicleDetails: user.vehicleDetails,
                licensePlate: user.licensePlate,
                phone: user.phone || "",
                loyaltyPoints: user.loyaltyPoints || 0,
                totalDeliveries: user.totalDeliveries || 0
            }
        })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Error " })
    }
}

// Register User
const registerUser = async (req, res) => {
    const { name, password, email, role, vehicleDetails, licensePlate } = req.body;
    try {
        // Checking if user exist
        const exist = await userModel.findOne({ email });
        if (exist) {
            return res.json({ success: false, message: "User Already Exist!" })
        }

        //  Validating Email Format and Strong Password
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please Enter Valid Email!" })
        }

        if (password.length < 8) {
            return res.json({ success: false, message: "Enter Strong Password!" })
        }

        // Hashing User password using bcrypt
        const salt = await bcrypt.genSalt(10) 
        const hashedPassword = await bcrypt.hash(password, salt)

        // Set default role if not specified
        const userRole = role || 'customer';

        const newUser = new userModel({
            name: name,
            email: email,
            password: hashedPassword,
            role: userRole,
            vehicleDetails: userRole === 'delivery' ? (vehicleDetails || "") : "",
            licensePlate: userRole === 'delivery' ? (licensePlate || "") : ""
        })

        const user = await newUser.save()
        const { accessToken, refreshToken } = await generateTokens(user);
        
        res.json({ 
            success: true, 
            token: accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic || "",
                addresses: user.addresses || [],
                vehicleDetails: user.vehicleDetails,
                licensePlate: user.licensePlate,
                phone: user.phone || "",
                loyaltyPoints: user.loyaltyPoints || 0,
                totalDeliveries: user.totalDeliveries || 0
            }
        })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Error" })
    }
}

// Refresh Token
const refreshToken = async (req, res) => {
    const { refreshToken: incomingToken } = req.body;
    if (!incomingToken) {
        return res.json({ success: false, message: "Refresh token is required!" });
    }

    try {
        const decoded = jwt.verify(incomingToken, process.env.JWT_SECRET || "random#secret");
        const user = await userModel.findById(decoded.id);

        if (!user || user.refreshToken !== incomingToken || user.tokenVersion !== decoded.version) {
            return res.json({ success: false, message: "Invalid refresh token!" });
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

        res.json({ 
            success: true, 
            token: accessToken, 
            refreshToken: newRefreshToken 
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Session expired, please login again!" });
    }
}

// Logout User
const logoutUser = async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await userModel.findById(userId);
        if (user) {
            user.activeToken = null;
            user.refreshToken = null;
            await user.save();
        }
        res.json({ success: true, message: "Logged out successfully!" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Logout error" });
    }
}

// Update User Profile
const updateProfile = async (req, res) => {
    const userId = req.body.userId || req.userId;
    const { name, phone, street, city, state, zipCode, country } = req.body;
    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found!" });
        }

        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone; // #20: save phone

        // Handle profile photo upload
        if (req.file) {
            user.profilePic = req.file.filename;
        }

        // Update address (we can set the first address as primary or push)
        if (street || city || state || zipCode || country) {
            const primaryAddress = {
                label: 'Primary',
                street: street || "",
                city: city || "",
                state: state || "",
                zipCode: zipCode || "",
                country: country || ""
            };
            
            // Overwrite or update first element
            if (user.addresses && user.addresses.length > 0) {
                user.addresses[0] = primaryAddress;
            } else {
                user.addresses = [primaryAddress];
            }
        }

        await user.save();

        res.json({
            success: true,
            message: "Profile updated successfully!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic,
                addresses: user.addresses,
                vehicleDetails: user.vehicleDetails,
                licensePlate: user.licensePlate,
                phone: user.phone // #20: include in response
            }
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to update profile." });
    }
}

// Add User Address
const addUserAddress = async (req, res) => {
    const userId = req.body.userId || req.userId;
    const { label, street, city, state, zipCode, country } = req.body;
    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found!" });
        }

        const newAddress = {
            label: label || "Home",
            street: street || "",
            city: city || "",
            state: state || "",
            zipCode: zipCode || "",
            country: country || ""
        };

        user.addresses.push(newAddress);
        await user.save();

        res.json({
            success: true,
            message: "Address added successfully!",
            addresses: user.addresses,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic,
                addresses: user.addresses,
                vehicleDetails: user.vehicleDetails,
                licensePlate: user.licensePlate
            }
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to add address." });
    }
}

export { loginUser, registerUser, refreshToken, logoutUser, updateProfile, addUserAddress }