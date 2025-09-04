import mongodb from "mongodb"
const ObjectId = mongodb.ObjectId

let projects
export default class projectDAO {
    static async injectDB(conn) {
        if (projects) {
            return
        }
        try {
            projects = await conn.db(process.env.MOVIEREVIEWS_DB_NAME).collection("projects")
        } catch (e) {
            console.error(`Unable to establish a collection handle in projectDAO: ${e}`)
        }
    }
    
    static async addProject(name, description, userId) {
        try {
            const projectDoc = {
                name: name,
                description: description,
                userId: userId,
                sections: [], // Initialize empty sections array
                label: [],
                task: [],
                createdAt: new Date(),
                updatedAt: new Date()
            }
            const result = await projects.insertOne(projectDoc)
            return result.insertedId
        } catch (e) {
            console.error(`Unable to add project: ${e}`)
            throw e
        }
    }
    
    static async getProjects() {
        try {
            const projectsList = await projects.find({}).toArray()
            return projectsList
        } catch (e) {
            console.error(`Unable to get projects: ${e}`)
            throw e
        }
    }
    
    static async updateProject(projectId, name, description) {
        try {
            const result = await projects.updateOne(
                { _id:projectId },
                { $set: { name, description, updatedAt: new Date() } }
            )
            return result.modifiedCount > 0
        } catch (e) {
            console.error(`Unable to update project: ${e}`)
            throw e
        }
    }
    
    static async deleteProject(projectId) {
        try {
            const result = await projects.deleteOne({ _id: projectId })
            return result.deletedCount > 0
        } catch (e) {
            console.error(`Unable to delete project: ${e}`)
            throw e
        }
    }
    
    static async getProjectById(projectId) {
        try {
            const id = new ObjectId(projectId);
            const project = await projects.findOne({ _id: id });
            console.log("Fetched project:", project);
            return project
        } catch (e) {
            console.error(`Unable to get project: ${e}`)
            throw e
        }
    }
    
    static async getProjectsByUserId(userId) {
        try {
            const projectsList = await projects.find({ userId: userId }).toArray()
            return projectsList
        } catch (e) {
            console.error(`Unable to get projects by user ID: ${e}`)
            throw e
        }
    }
    static async searchProjects(filter = {}, skip = 0, limit = 10) {
        try {
            const projectsList = await projects
                .find(filter)
                .skip(skip)
                .limit(limit)
                .toArray();
            return projectsList;
        } catch (e) {
            console.error(`Unable to search projects: ${e}`);
            throw e;
        }
    }
    
    static async countProjects(filter = {}) {
        try {
            const count = await projects.countDocuments(filter);
            return count;
        } catch (e) {
            console.error(`Unable to count projects: ${e}`);
            throw e;
        }
    }
}