import jwt from "jsonwebtoken"

const generateAccessToken=async(id, fullname, username, email)=>{

    return jwt.sign(
    {
        id,
        fullname,
        username,
        email
    }, 
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    })
}

const generateRefreshToken=async(id)=>{
    return jwt.sign(
    {
        id
    }, 
    process.env.REFRESH_TOKEN_SECRET, 
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    })
}

export {generateAccessToken, generateRefreshToken}