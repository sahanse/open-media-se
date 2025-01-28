import dotenv from "dotenv"
import { app } from "./app.js"
import { db } from "./db/connection/index.js"

dotenv.config({
    path:"./.env"
})

db.connect().then(()=>{
    app.listen(process.env.EXPRESS_PORT || 8000, ()=>{
        console.log(`listening to port: ${process.env.EXPRESS_PORT || 8000}`)
    })
}).catch((error)=>{
    console.log('index.js ::', error)
    process.exit(1)
})


