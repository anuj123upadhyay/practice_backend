import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express()


app.use(cookieParser())

app.use(cors({
   origin: process.env.CORS_ORIGIN,
   credentials: true
})) // use() method is used for middleware.

app.use(express.json({
   limit: "16kb"
}))
app.use(express.urlencoded({ extended : true, limit:"16kb"}))
app.use(express.static("public"))//static is used as cache memory to store data on ourserver such as img or icons



//routes 

import userRouter from "./routes/user.routes.js"


//routes declaration 

app.use("/api/v1/users",userRouter)// this will act as prefix






export default app