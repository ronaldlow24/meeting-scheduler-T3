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
          //create and return the room
          const creationResult = ctx.prisma.meetingRoom.create({
            data: {
              title: input.title,
              secretKey 
              availableStartDateTime: input.startTime,
              availableEndDateTime: input.endTime,
              numberOfAttendees: input.numberOfAttendees,
              createdAt: new Date(),
            }
          })

          if(!creationResult) return {
            result: false,
            data: null
          }
            return {
                result: true,
                data : creationResult
            };
        }),
    joinRoom: publicProcedure
        .input(
            z.object(
              {
                secret: z.string(),
                name: z.string(),
              }
            ))
        .mutation(({ input,ctx }) => {
          //join the room
          const room = ctx.prisma.meetingRoom.findUnique({
            where: {
              secret: input.secret
            }
          })



          const joinResult = ctx.prisma.meetingRoom.update({
            where: {
              secret: input.secret
            },
            data: {
              attendees: {
                create: {
                  name: input.name,
                  createdAt: new Date(),
                }
              }
            }
          })

          if(!joinResult) return {
            result: false,
            data: null
          }

          return {  
            result: true, 
            data: joinResult
          };
        }),
    getAll: publicProcedure.query(({ ctx }) => {
        return ctx.prisma.meetingRoom.findMany();
    }),
});
