import express from "express";
import BookController from "../controllers/bookController.js";
import middleware from "../middleware.js";

const router = express.Router();

/**
 * Áp dụng middleware mức router:
 * - Chỉ yêu cầu xác thực token cho mọi route
 * - (Tùy chọn) rate limiting cho toàn bộ nhóm route
 */
router.use(middleware.authenticateToken);
router.use(middleware.rateLimit);

// Routes
router.post("/", BookController.createBook);

router.get("/", BookController.getBooks);
router.get("/search", BookController.searchBooks);

router.get("/:id", BookController.getBookById);
router.put("/:id", BookController.updateBook);
router.delete("/:id", BookController.deleteBook);

export default router;
