import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { User } from "../../../types/User";
import { isLoggedIn, login, logout } from "../../../utils/session";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { MeetingRoomAttendeeDatetimeRangeDatetimeMode } from "@prisma/client";
import { SendEmail } from "../../../utils/mail";

export const roomRouter = router({
    getRoomBySession: protectedProcedure
        .query(async ({ ctx }) => {
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
                hostEmail: z.string().email(),
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
                    attendeeEmail: input.hostEmail,
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
                attendeeEmail: host.attendeeEmail,
            } as User;

            await login(ctx.request, user);

            return creationResult;
        }),
    joinRoom: publicProcedure
        .input(
            z.object({
                secretKey: z.string(),
                attendeeName: z.string(),
                attendeeEmail: z.string().email(),
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
                        attendeeEmail: input.attendeeEmail,
                        isHost: false,
                    },
                });
            }

            const user = {
                meetingRoomId: room.id,
                attendeeName: attendee.attendeeName,
                attendeeEmail: attendee.attendeeEmail,
                meetingRoomAttendeeId: attendee.id,
            } as User;

            await login(ctx.request, user);

            return {
                result: true,
                data: attendee,
            };
        }),
    deleteRoom: protectedProcedure
        .mutation(async ({ ctx }) => {
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

            const attendeeIds = attendee.map((item) => item.id);

            await ctx.prisma.meetingRoomAttendeeDatetimeRange.deleteMany({
                where: {
                    meetingRoomAttendeeId: {
                        in: attendeeIds,
                    },
                },
            });

            await ctx.prisma.meetingRoomAttendee.deleteMany({
                where: {
                    meetingRoomId: room.id,
                },
            });

            await ctx.prisma.meetingRoom.delete({
                where: {
                    id: room.id,
                },
            });

            await logout(ctx.request);

            return {
                result: true,
            };
        }),
    logout: protectedProcedure
        .mutation(async ({ ctx }) => {
            await logout(ctx.request);

            return {
                result: true,
            };
        }),
    checkLogin: publicProcedure
        .query(async ({ ctx }) => {
            const result = await isLoggedIn(ctx.request);

            return {
                result: result,
            };
        }),
    submitMeetingTime: protectedProcedure
        .input(
            z.object({
                startDateTime: z.date(),
                endDateTime: z.date(),
                datetimeMode : z.nativeEnum(MeetingRoomAttendeeDatetimeRangeDatetimeMode),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const user = ctx.request.req.session.user;

            const attendee = await ctx.prisma.meetingRoomAttendee.findUnique({
                where: {
                    id: user!.meetingRoomAttendeeId,
                },
            });

            if (!attendee) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                });
            }

            //check if the room is still open
            const room = await ctx.prisma.meetingRoom.findFirst({
                where: {
                    id: attendee.meetingRoomId,
                    actualStartTime: null,
                },
            });

            if (!room) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                });
            }
            
            const existingAttendeeDatetimeRange = await ctx.prisma.meetingRoomAttendeeDatetimeRange.findMany({
                where: {
                    meetingRoomAttendeeId: attendee.id,
                    OR: [
                        {
                            startDateTime: {
                                gte: input.startDateTime,
                                lte: input.endDateTime,
                            },
                            endDateTime: {
                                gte: input.startDateTime,
                                lte: input.endDateTime,
                            },
                        }
                    ]
                },
            });

            if (existingAttendeeDatetimeRange.length > 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "You have overlapping time slots",
                });
            }

            const s = await ctx.prisma.meetingRoomAttendeeDatetimeRange.create(
                {
                    data: {
                        meetingRoomAttendeeId: attendee.id,
                        startDateTime: input.startDateTime,
                        endDateTime: input.endDateTime,
                        datetimeMode : input.datetimeMode,
                    },
                }
            );

            return s;
        }),
    confirmMeetingByHost : protectedProcedure
        .input(
            z.object({
                startDatetime: z.date(),
                endDatetime: z.date(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const user = ctx.request.req.session.user;
            
            const attendee = await ctx.prisma.meetingRoomAttendee.findUnique({
                where: {
                    id: user!.meetingRoomAttendeeId,
                },
            });

            if (!attendee || !attendee.isHost) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                });
            }

            //update the room
            const room = await ctx.prisma.meetingRoom.update({
                where: {
                    id: user!.meetingRoomId,
                },
                data: {
                    actualStartTime: input.startDatetime,
                    actualEndTime: input.endDatetime,
                },
            });

            if (!room) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                });
            }

            //send email to all attendees
            const attendees = await ctx.prisma.meetingRoomAttendee.findMany({
                where: {
                    meetingRoomId: room.id,
                },
            });

            //loop
            for (const attendee of attendees) {
                const subject = `${room.title} - Meeting Time Confirmed`;
                const message = `
                    <p>Hi ${attendee.attendeeName},</p>
                    <p>The host has confirmed the meeting time.</p>
                    <p>Meeting Title: ${room.title}</p>
                    <p>Meeting Time: ${input.startDatetime.toLocaleString()} - ${input.endDatetime.toLocaleString()}</p>
                `
                SendEmail(attendee.attendeeEmail, subject, message);
            }

            return {
                result: true,
            };

        }),
});
