import app from './server.js'
import mongodb from "mongodb"
import dotenv from "dotenv"
import userDAO from './src/models/userDAO.js'
import bookDAO from './src/models/bookDAO.js'
import CommentDAO from './src/models/commentDAO.js'

 
async function main(){                              
  
  dotenv.config()                                                          
    
  const client = new mongodb.MongoClient(process.env.MOVIEREVIEWS_DB_URI)
      
  const port = process.env.PORT || 5000
  try {
    await client.connect()
    await userDAO.injectDB(client)
    await bookDAO.injectDB(client)
    await CommentDAO.injectDB(client)

    app.listen(port, ()=>{
        console.log(`Server is running on port ${port}`)
    })
 
  } catch (e) {
      console.error(e)                                                    
      process.exit(1)
  } 
}
 
main().catch(console.error)