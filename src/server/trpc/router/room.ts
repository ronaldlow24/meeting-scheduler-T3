import { z } from "zod";

import { router, publicProcedure } from "../trpc";

export const roomRouter = router({
  createRoom: publicProcedure
    .input(z.object({ text: z.string().nullish() }).nullish())
    .query(({ input }) => {
      return {
        greeting: `Hello ${input?.text ?? "world"}`,
      };
    }),
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.meetingRoom.findMany();
  }),
});
