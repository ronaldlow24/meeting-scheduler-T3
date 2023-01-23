import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { isLoggedIn } from "../../utils/session";

import { type Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});
 
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(async ({ next, ctx }) => {

  const isSessionLogin = await isLoggedIn({req : ctx.request.req, res : ctx.request.res})

  if (!isSessionLogin) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
    });
  }

  return next();
});

export const protectedProcedure = t.procedure.use(isAuthed);

export const router = t.router;
