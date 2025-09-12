// controllers/userController.js
import UserDAO from "../models/userDAO.js";

export default class UserController {
    static async register(req, res) {
        const { email, password, username, name, avatar } = req.body;
        try {
            const userId = await UserDAO.register(email, password, username, name, avatar);
            res.status(201).json({ message: "User registered successfully", userId });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    }

    static async login(req, res) {
        const { identifier, password } = req.body; // email hoặc username
        try {
            const data = await UserDAO.login(identifier, password);
            res.status(200).json(data);
        } catch (e) {
            if (e.message.includes("Invalid") || e.message.includes("required")) {
                return res.status(401).json({ error: e.message });
            }
            if (e.message.includes("deactivated")) {
                return res.status(403).json({ error: e.message });
            }
            res.status(500).json({ error: "Internal server error" });
        }
    }

    static async getProfile(req, res) {
        const { id } = req.params; // route dùng :id
        try {
            const user = await UserDAO.getUserById(id);
            res.status(200).json({ message: "Profile retrieved successfully", user });
        } catch (e) {
            if (e.message.includes("Invalid") || e.message.includes("required")) {
                return res.status(400).json({ error: e.message });
            }
            if (e.message.includes("not found")) {
                return res.status(404).json({ error: e.message });
            }
            res.status(500).json({ error: "Internal server error" });
        }
    }

    static async updateProfile(req, res) {
        const { id } = req.params; // <— đồng bộ với route
        const { email, password, username, name, avatar } = req.body;
        try {
            const updatedUser = await UserDAO.updateUser(id, { email, password, username, name, avatar });
            res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
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
            res.status(500).json({ error: "Internal server error" });
        }
    }
    // controllers/userController.js
    static async updateFavorite(req, res) {
        const { id } = req.params;               // user id
        const { bookId, action } = req.body;     // action: 'add' | 'remove' | 'toggle'
        try {
            const data = await UserDAO.updateFavoriteBook(id, bookId, action || "toggle");
            res.status(200).json({
                message: `Favorite ${data.actionApplied}`,
                action: data.actionApplied,
                user: data.user,
            });
        } catch (e) {
            if (e.message.includes("Invalid") || e.message.includes("required"))
                return res.status(400).json({ error: e.message });
            if (e.message.includes("not found"))
                return res.status(404).json({ error: e.message });
            res.status(500).json({ error: "Internal server error" });
        }
    }

}
