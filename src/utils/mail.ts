import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { ValidateEmail } from "./common";

const FromEmail = process.env.MAIL_SENDER;

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

export const SendEmail = (to: string | string[], subject: string, text: string, html = false) => {

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

