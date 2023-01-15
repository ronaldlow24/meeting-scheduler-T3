import z from "zod";

export const ValidateEmail = (email: string) => {
    const emailSchema = z.string().email();
    return emailSchema.safeParse(email).success;
}