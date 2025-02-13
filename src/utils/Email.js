import nodemailer from "nodemailer";

const mailSender=async(to, subject, text)=>{
    const transporter = nodemailer.createTransport({
        service:'gmail',
        auth:{
            user:process.env.NODEMAILER_USER,
            pass:process.env.NODEMAILER_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    
    //email options
    const mailOptions = {
        from:process.env.NODEMAILER_USER,
        to,
        subject,
        text
    }

    try{
        const sendMail = await transporter.sendMail(mailOptions)
        return sendMail
    }catch(error){
        console.log("utils :: Email.js :: mailSender :: error", error)
        return null
    }
}

export {mailSender}

