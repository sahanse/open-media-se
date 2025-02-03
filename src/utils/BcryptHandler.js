import bcrypt from "bcrypt"

const hashPass=async(password)=>{
    if(!password){
        return null
    }

    try{
        const pepperedPass= password+process.env.BCRYPT_PEPPER;
        const hashedPass= await bcrypt.hash(pepperedPass, 10);
        return hashedPass
    }catch(error){
        console.log("utils :: BcryptHandler :: hashPass :: error", error)
        return null
    }

}

const comparePass=async(newPass, oldPass)=>{
    if([newPass, oldPass].some((field)=> field.trim()==="")){
        return null
    }

    try{
        const comparePass= await bcrypt.compare(newPass, oldPass);
        return comparePass
    }catch(error){
        console.log("Utils :: BcryptHandler :: comparePass :: error", error)
        return null
    }
}

export {hashPass, comparePass}
