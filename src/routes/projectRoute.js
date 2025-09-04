import express from "express";
import ProjectController from "../controllers/projectController.js";
import middleware from "../middleware.js";

const router = express.Router();

// Sửa lại cách sử dụng middleware
router.use(middleware.authenticateToken);

// Áp dụng rate limiting
router.use(middleware.rateLimit);

// Routes
router.post("/", middleware.validateProject, ProjectController.createProject);
router.get("/", ProjectController.getProjects);
router.get("/search", ProjectController.searchProjects);
router.get("/:id", middleware.checkProjectOwnership, ProjectController.getProjectById);
router.get("/user/:userId", ProjectController.getProjectsByUserId);
router.put("/:id", middleware.validateProject, middleware.checkProjectOwnership, ProjectController.updateProject);
router.delete("/:id", middleware.checkProjectOwnership, ProjectController.deleteProject);

export default router;