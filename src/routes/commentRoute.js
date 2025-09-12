// routes/comment.routes.js
import express from "express";
import CommentController from "../controllers/commentController.js";
// import middleware from "../middleware.js"; // nếu cần JWT: router.use(middleware.authenticateToken)

const router = express.Router();

// router.use(middleware.authenticateToken); // nếu cần

router.post("/", CommentController.create);                 // tạo comment (có thể có rating)
router.get("/book/:bookId", CommentController.listByBook);  // list comments theo book
router.get("/:id", CommentController.getById);              // lấy 1 comment
router.put("/:id", CommentController.update);               // sửa comment (có thể đổi rating)
router.delete("/:id", CommentController.remove);            // xóa comment
router.post("/:id/replies", CommentController.addReply);    // thêm reply

export default router;
