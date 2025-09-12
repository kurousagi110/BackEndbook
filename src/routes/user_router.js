// routes/userRoute.js
import express from "express";
import UserController from "../controllers/userController.js";

const router = express.Router();

// Register
router.post("/register", UserController.register);

// Login
router.post("/login", UserController.login);

// Profile
router
  .route("/profile/:id")
  .get(UserController.getProfile)   // Lấy profile theo id
  .put(UserController.updateProfile); // Update profile theo id

router
  .route("/profile/:id/favorites")
  .put(UserController.updateFavorite);
export default router;
