import express from 'express'
import { addFood, listfood, removeFood, updateFood } from '../controllers/foodController.js'
import multer from 'multer'

const foodRouter = express.Router();

//image Storage Engine
const storage = multer.diskStorage({
    destination: "uploads",
    filename: (req,file,cb)=>{
        return cb(null, `${Date.now()}${file.originalname}`)
    }
})

const upload = multer({storage:storage})

foodRouter.post('/add', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 }
]), addFood)
foodRouter.get("/list",listfood)
foodRouter.post("/remove",removeFood)
foodRouter.post("/update", upload.fields([{ name: 'image', maxCount: 1 }]), updateFood) // #22




export default foodRouter;