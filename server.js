import express from 'express'
import cors from 'cors'
import user_router from './src/routes/user_router.js'
import projectRoutes from "./src/routes/projectRoute.js";
import sectionRoutes from "./src/routes/sectionsRoute.js";
import labelRoutes from "./src/routes/labelRoute.js";
import tasksRoutes from "./src/routes/tasksRoute.js";
  
const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res)=>{
  console.log(req.headers)
  res.send('<h1>Backend here!</h1>')
})

app.use('/api/auth', user_router)
app.use("/api/projects", projectRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/labels", labelRoutes);
app.use("/api/tasks", tasksRoutes);

export default app