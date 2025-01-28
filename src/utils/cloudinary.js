import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

//cloudinray connection configuration
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary=async(localFilePath)=>{
    try{

        //return null if no localPath
        if(!localFilePath) return null;

        //upload on cloudinary
        const response=await cloudinary.uploader.upload(localFilePath, {resource_type:"auto"});
        console.log("File uploaded on cloudinary successFully", response.url)
        return response;
    }catch(error){

        //remove file from temp if not uploaded
        fs.unlinkSync(localFilePath)
        console.log("utils :: cloudinary :: error", error)
        return null
    }
}

export {uploadOnCloudinary}
