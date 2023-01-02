import { z } from "zod";
import { User } from "../../../types/User";
import { isLoggedIn, login, logout } from "../../../utils/session";
import { router, publicProcedure } from "../trpc";

export const roomRouter = router({
    createRoom: publicProcedure
        .input(
            z.object({
                title: z.string(),
                hostName : z.string(),
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

            if (!creationResult){
                return {
                    result: false,
                    data: null,
                };
            }

            //create one attendee as host
            const host = await ctx.prisma.meetingRoomAttendee.create({
                data: {
                    meetingRoomId: creationResult.id,
                    attendeeName: input.hostName,
                    isHost : true,
                },
            });

            const user = {
                meetingRoomId: creationResult.id,
                attendeeName: host.attendeeName,
            } as User;

            await login(ctx.request, user);

            return {
                result: true,
                data: creationResult,
            };
        }),
    joinRoom: publicProcedure
        .input(
            z.object({
                secretKey: z.string(),
                attendeeName: z.string(),
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
                        attendeeName: input.attendeeName,
                    }
                },
            });

            if (!attendee){
                attendee = await ctx.prisma.meetingRoomAttendee.create({
                    data: {
                        meetingRoomId: room.id,
                        attendeeName: input.attendeeName,
                        isHost : false,
                    },
                });
            }

            const user = {
                meetingRoomId: room.id,
                attendeeName: attendee.attendeeName,
            } as User;

            await login(ctx.request, user);

            return {
                result: true,
                data: attendee,
            };
        }),
    logout: publicProcedure
        .mutation(async ({ ctx }) => {

            await logout(ctx.request);

            return {
                result: true,
            }
        }),
    checkLogin: publicProcedure
        .query(async ({ ctx }) => {

            const result = await isLoggedIn(ctx.request);

            return {
                result: result,
            };
        }),
});
