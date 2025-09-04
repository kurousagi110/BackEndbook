import projectDAO from "../models/projectDAO.js";
import middleware from "../middleware.js";

export default class ProjectController {
    // Tạo project mới với xác thực và validation
    static async createProject(req, res) {
        try {
            const { name, description } = req.body;
            const userId = req.user.id;

            const projectId = await projectDAO.addProject(name, description, userId);
            
            res.status(201).json({ 
                message: "Project created successfully", 
                projectId,
                project: { name, description, userId }
            });
        } catch (e) {
            console.error("Create project error:", e);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    // Lấy tất cả projects với phân quyền
    static async getProjects(req, res) {
        try {
            let projects;
            
            // Admin thấy tất cả projects, user thấy chỉ projects của mình
            if (req.user.role === 'admin') {
                projects = await projectDAO.getProjects();
            } else {
                projects = await projectDAO.getProjectsByUserId(req.user.id);
            }
            
            res.status(200).json({
                count: projects.length,
                projects
            });
        } catch (e) {
            console.error("Get projects error:", e);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    // Lấy project theo ID với kiểm tra quyền truy cập
    static async getProjectById(req, res) {
        try {
            const { id } = req.params;
            console.log("Fetching project with ID:", id);
            const project = await projectDAO.getProjectById(id);
            
            if (!project) {
                return res.status(404).json({ error: "Project not found" });
            }
            
            // Kiểm tra quyền truy cập
            if (req.user.role !== 'admin' && project.userId.toString() !== req.user.id) {
                return res.status(403).json({ error: "Access denied" });
            }
            
            res.status(200).json(project);
        } catch (e) {
            console.error("Get project by ID error:", e);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    // Lấy projects theo user ID (chỉ admin hoặc chính user đó)
    static async getProjectsByUserId(req, res) {
        try {
            const { userId } = req.params;
            
            // Chỉ admin hoặc chính user mới có thể xem projects của user
            if (req.user.role !== 'admin' && req.user.id !== userId) {
                return res.status(403).json({ error: "Access denied" });
            }
            
            const projects = await projectDAO.getProjectsByUserId(userId);
            res.status(200).json({
                count: projects.length,
                projects
            });
        } catch (e) {
            console.error("Get projects by user ID error:", e);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    // Cập nhật project với kiểm tra quyền sở hữu
    static async updateProject(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            
            const updated = await projectDAO.updateProject(id, name, description);
            
            if (!updated) {
                return res.status(404).json({ error: "Project not found or no changes made" });
            }
            
            res.status(200).json({ 
                message: "Project updated successfully",
                project: { id, name, description }
            });
        } catch (e) {
            console.error("Update project error:", e);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    // Xóa project với kiểm tra quyền sở hữu
    static async deleteProject(req, res) {
        try {
            const { id } = req.params;
            const deleted = await projectDAO.deleteProject(id);
            
            if (!deleted) {
                return res.status(404).json({ error: "Project not found" });
            }
            
            res.status(200).json({ 
                message: "Project deleted successfully",
                projectId: id
            });
        } catch (e) {
            console.error("Delete project error:", e);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    // Tìm kiếm projects với pagination
    static async searchProjects(req, res) {
        try {
            const { query, page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;
            
            let filter = {};
            
            // Thêm điều kiện tìm kiếm nếu có query
            if (query) {
                filter.$or = [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } }
                ];
            }
            
            // Nếu không phải admin, chỉ lấy projects của user
            if (req.user.role !== 'admin') {
                filter.userId = req.user.id;
            }
            
            const projects = await projectDAO.searchProjects(filter, parseInt(skip), parseInt(limit));
            const total = await projectDAO.countProjects(filter);
            
            res.status(200).json({
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
                projects
            });
        } catch (e) {
            console.error("Search projects error:", e);
            res.status(500).json({ error: "Internal server error" });
        }
    }
}