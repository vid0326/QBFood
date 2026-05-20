import express from 'express'
import { loginUser, registerUser, refreshToken, logoutUser, updateProfile, addUserAddress } from '../controllers/userController.js'
import authMiddleware from '../middleware/auth.js'
import multer from 'multer'

const userRouter = express.Router()

// Multer Storage Engine for Profile Pics
const storage = multer.diskStorage({
    destination: "uploads",
    filename: (req, file, cb) => {
        return cb(null, `${Date.now()}${file.originalname}`)
    }
})
const upload = multer({ storage: storage })

userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)
userRouter.post("/refresh", refreshToken)
userRouter.post("/logout", logoutUser)
userRouter.post("/update-profile", authMiddleware, upload.single("image"), updateProfile)
userRouter.post("/add-address", authMiddleware, addUserAddress)

export default userRouter