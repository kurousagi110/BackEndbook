// models/userDAO.js
import mongodb from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const { ObjectId } = mongodb;

let users;

export default class UserDAO {
    static async injectDB(conn) {
        if (users) return;
        try {
            users = await conn
                .db(process.env.MOVIEREVIEWS_DB_NAME)
                .collection("users");
        } catch (e) {
            console.error(`Unable to establish collection handle in userDAO: ${e}`);
        }
    }

    static async register(email, password, username, name, avatar) {
        try {
            if ( !password ) {
                throw new Error(" Password are required");
            }

            const existingUser = await users.findOne({
                $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }],
            });
            if (existingUser) {
            // Chỉ kiểm tra email nếu email được cung cấp
            if (email !== undefined && email !== null && email !== '' && 
                existingUser.email === email.toLowerCase().trim()) {
                throw new Error("User with this email already exists");
            }
            if (existingUser.username === username.trim()) {
                throw new Error("Username is already taken");
            }

            if (password.length < 8)
                throw new Error("Password must be at least 8 characters long");

            const hashedPassword = await bcrypt.hash(password, 12);

            const newUser = {
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                username: username.trim(),
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                favoriteBooks: [],
                name: name,
                avatar: avatar,
            };

            const result = await users.insertOne(newUser);
            return result.insertedId;
        } catch (error) {
            console.error(`Unable to register user: ${error.message}`);
            throw error;
        }
    }

    static async login(identifier, password) {
        try {
            if (!identifier || !password)
                throw new Error("Email/username and password are required");

            const isEmail = identifier.includes("@");
            let user;

            if (isEmail) {
                const normalizedEmail = identifier.toLowerCase().trim();
                user = await users.findOne({
                    email: { $regex: new RegExp(`^${normalizedEmail}$`, "i") },
                });
            } else {
                const normalizedUsername = identifier.trim();
                user = await users.findOne({
                    username: { $regex: new RegExp(`^${normalizedUsername}$`, "i") },
                });
            }

            if (!user) throw new Error("Invalid email/username or password");
            if (user.isActive === false)
                throw new Error("Account is deactivated. Please contact support.");

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) throw new Error("Invalid email/username or password");

            if (!process.env.JWT_SECRET) {
                throw new Error("Server misconfigured: JWT_SECRET is missing");
            }

            const token = jwt.sign(
                { id: user._id, email: user.email, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
            );

            const now = new Date();
            await users.updateOne(
                { _id: user._id },
                { $set: { lastLogin: now, updatedAt: now } }
            );

            return {
                user: {
                    _id: user._id,
                    email: user.email,
                    username: user.username,
                    createdAt: user.createdAt,
                    lastLogin: now,
                    isActive: user.isActive,
                    name: user.name,
                    avatar: user.avatar,
                },
                token,
                expiresIn: process.env.JWT_EXPIRES_IN || "1h",
            };
        } catch (error) {
            console.error(`Login error: ${error.message}`);
            throw error;
        }
    }

    static async getUserById(userId) {
        if (!userId) throw new Error("User ID is required");
        if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID format");

        const user = await users.findOne(
            { _id: new ObjectId(userId) },
            { projection: { password: 0 } }
        );
        if (!user) throw new Error("User not found");
        return user;
    }

    static async updateUser(userId, updateData) {
        if (!userId) throw new Error("User ID is required");
        if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID format");
        if (!updateData || Object.keys(updateData).length === 0)
            throw new Error("No update data provided");

        // Chuẩn hoá + chỉ cho phép một số field
        const allowedFields = ["email", "username", "name", "avatar"];
        const filteredUpdate = {};
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) filteredUpdate[field] = updateData[field];
        }

        if (filteredUpdate.email) {
            filteredUpdate.email = filteredUpdate.email.toLowerCase().trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(filteredUpdate.email))
                throw new Error("Invalid email format");
        }
        if (filteredUpdate.username) {
            filteredUpdate.username = filteredUpdate.username.trim();
        }
        // Tránh trùng email/username với user khác
        if (filteredUpdate.email || filteredUpdate.username) {
            const dup = await users.findOne({
                _id: { $ne: new ObjectId(userId) },
                $or: [
                    filteredUpdate.email ? { email: filteredUpdate.email } : null,
                    filteredUpdate.username ? { username: filteredUpdate.username } : null,
                ].filter(Boolean),
            });
            if (dup) {
                if (dup.email === filteredUpdate.email)
                    throw new Error("User with this email already exists");
                if (dup.username === filteredUpdate.username)
                    throw new Error("Username is already taken");
            }
        }

        filteredUpdate.updatedAt = new Date();

        const result = await users.findOneAndUpdate(
            { _id: new ObjectId(userId) },
            { $set: filteredUpdate },
            { returnDocument: "after", projection: { password: 0 } }
        );

        if (!result.value) throw new Error("User not found");
        return result.value;
    }

    static async deactivateUser(userId) {
        if (!userId) throw new Error("User ID is required");
        if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID format");

        const result = await users.findOneAndUpdate(
            { _id: new ObjectId(userId) },
            { $set: { isActive: false, updatedAt: new Date() } },
            { returnDocument: "after", projection: { password: 0 } }
        );

        if (!result.value) throw new Error("User not found");
        return result.value;
    }
    // models/userDAO.js
    static async updateFavoriteBook(userId, bookId, action = "toggle") {
        if (!userId) throw new Error("User ID is required");
        if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID format");
        if (!bookId) throw new Error("Book ID is required");
        if (!ObjectId.isValid(bookId)) throw new Error("Invalid book ID format");

        const _id = new ObjectId(userId);
        const bId = new ObjectId(bookId);

        // Lấy danh sách hiện tại để quyết định
        const doc = await users.findOne({ _id }, { projection: { favoriteBooks: 1 } });
        if (!doc) throw new Error("User not found");

        let op; // 'add' | 'remove'
        if (action === "add" || action === "remove") {
            op = action;
        } else { // toggle
            const exists = (doc.favoriteBooks || []).some(x => x.equals(bId));
            op = exists ? "remove" : "add";
        }

        const update =
            op === "add"
                ? { $addToSet: { favoriteBooks: bId }, $set: { updatedAt: new Date() } }
                : { $pull: { favoriteBooks: bId }, $set: { updatedAt: new Date() } };

        const result = await users.findOneAndUpdate(
            { _id },
            update,
            { returnDocument: "after", projection: { password: 0 } }
        );
        if (!result.value) throw new Error("User not found");
        return { actionApplied: op === "add" ? "added" : "removed", user: result.value };
    }

}
