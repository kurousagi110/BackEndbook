import taskDAO from "../models/taskDAO.js";

export default class TaskController {
    static async getTasksByProject(req, res) {
        const { projectId } = req.params;
        
        try {
            const tasks = await taskDAO.getTasksByProject(projectId);
            res.status(200).json(tasks);
        } catch (e) {
            console.error("Get tasks error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async createTask(req, res) {
        const { title, description, startAt, dueAt, priority, labels, projectId, sectionId } = req.body;
        const userId = req.user.id;

        if (!title) {
            return res.status(400).json({ error: "Task title is required" });
        }

        try {
            const taskId = await taskDAO.addTask({
                title,
                description,
                startAt,
                dueAt,
                priority,
                labels,
                projectId,
                sectionId,
                userId
            });
            
            res.status(201).json({ 
                id: taskId,
                title: title
            });
        } catch (e) {
            console.error("Create task error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async updateTask(req, res) {
        const { taskId } = req.params;
        const { title, description, startAt, dueAt, priority, labels, completed } = req.body;
        
        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "At least one field is required for update" });
        }

        try {
            const updated = await taskDAO.updateTask(taskId, {
                title,
                description,
                startAt,
                dueAt,
                priority,
                labels,
                completed
            });
            
            if (!updated) {
                return res.status(404).json({ error: "Task not found or no changes made" });
            }
            
            res.status(200).json({ message: "Task updated" });
        } catch (e) {
            console.error("Update task error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    // Additional methods that might be needed based on your existing implementation
    static async deleteTask(req, res) {
        const { taskId } = req.params;
        
        try {
            const deleted = await taskDAO.deleteTask(taskId);
            
            if (!deleted) {
                return res.status(404).json({ error: "Task not found" });
            }
            
            res.status(200).json({ message: "Task deleted successfully" });
        } catch (e) {
            console.error("Delete task error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async getTaskById(req, res) {
        const { taskId } = req.params;
        
        try {
            const task = await taskDAO.getTaskById(taskId);
            
            if (!task) {
                return res.status(404).json({ error: "Task not found" });
            }
            
            res.status(200).json(task);
        } catch (e) {
            console.error("Get task by ID error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async getTasksByUserId(req, res) {
        const { userId } = req.params;
        
        try {
            const tasks = await taskDAO.getTasksByUserId(userId);
            res.status(200).json(tasks);
        } catch (e) {
            console.error("Get tasks by user ID error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async searchTasks(req, res) {
        const { query, page = 1, limit = 10 } = req.query;
        console.log("Search query:", query, "Page:", page, "Limit:", limit);
        
        try {
            const result = await taskDAO.searchTasks(query, parseInt(page), parseInt(limit));
            res.status(200).json(result);
        } catch (e) {
            console.error("Search tasks error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async updateTaskStatus(req, res) {
        const { taskId } = req.params;
        const { completed } = req.body;
        
        if (completed === undefined) {
            return res.status(400).json({ error: "Completed status is required" });
        }

        try {
            const updated = await taskDAO.updateTaskStatus(taskId, completed);
            
            if (!updated) {
                return res.status(404).json({ error: "Task not found" });
            }
            
            res.status(200).json({ message: "Task status updated successfully" });
        } catch (e) {
            console.error("Update task status error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async addLabelToTask(req, res) {
        const { taskId } = req.params;
        const { labelId } = req.body;
        
        if (!labelId) {
            return res.status(400).json({ error: "Label ID is required" });
        }

        try {
            const updated = await taskDAO.addLabelToTask(taskId, labelId);
            
            if (!updated) {
                return res.status(404).json({ error: "Task or label not found" });
            }
            
            res.status(200).json({ message: "Label added to task successfully" });
        } catch (e) {
            console.error("Add label to task error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async removeLabelFromTask(req, res) {
        const { taskId } = req.params;
        const { labelId } = req.body;
        
        if (!labelId) {
            return res.status(400).json({ error: "Label ID is required" });
        }

        try {
            const updated = await taskDAO.removeLabelFromTask(taskId, labelId);
            
            if (!updated) {
                return res.status(404).json({ error: "Task or label not found" });
            }
            
            res.status(200).json({ message: "Label removed from task successfully" });
        } catch (e) {
            console.error("Remove label from task error:", e);
            res.status(500).json({ error: e.message });
        }
    }
}