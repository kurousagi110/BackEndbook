import mongodb from "mongodb"
const ObjectId = mongodb.ObjectId

let tasks // Separate tasks collection
export default class taskDAO {
    static async injectDB(conn) {
        if (tasks) {
            return
        }
        try {
            tasks = await conn.db(process.env.MOVIEREVIEWS_DB_NAME).collection("tasks")
            // Create indexes for better performance
            await tasks.createIndex({ projectId: 1 })
            await tasks.createIndex({ sectionId: 1 })
            await tasks.createIndex({ assigneeId: 1 })
            await tasks.createIndex({ title: "text" })
        } catch (e) {
            console.error(`Unable to establish a collection handle in taskDAO: ${e}`)
        }
    }

    static async addTask(taskData) {
        try {
            const taskDoc = {
                _id: new ObjectId(),
                title: taskData.title,
                description: taskData.description || "",
                startAt: taskData.startAt ? new Date(taskData.startAt) : null,
                dueAt: taskData.dueAt ? new Date(taskData.dueAt) : null,
                priority: taskData.priority || "medium",
                labels: taskData.labels || [],
                projectId: new ObjectId(taskData.projectId),
                sectionId: taskData.sectionId ? new ObjectId(taskData.sectionId) : null,
                completed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: new ObjectId(taskData.userId)
            }
            
            const result = await tasks.insertOne(taskDoc)
            return result.insertedId
        } catch (e) {
            console.error(`Unable to add task: ${e}`)
            throw e
        }
    }

    static async getTasksByProject(projectId) {
        try {
            const cursor = await tasks.find(
                { projectId: new ObjectId(projectId) }
            ).sort({ createdAt: 1 })
            
            const tasksList = await cursor.toArray()
            
            // Format response to match API spec: id, title, completed
            return tasksList.map(task => ({
                id: task._id,
                title: task.title,
                completed: task.completed
            }))
        } catch (e) {
            console.error(`Unable to get tasks by project: ${e}`)
            throw e
        }
    }

    static async getTasksBySection(projectId, sectionId) {
        try {
            const cursor = await tasks.find({
                projectId: new ObjectId(projectId),
                sectionId: new ObjectId(sectionId)
            }).sort({ createdAt: 1 })
            
            return await cursor.toArray()
        } catch (e) {
            console.error(`Unable to get tasks by section: ${e}`)
            throw e
        }
    }

    static async updateTask(taskId, updateData) {
        try {
            const updateFields = { updatedAt: new Date() };
            
            // Add only the fields that are provided
            if (updateData.title !== undefined) updateFields.title = updateData.title;
            if (updateData.description !== undefined) updateFields.description = updateData.description;
            if (updateData.startAt !== undefined) updateFields.startAt = updateData.startAt ? new Date(updateData.startAt) : null;
            if (updateData.dueAt !== undefined) updateFields.dueAt = updateData.dueAt ? new Date(updateData.dueAt) : null;
            if (updateData.priority !== undefined) updateFields.priority = updateData.priority;
            if (updateData.labels !== undefined) updateFields.labels = updateData.labels;
            if (updateData.completed !== undefined) updateFields.completed = updateData.completed;
            
            const result = await tasks.updateOne(
                { _id: new ObjectId(taskId) },
                { $set: updateFields }
            )
            
            return result.modifiedCount > 0
        } catch (e) {
            console.error(`Unable to update task: ${e}`)
            throw e
        }
    }

    static async deleteTask(taskId) {
        try {
            const result = await tasks.deleteOne(
                { _id: new ObjectId(taskId) }
            )
            
            return result.deletedCount > 0
        } catch (e) {
            console.error(`Unable to delete task: ${e}`)
            throw e
        }
    }

    static async getTaskById(taskId) {
        try {
            return await tasks.findOne(
                { _id: new ObjectId(taskId) }
            )
        } catch (e) {
            console.error(`Unable to get task by ID: ${e}`)
            throw e
        }
    }

