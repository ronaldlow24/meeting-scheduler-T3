import z from "zod";

export const ValidateEmail = (email: string) => {
    const emailSchema = z.string().email();
    return emailSchema.safeParse(email).success;
}

export const ToISOStringLocal = (date: Date) => {
    const tzo = -date.getTimezoneOffset();
    const dif = tzo >= 0 ? '+' : '-';
    const pad = (num: number) => {
        const norm = Math.floor(Math.abs(num));
        return (norm < 10 ? '0' : '') + norm;
    }
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        dif + pad(tzo / 60) +
        ':' + pad(tzo % 60);
}