// controllers/commentController.js
import CommentDAO from "../models/commentDAO.js";

export default class CommentController {
  static async create(req, res) {
    try {
      // yêu cầu: req.body = { id_book, id_user, comment, rating? }
      const { id_book, id_user, comment, rating } = req.body;

      if (!id_book || !id_user || !comment) {
        return res.status(400).json({ error: "id_book, id_user, comment are required" });
      }
      if (rating !== undefined && (typeof rating !== "number" || rating < 0 || rating > 5)) {
        return res.status(400).json({ error: "rating must be a number 0..5" });
      }

      const insertedId = await CommentDAO.addComment({ id_book, id_user, comment, rating });
      return res.status(201).json({ _id: insertedId });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  static async addReply(req, res) {
    try {
      // req.params.id = commentId
      // req.body = { id_user, reply }
      const { id } = req.params;
      const { id_user, reply } = req.body;
      if (!id_user || !reply) {
        return res.status(400).json({ error: "id_user and reply are required" });
      }

      const replyId = await CommentDAO.addReply(id, { id_user, reply });
      if (!replyId) return res.status(404).json({ error: "Comment not found" });
      return res.status(201).json({ _id: replyId });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  static async update(req, res) {
    try {
      // req.params.id = commentId
      // req.body = { comment?, rating? }
      const { id } = req.params;
      const { comment, rating } = req.body;

      if (rating !== undefined && rating !== null) {
        if (typeof rating !== "number" || rating < 0 || rating > 5) {
          return res.status(400).json({ error: "rating must be a number 0..5 or null" });
        }
      }

      const ok = await CommentDAO.updateComment(id, { comment, rating });
      if (!ok) return res.status(404).json({ error: "Comment not found" });
      return res.status(200).json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const ok = await CommentDAO.deleteComment(id);
      if (!ok) return res.status(404).json({ error: "Comment not found" });
      return res.status(200).json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  static async listByBook(req, res) {
    try {
      const { bookId } = req.params;
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "10", 10);
      const data = await CommentDAO.getCommentsByBook(bookId, { page, limit });
      return res.status(200).json(data);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const comment = await CommentDAO.getCommentById(id);
      if (!comment) return res.status(404).json({ error: "Comment not found" });
      return res.status(200).json(comment);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }
}
