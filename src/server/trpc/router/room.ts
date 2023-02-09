import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { User } from "../../../types/User";
import { getSession, isLoggedIn, login, logout } from "../../../utils/session";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { MeetingRoomAttendeeDatetimeRangeDatetimeMode } from "@prisma/client";
import { SendEmail } from "../../../utils/mail";
import moment from "moment-timezone";

export const roomRouter = router({
    getRoomBySession: protectedProcedure.query(async ({ ctx }) => {
        const session = await getSession({
            req: ctx.request.req,
            res: ctx.request.res,
        });

        const user = session.user!;

        console.log(user)

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
            currentUserId: user.meetingRoomAttendeeId,
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
                timeZone: z.string(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            //create and return the room

            const startTimeUTC = moment
                .tz(input.startTime, input.timeZone)
                .utc()
                .toDate();
            const endTimeUTC = moment
                .tz(input.endTime, input.timeZone)
                .utc()
                .toDate();

            const creationResult = await ctx.prisma.meetingRoom.create({
                data: {
                    title: input.title,
                    secretKey: (
                        Math.random().toString(36).substring(2, 15) +
                        Math.random().toString(36).substring(2, 15)
                    ).toString(),
                    availableStartDateTimeUTC: startTimeUTC,
                    availableEndDateTimeUTC: endTimeUTC,
                    numberOfAttendees: input.numberOfAttendees,
                    timeZone: input.timeZone,
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
                meetingRoomAttendeeId: host.id,
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
            const room = await ctx.prisma.meetingRoom.findUnique({
                where: {
                    secretKey: input.secretKey,
                },
            });

            if (!room) {
                return {
                    result: false,
                    data: null,
                    error: "Room not found",
                };
            }

            const now = new Date();
            now.setUTCHours(now.getUTCHours() - 2);
            
            if(room.actualStartTimeUTC !== null && room.actualEndTimeUTC !== null && now > room.actualEndTimeUTC) {
                return {
                    result: false,
                    data: null,
                    error: "Room has already started long time ago, you cannot join anymore",
                };
            }

            const attendees = await ctx.prisma.meetingRoomAttendee.findMany({
                where: {
                    meetingRoomId: room.id,
                },
            });

            //check if the user is already in the room
            let attendee = attendees.find(
                (item) =>
                    item.attendeeName === input.attendeeName
            );

            if (!attendee) {
                if ((attendees.length + 1) >= room.numberOfAttendees) {
                    return {
                        result: false,
                        data: null,
                        error: "Room is full",
                    };
                }

                attendee = await ctx.prisma.meetingRoomAttendee.create({
                    data: {
                        meetingRoomId: room.id,
                        attendeeName: input.attendeeName,
                        attendeeEmail: input.attendeeEmail,
                        isHost: false,
                    },
                });
            }
            else {
                //update attendee email
                await ctx.prisma.meetingRoomAttendee.update({
                    where: {
                        id: attendee.id,
                    },
                    data: {
                        attendeeEmail: input.attendeeEmail,
                    },
                });
            }

            const user = {
                meetingRoomId: room.id,
                attendeeName: attendee.attendeeName,
                attendeeEmail: input.attendeeEmail,
                meetingRoomAttendeeId: attendee.id,
            } as User;

            await login(ctx.request, user);

            return {
                result: true,
                data: attendee,
            };
        }),
    deleteRoom: protectedProcedure.mutation(async ({ ctx }) => {
        const session = await getSession({
            req: ctx.request.req,
            res: ctx.request.res,
        });

        const user = session.user!;
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

        await logout(ctx.request);

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

        return {
            result: true,
        };
    }),
    logout: protectedProcedure.mutation(async ({ ctx }) => {
        await logout(ctx.request);

        return {
            result: true,
        };
    }),
    submitMeetingTime: protectedProcedure
        .input(
            z.object({
                startDateTime: z.date(),
                endDateTime: z.date(),
                datetimeMode: z.nativeEnum(
                    MeetingRoomAttendeeDatetimeRangeDatetimeMode
                ),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const startDateTimeUTC = moment(input.startDateTime).utc().toDate();
            const endDateTimeUTC = moment(input.endDateTime).utc().toDate();
            const session = await getSession({
                req: ctx.request.req,
                res: ctx.request.res,
            });

            const user = session.user;

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
                    actualStartTimeUTC: null,
                },
            });

            if (!room) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                });
            }

            if(input.startDateTime > input.endDateTime) {
                return {
                    result: false,
                    data: null,
                    error: "Start time must be before end time",
                }
            }

            const existingAttendeeDatetimeRange =
                await ctx.prisma.meetingRoomAttendeeDatetimeRange.findMany({
                    where: {
                        meetingRoomAttendeeId: attendee.id,
                        OR: [
                            {
                                startDateTimeUTC: {
                                    gte: startDateTimeUTC,
                                    lte: endDateTimeUTC,
                                },
                                endDateTimeUTC: {
                                    gte: startDateTimeUTC,
                                    lte: endDateTimeUTC,
                                },
                            },
                        ],
                    },
                });

            if (existingAttendeeDatetimeRange.length > 0) {
                return {
                    result: false,
                    data: null,
                    error: "You have overlapping time slots",
                }
            }

            if (
                startDateTimeUTC < room.availableStartDateTimeUTC ||
                endDateTimeUTC > room.availableEndDateTimeUTC
            ) {
                return {
                    result: false,
                    data: null,
                    error: "You have time slots outside of the available time slots",
                }
            }

            const s = await ctx.prisma.meetingRoomAttendeeDatetimeRange.create({
                data: {
                    meetingRoomAttendeeId: attendee.id,
                    startDateTimeUTC: startDateTimeUTC,
                    endDateTimeUTC: endDateTimeUTC,
                    datetimeMode: input.datetimeMode,
                },
            });

            return {
                result: true,
                data: s,
            };
        }),
    deleteMeetingTime: protectedProcedure
        .input(
            z.object({
                id: z.string(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const session = await getSession({
                req: ctx.request.req,
                res: ctx.request.res,
            });

            const user = session.user;

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
                    actualStartTimeUTC: null,
                },
            });

            if (!room) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                });
            }

            await ctx.prisma.meetingRoomAttendeeDatetimeRange.delete({
                where: {
                    id: input.id,
                },
            });

            return {
                result: true,
            };
        }),
    confirmMeetingByHost: protectedProcedure
        .input(
            z.object({
                startDatetime: z.date(),
                endDatetime: z.date(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const startDateTimeUTC = moment(input.startDatetime).utc().toDate();
            const endDateTimeUTC = moment(input.endDatetime).utc().toDate();
            const session = await getSession({
                req: ctx.request.req,
                res: ctx.request.res,
            });

            const user = session.user;

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

            const room = await ctx.prisma.meetingRoom.findFirst({
                where: {
                    id: user!.meetingRoomId,
                    actualStartTimeUTC: null,
                },
            });

            if (!room) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                });
            }

            if(input.startDatetime > input.endDatetime) {
                return{
                    result: false,
                    data: null,
                    error: "Start time must be before end time",
                }
            }

            if (
                startDateTimeUTC < room.availableStartDateTimeUTC ||
                endDateTimeUTC > room.availableEndDateTimeUTC
            ) {
                return{
                    result: false,
                    data: null,
                    error: "You have time slots outside of the available time slots",
                }
            }

            //update the room
            const roomUpdate = await ctx.prisma.meetingRoom.update({
                where: {
                    id: user!.meetingRoomId,
                },
                data: {
                    actualStartTimeUTC: startDateTimeUTC,
                    actualEndTimeUTC: endDateTimeUTC,
                },
            });

            if (!roomUpdate) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                });
            }

            //send email to all attendees
            const attendees = await ctx.prisma.meetingRoomAttendee.findMany({
                where: {
                    meetingRoomId: roomUpdate.id,
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
                `;
                SendEmail(attendee.attendeeEmail, subject, message);
            }

            return {
                result: true,
            };
        }),
});
