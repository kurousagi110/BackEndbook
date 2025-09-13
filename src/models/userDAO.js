// models/userDAO.js
import mongodb from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import e from "express";

const { ObjectId } = mongodb;

let users;
let books; // Tham chiếu collection books để kiểm tra tồn tại khi thêm vào favoriteBooks

export default class UserDAO {
    static async injectDB(conn) {
        if (users) return;
        try {
            users = await conn
                .db(process.env.MOVIEREVIEWS_DB_NAME)
                .collection("users");
            books = await conn
                .db(process.env.MOVIEREVIEWS_DB_NAME)
                .collection("books");
        } catch (e) {
            console.error(`Unable to establish collection handle in userDAO: ${e}`);
        }
    }

    static async register(email, password, username, name, avatar) {
        try {
            if (!password) {
                throw new Error("Password is required");
            }

            if (password.length < 8) {
                throw new Error("Password must be at least 8 characters long");
            }

            // // Tạo query kiểm tra user tồn tại, chỉ kiểm tra email nếu email được cung cấp
            // const query = { username: username.trim() };
            // if (email !== undefined && email !== null && email !== '') {
            //     query.$or = [
            //         { email: email.toLowerCase().trim() },
            //         { username: username.trim() }
            //     ];
            // }

            const existingUser = await users.findOne(email !== undefined && email !== null && email !== '' ? { email: email.toLowerCase() } : { username: username });

            if (existingUser) {
                // Chỉ kiểm tra email nếu email được cung cấp
                if (email !== undefined && email !== null && email !== '' &&
                    existingUser.email === email.toLowerCase()) {
                    throw new Error("User with this email already exists");
                }
                if (existingUser.username === username) {
                    throw new Error("Username is already taken");
                }
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            const newUser = {
                password: hashedPassword,
                username: username,
                email: email,
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                favoriteBooks: [],
                name: name,
                avatar: avatar,
            };

            // Chỉ thêm email nếu email được cung cấp
            if (email !== undefined && email !== null && email !== '') {
                newUser.email = email.toLowerCase().trim();
            }

            const result = await users.insertOne(newUser);
            return result.insertedId;
        } catch (error) {
            console.error(`Unable to register user: ${error.message}`);
            throw error;
        }
    }

    static async login(identifier, password) {
        try {
            if (!identifier || !password) {
                throw new Error("Email/username and password are required");
            }

            console.log("Login attempt:", { identifier: identifier.trim() });

            // Tìm user bằng username hoặc email
            let user = await users.findOne({
                $or: [
                    { username: identifier.trim() },
                    { email: identifier.trim().toLowerCase() }
                ]
            });

            if (!user) {
                throw new Error("Invalid email/username or password");
            }

            if (user.isActive === false) {
                throw new Error("Account is deactivated. Please contact support.");
            }

            // Kiểm tra password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                throw new Error("Invalid email/username or password");
            }

            if (!process.env.JWT_SECRET) {
                throw new Error("Server misconfigured: JWT_SECRET is missing");
            }

            // Tạo JWT token
            const token = jwt.sign(
                {
                    id: user._id,
                    email: user.email,
                    username: user.username
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || "23h" }
            );

            const now = new Date();

            // Cập nhật last login
            await users.updateOne(
                { _id: user._id },
                {
                    $set: {
                        lastLogin: now,
                        updatedAt: now
                    }
                }
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
        const doc = await users.findOne({ _id: new ObjectId(userId) }, { projection: { favoriteBooks: 1 } });
        console.log(doc)
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
        return { actionApplied: op === "add" ? "added" : "removed", user: result.value };
    }


    static async getFavoriteBooks(userId) {
        if (!userId) throw new Error("User ID is required");
        if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID format");

        // Lấy user để lấy danh sách ID sách yêu thích
        const user = await users.findOne(
            { _id: new ObjectId(userId) },
            { projection: { favoriteBooks: 1 } }
        );
        if (!user) throw new Error("User not found");

        const favIdsRaw = user.favoriteBooks || [];
        if (favIdsRaw.length === 0) return [];

        // Chuẩn hoá ID về ObjectId (phòng khi lưu dạng string)
        const favIds = favIdsRaw.map((id) =>
            typeof id === "string" ? new ObjectId(id) : id
        );

        // Lấy toàn bộ sách bằng một query
        const booksDocs = await books
            .find({ _id: { $in: favIds } })
            .toArray();

        // Giữ nguyên thứ tự theo mảng favoriteBooks
        const orderMap = new Map(favIds.map((id, idx) => [id.toHexString(), idx]));
        booksDocs.sort(
            (a, b) =>
                orderMap.get(a._id.toHexString()) - orderMap.get(b._id.toHexString())
        );

        return booksDocs;
    }
    static async deleteAllFavorite(userId) {
        if (!userId) throw new Error("User ID is required");
        if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID format");

        const _id = new ObjectId(userId);

        // Lấy danh sách hiện tại để biết đã có bao nhiêu mục sẽ bị xoá
        const current = await users.findOne(
            { _id: new ObjectId(userId)},
            { projection: { favoriteBooks: 1 } }
        );

        const removedCount = (current.favoriteBooks || []).length;

        // Xoá toàn bộ favorites
        const result = await users.findOneAndUpdate(
            { _id },
            { $set: { favoriteBooks: [], updatedAt: new Date() } },
            { returnDocument: "after", projection: { password: 0 } }
        );
        return { removedCount, user: result.value };
    }

}
