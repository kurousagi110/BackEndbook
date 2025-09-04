import app from './server.js'
import mongodb from "mongodb"
import dotenv from "dotenv"
import userDAO from './src/models/userDAO.js'
import sectionDAO from './src/models/sectionsDAO.js'
import projectDAO from './src/models/projectDAO.js'
import labelDAO from './src/models/labelDAO.js'
import taskDAO from './src/models/taskDAO.js'

 
async function main(){                              
  
  dotenv.config()                                                          
    
  const client = new mongodb.MongoClient(process.env.MOVIEREVIEWS_DB_URI)
      
  const port = process.env.PORT || 5000
  try {
    await client.connect()
    await userDAO.injectDB(client)
    await sectionDAO.injectDB(client)
    await projectDAO.injectDB(client)
    await labelDAO.injectDB(client)
    await taskDAO.injectDB(client)

    app.listen(port, ()=>{
        console.log(`Server is running on port ${port}`)
    })
 
  } catch (e) {
      console.error(e)                                                    
      process.exit(1)
  } 
}
 
main().catch(console.error)