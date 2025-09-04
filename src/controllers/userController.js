import userDAO from "../models/userDAO.js";

export default class UserController {
    static async register(req, res) {
        const { email, password } = req.body
        try {
            const userId = await userDAO.register(email, password)
            res.status(201).json({ message: "User registered successfully" })
        } catch (e) {
            res.status(500).json({ error: e.message })
        }
    }

    static async login(req, res) {
        const { email, password } = req.body
        try {
            const user = await userDAO.login(email, password)
            res.status(200).json(user)
        } catch (e) {
            res.status(500).json({ error: e.message })
        }
    }
}