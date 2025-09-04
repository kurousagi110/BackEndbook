import sectionDAO from "../models/sectionsDAO.js";

export default class sectionsController {
    static async createSection(req, res) {
        const { name, description, projectId } = req.body;

        // Validation
        // if (!name || !description || !projectId) {
        //     return res.status(400).json({ error: "Name, description, and projectId are required" });
        // }

        try {
            console.log("Adding section to project:", projectId);
            const sectionId = await sectionDAO.addSection(projectId, name, description);
            res.status(201).json({ 
                message: "Section created successfully", 
                sectionId 
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getSections(req, res) {
        try {
            const sections = await sectionDAO.getSections();
            res.status(200).json(sections);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getSectionById(req, res) {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ error: "Section ID is required" });
        }

        try {
            const section = await sectionDAO.getSectionById(id);
            
            if (!section) {
                return res.status(404).json({ error: "Section not found" });
            }
            
            res.status(200).json(section);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getSectionsByProjectId(req, res) {
        const { projectId } = req.params;
        
        if (!projectId) {
            return res.status(400).json({ error: "Project ID is required" });
        }

        try {
            const sections = await sectionDAO.getSectionsByProjectId(projectId);
            res.status(200).json(sections);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updateSection(req, res) {
        const { id } = req.params;
        const { name, description } = req.body;
        
        if (!id) {
            return res.status(400).json({ error: "Section ID is required" });
        }
        
        if (!name && !description) {
            return res.status(400).json({ error: "At least one field (name or description) is required for update" });
        }

        try {
            // First get the section to know which project it belongs to
            const section = await sectionDAO.getSectionById(id);
            if (!section) {
                return res.status(404).json({ error: "Section not found" });
            }

            const updated = await sectionDAO.updateSection(section.projectId, id, name, description);
            
            if (!updated) {
                return res.status(404).json({ error: "Section not found or no changes made" });
            }
            
            res.status(200).json({ message: "Section updated successfully" });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteSection(req, res) {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ error: "Section ID is required" });
        }

        try {
            // First get the section to know which project it belongs to
            const section = await sectionDAO.getSectionById(id);
            if (!section) {
                return res.status(404).json({ error: "Section not found" });
            }

            const deleted = await sectionDAO.deleteSection(section.projectId, id);
            
            if (!deleted) {
                return res.status(404).json({ error: "Section not found" });
            }
            
            res.status(200).json({ message: "Section deleted successfully" });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
}