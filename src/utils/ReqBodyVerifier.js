import {AsyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"

const verifyBody = async(body,checkData, checkLength)=>{
    //make sure req.body is available and it has data
    const bodyKeys = Object.keys(body);
    if(!body || bodyKeys.length===0) throw new ApiError(400, "please provide data top continue");

    //if user has provided check length then chcec by length 
    if(bodyKeys.length !== checkLength) throw new ApiError(400, "All datas are required")

    //check any non required data available and they are not null
    for(let val in body){
        if(!checkData.includes(val)) throw new ApiError(400, `Unidentified field ${val}`)
        if(body[val].trim() === "") throw new ApiError(400, `Empty fields not allowed Got an empty field at ${val}`)  
    }
    
    return true
}

export {verifyBody}