    static async getTasksByUserId(userId) {
        try {
            const cursor = await tasks.find(
                { userId: new ObjectId(userId) }
            ).sort({ createdAt: 1 })
            
            return await cursor.toArray()
        } catch (e) {
            console.error(`Unable to get tasks by user ID: ${e}`)
            throw e
        }
    }

    static async searchTasks(query, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            
            // Using text search (requires text index)
            const cursor = tasks.find({
                $text: { $search: query }
            })
            .skip(skip)
            .limit(limit)
            .sort({ score: { $meta: "textScore" } })
            
            const total = await tasks.countDocuments({
                $text: { $search: query }
            })
            
            const tasksList = await cursor.toArray()
            
            return {
                tasks: tasksList,
                total: total,
                page: page,
                limit: limit,
                pages: Math.ceil(total / limit)
            }
        } catch (e) {
            // Fallback to regex if text search fails
            try {
                const skip = (page - 1) * limit;
                
                const cursor = tasks.find({
                    title: { $regex: query, $options: 'i' }
                })
                .skip(skip)
                .limit(limit)
                .sort({ title: 1 })
                
                const total = await tasks.countDocuments({
                    title: { $regex: query, $options: 'i' }
                })
                
                const tasksList = await cursor.toArray()
                
                return {
                    tasks: tasksList,
                    total: total,
                    page: page,
                    limit: limit,
                    pages: Math.ceil(total / limit)
                }
            } catch (fallbackError) {
                console.error(`Unable to search tasks: ${fallbackError}`)
                throw fallbackError
            }
        }
    }

    static async updateTaskStatus(taskId, completed) {
        try {
            const result = await tasks.updateOne(
                { _id: new ObjectId(taskId) },
                { 
                    $set: { 
                        completed: completed,
                        updatedAt: new Date()
                    } 
                }
            )
            
            return result.modifiedCount > 0
        } catch (e) {
            console.error(`Unable to update task status: ${e}`)
            throw e
        }
    }

    static async addLabelToTask(taskId, labelId) {
        try {
            const result = await tasks.updateOne(
                { _id: new ObjectId(taskId) },
                { 
                    $addToSet: { labels: new ObjectId(labelId) },
                    $set: { updatedAt: new Date() }
                }
            )
            
            return result.modifiedCount > 0
        } catch (e) {
            console.error(`Unable to add label to task: ${e}`)
            throw e
        }
    }

    static async removeLabelFromTask(taskId, labelId) {
        try {
            const result = await tasks.updateOne(
                { _id: new ObjectId(taskId) },
                { 
                    $pull: { labels: new ObjectId(labelId) },
                    $set: { updatedAt: new Date() }
                }
            )
            
            return result.modifiedCount > 0
        } catch (e) {
            console.error(`Unable to remove label from task: ${e}`)
            throw e
        }
    }

    static async getTasksWithLabels(labelIds) {
        try {
            const objectIds = labelIds.map(id => new ObjectId(id))
            const cursor = await tasks.find(
                { labels: { $in: objectIds } }
            ).sort({ createdAt: 1 })
            
            return await cursor.toArray()
        } catch (e) {
            console.error(`Unable to get tasks with labels: ${e}`)
            throw e
        }
    }

    static async bulkUpdateTasksByProject(projectId, updateData) {
        try {
            const result = await tasks.updateMany(
                { projectId: new ObjectId(projectId) },
                { $set: updateData }
            )
            
            return result.modifiedCount
        } catch (e) {
            console.error(`Unable to bulk update tasks by project: ${e}`)
            throw e
        }
    }

    static async bulkDeleteTasksByProject(projectId) {
        try {
            const result = await tasks.deleteMany(
                { projectId: new ObjectId(projectId) }
            )
            
            return result.deletedCount
        } catch (e) {
            console.error(`Unable to bulk delete tasks by project: ${e}`)
            throw e
        }
    }

    static async bulkDeleteTasksBySection(sectionId) {
        try {
            const result = await tasks.deleteMany(
                { sectionId: new ObjectId(sectionId) }
            )
            
            return result.deletedCount
        } catch (e) {
            console.error(`Unable to bulk delete tasks by section: ${e}`)
            throw e
        }
    }
}