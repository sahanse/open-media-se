import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.log("utils :: Cloudinary :: uploadOnCloudinary :: error", error)
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }


};

const deleteFromCloudinary = async (filePath) => {
    const extractPublicId = (imageUrl) => {
        const parts = imageUrl.split('/');
        
        // Find index of 'upload' and extract the public ID after it
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1 || uploadIndex + 1 >= parts.length) {
            return null; // Invalid URL
        }

        // Extract public ID (ignore version number)
        const publicIdWithVersion = parts.slice(uploadIndex + 1).join('/'); // v1738918450/mwclptvgkwx4akjvdadt.jpg
        
        // Remove version if present (e.g., v1738918450/mwclptvgkwx4akjvdadt → mwclptvgkwx4akjvdadt)
        const publicId = publicIdWithVersion.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
        return publicId;
    };

    const publicId = extractPublicId(filePath);

    if (!publicId) {
        console.log("Invalid Cloudinary URL");
        return null;
    }

    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error("utils :: Cloudinary :: deleteFromCloudinary :: error", error);
        return null;
    }
};

export {uploadOnCloudinary, deleteFromCloudinary}