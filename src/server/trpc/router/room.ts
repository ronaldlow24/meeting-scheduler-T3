import { z } from "zod";

import { router, publicProcedure } from "../trpc";

export const roomRouter = router({
    createRoom: publicProcedure
        .input(
            z.object(
              { 
                title: z.string(),
                startTime: z.date(),
                endTime: z.date(),
                numberOfAttendees: z.number(),
              }
            ))
        .mutation(({ input,ctx }) => {
          ctx.prisma.meetingRoom.create({
            data: {
              title: input.title,
              availableStartDateTime: input.startTime,
              availableEndDateTime: input.endTime,
              numberOfAttendees: input.numberOfAttendees,
              createdAt: new Date(),
            }
          })
            return {
                result: true,
                data : input
            };
        }),
    getAll: publicProcedure.query(({ ctx }) => {
        return ctx.prisma.meetingRoom.findMany();
    }),
});
