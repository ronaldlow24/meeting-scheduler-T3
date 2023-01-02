import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import { type Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});
 
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.request.req.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
    });
  }
  return next();
});

export const protectedProcedure = t.procedure.use(isAuthed);

export const router = t.router;
