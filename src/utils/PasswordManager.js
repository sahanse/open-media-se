import bcrypt from "bcrypt"

const hashPass= (password)=>{
    return bcrypt.hash(password, 10)
}


const comparePass=(userPass, storedPass)=>{
    return bcrypt.compare(userPass, storedPass)
}

export {hashPass, comparePass}
