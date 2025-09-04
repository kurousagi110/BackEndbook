import express from 'express'
import UserController from '../controllers/userController.js'

const user_router = express.Router()

// user_router.route('/').post(UserController.apiAddUser)
// user_router.route('/').put(UserController.apiUpdateUser)
// user_router.route('/').delete(UserController.apiDeleteUser)

user_router.route('/register')
    .post(UserController.register)

user_router.route('/login')
    .post(UserController.login)

export default user_router