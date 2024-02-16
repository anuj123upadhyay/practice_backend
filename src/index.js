import dotenv from "dotenv";
import connectDB from "./db/index.js"
import  app  from './app.js' ;

dotenv.config({
    path:"./.env"
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 6051,()=>{
        console.log(`Serveris running at Port : ${process.env.PORT} `);
        app.on("error",(error)=>{
            console.log("Error: ", error);
            throw error
        })
    });

})
.catch((err)=>{
    console.log("MongoDb connection Failed !! ", err);
})