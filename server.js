import express from 'express'
import cors from 'cors'
import user_router from './src/routes/user_router.js'
import bookRouter from './src/routes/bookRoute.js';
import dotenv from 'dotenv'
import commentRouter from './src/routes/commentRoute.js'  
const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res)=>{
  console.log(req.headers)
  res.send('<h1>Backend here!</h1>')
})

app.use('/api/users', user_router)
app.use("/api/books", bookRouter);
app.use("/api/comments", commentRouter);  // thêm route comments

dotenv.config();

export default app;