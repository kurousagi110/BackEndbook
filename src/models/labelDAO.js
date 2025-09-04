import mongodb from "mongodb"
const ObjectId = mongodb.ObjectId

let labels // Separate labels collection
export default class labelDAO {
    static async injectDB(conn) {
        if (labels) {
            return
        }
        try {
            labels = await conn.db(process.env.MOVIEREVIEWS_DB_NAME).collection("labels")
            // Create indexes for better performance
            await labels.createIndex({ projectId: 1 })
            await labels.createIndex({ userId: 1 })
            await labels.createIndex({ name: "text" })
        } catch (e) {
            console.error(`Unable to establish a collection handle in labelDAO: ${e}`)
        }
    }

    static async addLabel(userId, name) {
        try {
            const labelDoc = {
                _id: new ObjectId(),
                userId: new ObjectId(userId),
                name: name,
                createdAt: new Date(),
                updatedAt: new Date()
            }
            
            const result = await labels.insertOne(labelDoc)
            return result.insertedId
        } catch (e) {
            console.error(`Unable to add label: ${e}`)
            throw e
        }
    }

    static async getLabels(projectId) {
        try {
            const cursor = await labels.find(
                { projectId: new ObjectId(projectId) }
            ).sort({ createdAt: 1 })
            
            return await cursor.toArray()
        } catch (e) {
            console.error(`Unable to get labels: ${e}`)
            throw e
        }
    }

    static async updateLabel(labelId, name, color) {
        try {
            const updateFields = { updatedAt: new Date() };
            
            if (name) updateFields.name = name;
            if (color) updateFields.color = color;
            
            const result = await labels.updateOne(
                { _id: new ObjectId(labelId) },
                { $set: updateFields }
            )
            
            return result.modifiedCount > 0
        } catch (e) {
            console.error(`Unable to update label: ${e}`)
            throw e
        }
    }

    static async deleteLabel(labelId) {
        try {
            const result = await labels.deleteOne(
                { _id: new ObjectId(labelId) }
            )
            
            return result.deletedCount > 0
        } catch (e) {
            console.error(`Unable to delete label: ${e}`)
            throw e
        }
    }

    static async getLabelById(labelId) {
        try {
            return await labels.findOne(
                { _id: new ObjectId(labelId) }
            )
        } catch (e) {
            console.error(`Unable to get label by ID: ${e}`)
            throw e
        }
    }

    static async getLabelsByUserId(userId) {
        try {
            const cursor = await labels.find(
                { userId: new ObjectId(userId) }
            ).sort({ createdAt: 1 })
            
            return await cursor.toArray()
        } catch (e) {
            console.error(`Unable to get labels by user ID: ${e}`)
            throw e
        }
    }

    static async searchLabels(userId, query, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            
            // Using text search (requires text index)
            const cursor = labels.find({
                userId: new ObjectId(userId),
                $text: { $search: query }
            })
            .skip(skip)
            .limit(limit)
            .sort({ score: { $meta: "textScore" } })
            
            const total = await labels.countDocuments({
                userId: new ObjectId(userId),
                $text: { $search: query }
            })
            
            const labelsList = await cursor.toArray()
            
            return {
                labels: labelsList,
                total: total,
                page: page,
                limit: limit,
                pages: Math.ceil(total / limit)
            }
        } catch (e) {
            // Fallback to regex if text search fails
            try {
                const skip = (page - 1) * limit;
                
                const cursor = labels.find({
                    userId: new ObjectId(userId),
                    name: { $regex: query, $options: 'i' }
                })
                .skip(skip)
                .limit(limit)
                .sort({ name: 1 })
                
                const total = await labels.countDocuments({
                    userId: new ObjectId(userId),
                    name: { $regex: query, $options: 'i' }
                })
                
                const labelsList = await cursor.toArray()
                
                return {
                    labels: labelsList,
                    total: total,
                    page: page,
                    limit: limit,
                    pages: Math.ceil(total / limit)
                }
            } catch (fallbackError) {
                console.error(`Unable to search labels: ${fallbackError}`)
                throw fallbackError
            }
        }
    }

    static async countLabels(projectId) {
        try {
            return await labels.countDocuments(
                { projectId: new ObjectId(projectId) }
            )
        } catch (e) {
            console.error(`Unable to count labels: ${e}`)
            throw e
        }
    }

    static async getProjectsByLabelName(userId, labelName) {
        try {
            // This would require joining with projects collection
            // For now, return labels that match the name with their project IDs
            const matchingLabels = await labels.find({
                userId: new ObjectId(userId),
                name: { $regex: labelName, $options: 'i' }
            }).toArray()
            
            // Extract unique project IDs
            const projectIds = [...new Set(matchingLabels.map(label => label.projectId.toString()))]
            
            return projectIds
        } catch (e) {
            console.error(`Unable to get projects by label name: ${e}`)
            throw e
        }
    }

    static async getLabelsByProjectIds(projectIds) {
        try {
            const objectIds = projectIds.map(id => new ObjectId(id))
            const cursor = await labels.find(
                { projectId: { $in: objectIds } }
            ).sort({ createdAt: 1 })
            
            return await cursor.toArray()
        } catch (e) {
            console.error(`Unable to get labels by project IDs: ${e}`)
            throw e
        }
    }

    static async bulkDeleteLabelsByProject(projectId) {
        try {
            const result = await labels.deleteMany(
                { projectId: new ObjectId(projectId) }
            )
            
            return result.deletedCount
        } catch (e) {
            console.error(`Unable to bulk delete labels by project: ${e}`)
            throw e
        }
    }
}