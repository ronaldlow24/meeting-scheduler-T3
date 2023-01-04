import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { User } from "../../../types/User";
import { isLoggedIn, login, logout } from "../../../utils/session";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const roomRouter = router({
    getRoomBySession: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.request.req.session.user!;

        const room = await ctx.prisma.meetingRoom.findUnique({
            where: {
                id: user.meetingRoomId,
            },
        });

        if (!room) {
            throw new TRPCError({
                code: "NOT_FOUND",
            });
        }

        const attendee = await ctx.prisma.meetingRoomAttendee.findMany({
            where: {
                meetingRoomId: room.id,
            },
        });

        if (attendee.length === 0) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
            });
        }

        const meetingRoomAttendeeIds = attendee.map((item) => item.id);

        const attendeeDatetimeRange =
            await ctx.prisma.meetingRoomAttendeeDatetimeRange.findMany({
                where: {
                    meetingRoomAttendeeId: {
                        in: meetingRoomAttendeeIds,
                    },
                },
            });

        const finalData = {
            room,
            attendee,
            attendeeDatetimeRange,
        };

        return finalData;
    }),
    createRoom: publicProcedure
        .input(
            z.object({
                title: z.string(),
                hostName: z.string(),
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

            if (!creationResult) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                });
            }

            //create one attendee as host
            const host = await ctx.prisma.meetingRoomAttendee.create({
                data: {
                    meetingRoomId: creationResult.id,
                    attendeeName: input.hostName,
                    isHost: true,
                },
            });

            if (!host) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                });
            }

            const user = {
                meetingRoomId: creationResult.id,
                attendeeName: host.attendeeName,
            } as User;

            await login(ctx.request, user);

            return creationResult;
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

            if (!room) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                });
            }

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
                    id: ctx.request.req.session.user!.meetingRoomAttendeeId,
                },
            });

            if (!attendee) {
                attendee = await ctx.prisma.meetingRoomAttendee.create({
                    data: {
                        meetingRoomId: room.id,
                        attendeeName: input.attendeeName,
                        isHost: false,
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
    logout: protectedProcedure.mutation(async ({ ctx }) => {
        await logout(ctx.request);

        return {
            result: true,
        };
    }),
    checkLogin: publicProcedure.query(async ({ ctx }) => {
        const result = await isLoggedIn(ctx.request);

        return {
            result: result,
        };
    }),
});
