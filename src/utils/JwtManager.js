import jwt from "jsonwebtoken"

const generateAccessToken=(user)=>{
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    })
}

const generateRefreshToken=(id)=>{
    return jwt.sign(id, process.env.REFREH_TOKEN_SECRET, {
        expiresIn:process.env.REFREH_TOKEN_EXPIRY
    })
}

const generateOtpToken=(data)=>{
    return jwt.sign(data, process.env.OTP_TOKEN_SECRET, {
        expiresIn:process.env.OTP_TOKEN_EXPIRY
    })
}

export {generateAccessToken, generateRefreshToken, generateOtpToken}