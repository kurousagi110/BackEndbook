// controllers/userController.js
import UserDAO from "../models/userDAO.js";

export default class UserController {
  static async register(req, res) {
    const { email, password, username, name, avatar } = req.body;
    try {
      const userId = await UserDAO.register(email, password, username, name, avatar);
      return res.status(201).json({ message: "User registered successfully", userId });
    } catch (e) {
      // mapping lỗi hợp lý hơn
      if (
        e.message.includes("already exists") ||
        e.message.includes("already taken")
      ) {
        return res.status(409).json({ error: e.message });
      }
      if (e.message.includes("Password")) {
        return res.status(400).json({ error: e.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async login(req, res) {
    const { identifier, password } = req.body; // email hoặc username
    try {
      const data = await UserDAO.login(identifier, password);
      return res.status(200).json(data);
    } catch (e) {
      if (e.message.includes("Invalid") || e.message.includes("required")) {
        return res.status(401).json({ error: e.message });
      }
      if (e.message.includes("deactivated")) {
        return res.status(403).json({ error: e.message });
      }
      if (e.message.includes("JWT_SECRET")) {
        return res.status(500).json({ error: e.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getProfile(req, res) {
    const { id } = req.params; // route dùng :id
    try {
      const user = await UserDAO.getUserById(id);
      return res.status(200).json({ message: "Profile retrieved successfully", user });
    } catch (e) {
      if (e.message.includes("Invalid") || e.message.includes("required")) {
        return res.status(400).json({ error: e.message });
      }
      if (e.message.includes("not found")) {
        return res.status(404).json({ error: e.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async updateProfile(req, res) {
    const { id } = req.params; // đồng bộ với route
    // KHÔNG nhận password ở đây vì DAO.updateUser không cho phép cập nhật password
    const { email, username, name, avatar } = req.body;
    try {
      const updatedUser = await UserDAO.updateUser(id, { email, username, name, avatar });
      return res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
    } catch (e) {
      if (e.message.includes("Invalid") || e.message.includes("required")) {
        return res.status(400).json({ error: e.message });
      }
      if (e.message.includes("not found")) {
        return res.status(404).json({ error: e.message });
      }
      if (e.message.includes("already exists") || e.message.includes("already taken")) {
        return res.status(409).json({ error: e.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Thêm/sửa/xoá 1 cuốn sách trong danh sách yêu thích
  static async updateFavorite(req, res) {
    const { id } = req.params;               // user id
    const { bookId, action } = req.body;     // action: 'add' | 'remove' | 'toggle'
    console.log(id)
    try {
      if (!bookId) return res.status(400).json({ error: "bookId is required" });

      const data = await UserDAO.updateFavoriteBook(id, bookId, action || "toggle");
      return res.status(200).json({
        message: `Favorite ${data.actionApplied}`,
        action: data.actionApplied,
        user: data.user,
      });
    } catch (e) {
      if (e.message.includes("Invalid") || e.message.includes("required")) {
        return res.status(400).json({ error: e.message });
      }
      if (e.message.includes("not found")) {
        return res.status(404).json({ error: e.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // LẤY danh sách sách yêu thích (đầy đủ data từ bảng books) + phân trang + giữ thứ tự
  static async getFavorites(req, res) {
    const { id } = req.params; // user id
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    // mặc định giữ thứ tự trong mảng favoriteBooks; truyền preserveOrder=false để sort theo rating/viewCount ở DAO
    const preserveOrder =
      typeof req.query.preserveOrder === "string"
        ? req.query.preserveOrder !== "false"
        : true;

    // cho phép chọn field: ?fields=name,writer,img,rating
    const fields = req.query.fields
      ? req.query.fields.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    try {
      const data = await UserDAO.getFavoriteBooks(id, { page, limit, preserveOrder, fields });
      return res.status(200).json(data); // { items, total, page, limit }
    } catch (e) {
      if (e.message.includes("Invalid") || e.message.includes("required")) {
        return res.status(400).json({ error: e.message });
      }
      if (e.message.includes("not found")) {
        return res.status(404).json({ error: e.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // XOÁ toàn bộ sách yêu thích của user
  static async clearAllFavorites(req, res) {
    const { id } = req.params; // user id
    try {
      const data = await UserDAO.deleteAllFavorite(id);
      return res.status(200).json({
        message: "All favorite books removed",
        removedCount: data.removedCount,
        user: data.user,
      });
    } catch (e) {
      if (e.message.includes("Invalid") || e.message.includes("required")) {
        return res.status(400).json({ error: e.message });
      }
      if (e.message.includes("not found")) {
        return res.status(404).json({ error: e.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
