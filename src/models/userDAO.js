import mongodb from "mongodb"
const ObjectId = mongodb.ObjectId
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

let users
export default class userDAO{
    static async injectDB(conn) {
        if (users) {
            return
        }
        try {
            users = await conn.db(process.env.MOVIEREVIEWS_DB_NAME).collection("users")
        } catch (e) {
            console.error(`Unable to establish a collection handle in userDAO: ${e}`)
        }
    }
    static async register(email, password) {
        try {
            const user = await users.findOne({ email })
            console.log("Registering user:", email)
            if (user) {
                throw new Error("User already exists")
            }
            const hashedPassword = await bcrypt.hash(password, 10)
            const addUser = {
                email,
                password: hashedPassword
            }
            const result = await users.insertOne(addUser)
            return result.insertedId
        } catch (e) {
            console.error(`Unable to register user in userDAO: ${e}`)
            throw e
        }
    }
    static async login(email, password) {
        try {
            const user = await users.findOne({ email })
            if (!user) {
                throw new Error("User not found")
            }
            const isValid = await bcrypt.compare(password, user.password)
            if (!isValid) {
                throw new Error("Invalid password")
            }
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' })
            // Optionally, you can remove the password field before returning the user object
            delete user.password
            // Return the user object with the token
            const result = { user, token }
            return result
        } catch (e) {
            console.error(`Unable to login user in userDAO: ${e}`)
            throw e
        }
    }

}