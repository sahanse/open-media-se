import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}));

app.use(express.static("public"))
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.json({limit:"16kb"}))
app.use(cookieParser())

//import routes
import userRoutes from "./routes/user.routes.js"
import videoRoutes from "./routes/video.routes.js"    
import communityPostRoutes from "./routes/post.routes.js"
import likeRoutes from "./routes/likes.routes.js"
import commentRoutes from "./routes/commet.routes.js"
import viewsRoutes from "./routes/views.routes.js"
import categoryRoutes from "./routes/category.routes.js"
import adminRoutes from "./routes/admin.routes.js"

//routes declaration
app.use("/api/v1/users", userRoutes)
app.use("/api/v1/video", videoRoutes)
app.use("/api/v1/posts",communityPostRoutes)
app.use("/api/v1/like",likeRoutes);
app.use("/api/v1/comment", commentRoutes)
app.use("/api/v1/views",viewsRoutes)
app.use("/api/v1/category", categoryRoutes)
app.use("/api/v1/admin", adminRoutes)

export default app
