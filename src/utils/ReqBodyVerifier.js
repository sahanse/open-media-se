import {ApiError} from "../utils/ApiError.js"
import fs from "fs"

const verifyBody = async(body, checkData, checkLength=null, files={})=>{

    const removeFiles =async()=>{

    const filesKeys=Object.keys(files);
    if(filesKeys.includes("avatar")){
        const avatarPath = files.avatar[0].path;
        fs.unlinkSync(avatarPath)
    }

    if(filesKeys.includes("coverImage")){
        const coverImagePath = files.coverImage[0].path;
        fs.unlinkSync(coverImagePath)
    }
}

    //make sure req.body is available and it has data
    const bodyKeys = Object.keys(body);
    if(bodyKeys.length===0){
        removeFiles()
        throw new ApiError(400, "please provide data to continue");
    
}

    //if user has provided check length then chcec by length 
    if(checkLength !== null){
    if(bodyKeys.length !== checkLength){
        removeFiles()
        throw new ApiError(400, "All datas are required")
    }
}

    //check any non required data available and they are not null
    for(let val in body){
        if(!checkData.includes(val)){
            removeFiles()
            throw new ApiError(400, `Unidentified field ${val}`)
        } 
        if(body[val].trim() === ""){
            removeFiles()
            throw new ApiError(400, `Empty fields not allowed Got an empty field at ${val}`)
        } 
    }
    
    return true
}

export {verifyBody}