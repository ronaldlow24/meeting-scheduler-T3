import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import z from "zod";

const FromEmail = "ron556611@gmail.com";

const transporter = nodemailer.createTransport({
    host: "smtp-relay.sendinblue.com",
    port: 587,
    auth: {
        user: FromEmail,
        pass: "dQrN9zJXRDtfhV5Y",
    },
});

export const SendEmail = (to: string | string[], subject: string, text: string, html : boolean = false) => {

    //validate email
    if (to instanceof Array) {
        for (const email of to) {
            if (!ValidateEmail(email)) {
                throw new Error("Invalid email address");
            }
        }
    } else {
        if (!ValidateEmail(to)) {
            throw new Error("Invalid email address");
        }
    }

    const mailOptions : Mail.Options = {
        from: FromEmail,
        to: to,
        subject: subject,
        text: html ? undefined : text,
        html: html ? text : undefined,
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });
};

export const ValidateEmail = (email: string) => {
    const emailSchema = z.string().email();
    return emailSchema.safeParse(email).success;
}