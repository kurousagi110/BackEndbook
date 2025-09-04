import express from "express";
import TaskController from "../controllers/taskController.js";
import middleware from "../middleware.js";

const router = express.Router();

// Tất cả routes đều yêu cầu xác thực
router.use(middleware.authenticateToken);

// Validation middleware cho task
const validateTask = (req, res, next) => {
    const { title, description, startAt, dueAt, priority, labels } = req.body;
    
    if (title && title.length > 100) {
        return res.status(400).json({ error: "Task title must be less than 100 characters" });
    }
    
    if (description && description.length > 1000) {
        return res.status(400).json({ error: "Task description must be less than 1000 characters" });
    }
    
    if (dueAt && isNaN(Date.parse(dueAt))) {
        return res.status(400).json({ error: "Invalid due date format" });
    }
    
    if (startAt && isNaN(Date.parse(startAt))) {
        return res.status(400).json({ error: "Invalid start date format" });
    }
    
    const validPriorities = ["low", "medium", "high"];
    if (priority && !validPriorities.includes(priority)) {
        return res.status(400).json({ error: "Priority must be one of: low, medium, high" });
    }
    
    next();
};

// Routes
router.get("/projects/:projectId/tasks", TaskController.getTasksByProject); // Fixed this line
router.post("/", validateTask, TaskController.createTask);
router.put("/:taskId", validateTask, TaskController.updateTask);
router.delete("/:taskId", TaskController.deleteTask);
router.get("/:taskId", TaskController.getTaskById);
router.get("/users/:userId", TaskController.getTasksByUserId);
router.get("/search/find", TaskController.searchTasks);
router.patch("/:taskId/status", TaskController.updateTaskStatus);
router.post("/:taskId/labels", TaskController.addLabelToTask);
router.delete("/:taskId/labels", TaskController.removeLabelFromTask);

export default router;