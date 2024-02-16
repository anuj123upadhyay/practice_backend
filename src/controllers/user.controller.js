import { asyncHandler } from "../utils/asynHandler.js"
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"

import  jwt from "jsonwebtoken"





const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerUser = asyncHandler( async(req,res)=>{
    //steps to register 
    //steps
    // get user details from  frontend
    //validation - not empty
    // check if user already exist: username, email ke basis per
    //check for images, check for avatar( images hai yaa nahi hai )
    //upload them to cloudinary, check avatar gaya hai yaa nahi
    //create user object - create entry in DB(MONGODB)
    //remove password and refresh token field from response(to frontend(user))
    //check for user creation
         // return response if user created successfully 
         //return error if not created
 
     
 
     const {fullName, username, email,password} = req.body
     // console.log("email:", email);
 
     // if(fullName === ""){
     //     throw new ApiError(400,"fullName is required")
     // } we can check the each field in the same way 
     // but experieced programmer wirte it as
     if(
         [fullName,email,username,password].some((field)=> field?.trim()==="")
     ){
         throw new ApiError(400, "All fields are required")
     }
 
     const existedUser = await User.findOne({
         $or:[{username},{email}]// in dono mae se koi ek bhi mil jae
     })
     if(existedUser){
         throw new ApiError(409,"User with email or username alredy exist")
     }
     
     // file kaa access given by multer since we have used middleware
     const avatarLocalPath =  req.files?.avatar[0]?.path;
     // const coverImageLocalPath =  req.files?.coverImage[0]?.path;// somewhat advanced
     // classsic way
    //  let coverImageLocalPath;
    //  if(req.files && Array.isArray(req.files.coverImage) && req.file.coverImage.length > 0){
    //      coverImageLocalPath = req.files.coverImage[0].path;
    //  }
     // console.log(req.files)
 
     if(!avatarLocalPath){
         throw new ApiError(400,"Avatar file is required");
     }
 
     const avatar = await uploadOnCloudinary(avatarLocalPath)
     
 
     if(!avatar){
         throw new ApiError(400,"Avatar file is required");
     }
 
 
     const user = await User.create({
         
         avatar: avatar.url,
         email,
         password,
         username: username.toLowerCase()
         
 
     })
     const createdUser = await User.findById(user._id).select(
         "-password -refreshToken"
     )
     if(!createdUser){
         throw new ApiError(500,"Something went wrong while registering the user")
     }
 
     return res.status(201).json(
         new ApiResponse(200,createdUser, "user registered Successfully")
     )
 
   
 })


 const loginUser = asyncHandler(async (req, res) =>{
    

    const {email, username, password} = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }
    // const isPasswordValid = await user.isPasswordCorrect(password)
    
// const  isPasswordCorrect = async(password) => {
//     const user = await User.findOne({email})
//     const finalPassword =  bcrypt.compare(password,user.password)
//     return finalPassword
//     }

    const isPasswordValid =  await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
     throw new ApiError(401, "Invalid user credentials")
     }

   const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // cookies generation
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})



const logOut = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1 // this remove the refreshtoken from the document
            }
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly:true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user Logout successfully"))

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken // if a aperson uses  mobile
    if(!refreshAccessToken){
        throw new ApiError(400,"Unauthorized Access")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken._id )
        if(!user){
            throw new ApiError(400,"Invalid refresh Token")
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(400,"refresh Token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        return res
        .status(200)
        .cookies("accessToken", accessToken,options)
        .cookies("refreshToken", newRefreshToken,options)
        .json(new ApiResponse(200,error?.message ||"Invalid Refresh Token"))
    } catch (error) {
        
    }
})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body
    const user = await User.findById(user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Old Password")

    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {},"Password changed successfully"))
})


const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(200, req.user,"currrent user fetched successfully")
})



const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {username,email} = req.body
    if(!username && !email){
        throw new ApiError(400,"all  are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                username: username.toLowerCase(),
                email:email
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res
    .status(200)
    .json( new ApiResponse(200, user, "Account details updated successfully"))
})

const updateAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.files?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"error while loading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")
    return res.status(200)
    .json(
        new ApiResponse(200, user, "avatar  updated successfully")
    )
})



 export {
    registerUser,
    loginUser,
    logOut ,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
 }