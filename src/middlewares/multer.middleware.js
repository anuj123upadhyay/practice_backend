import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null,"./public/temp")
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)// cb here is callback  
    }
    })
     
  
 export  const upload = multer({
     storage,
    })