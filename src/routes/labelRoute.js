import express from "express";
import LabelController from "../controllers/labelController.js";
import middleware from "../middleware.js";

const router = express.Router();

// Tất cả routes đều yêu cầu xác thực
router.use(middleware.authenticateToken);

// Validation middleware cho label
const validateLabel = (req, res, next) => {
    const { name } = req.body;
    
    if (name && name.length > 30) {
        return res.status(400).json({ error: "Label name must be less than 30 characters" });
    }
    next();
};

// Routes
router.post("/", validateLabel, LabelController.createLabel);
router.get("/", LabelController.getLabels);
router.put("/:labelId", validateLabel, LabelController.updateLabel);
router.delete("/:labelId", LabelController.deleteLabel);
router.get("/:labelId", LabelController.getLabelById);
router.get("/users/:userId", LabelController.getLabelsByUserId);
router.get("/users/:userId/search", LabelController.searchLabels);
router.post("/labels/by-projects", LabelController.getLabelsByProjectIds);

export default router;