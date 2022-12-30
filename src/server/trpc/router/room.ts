import { z } from "zod";

import { router, publicProcedure } from "../trpc";

export const roomRouter = router({
    createRoom: publicProcedure
        .input(
            z.object({
                title: z.string(),
                startTime: z.date(),
                endTime: z.date(),
                numberOfAttendees: z.number(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            //create and return the room
            const creationResult = await ctx.prisma.meetingRoom.create({
                data: {
                    title: input.title,
                    secretKey: (
                        Math.random().toString(36).substring(2, 15) +
                        Math.random().toString(36).substring(2, 15)
                    ).toString(),
                    availableStartDateTime: input.startTime,
                    availableEndDateTime: input.endTime,
                    numberOfAttendees: input.numberOfAttendees,
                },
            });

            if (!creationResult)
                return {
                    result: false,
                    data: null,
                };
            return {
                result: true,
                data: creationResult,
            };
        }),
    joinRoom: publicProcedure
        .input(
            z.object({
                secretKey: z.string(),
                name: z.string(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            //join the room
            const room = await ctx.prisma.meetingRoom.findUnique({
                where: {
                    secretKey: input.secretKey,
                },
            });

            if (!room)
                return {
                    result: false,
                    data: null,
                    error: "Room not found",
                };

            //check if the room is full
            const attendees = await ctx.prisma.meetingRoomAttendee.findMany({
                where: {
                    meetingRoomId: room.id,
                },
            });

            if (attendees.length >= room.numberOfAttendees)
                return {
                    result: false,
                    data: null,
                    error: "Room is full",
                };

            //check if the user is already in the room
            let attendee = await ctx.prisma.meetingRoomAttendee.findUnique({
                where: {
                    meetingRoomId_attendeeName : {
                        meetingRoomId: room.id,
                        attendeeName: input.name,
                    }
                },
            });

            if (!attendee){
                attendee = await ctx.prisma.meetingRoomAttendee.create({
                    data: {
                        meetingRoomId: room.id,
                        attendeeName: input.name,
                    },
                });
            }
            return {
                result: true,
                data: attendee,
            };
        }),
    getAll: publicProcedure.query(({ ctx }) => {
        return ctx.prisma.meetingRoom.findMany();
    }),
});
