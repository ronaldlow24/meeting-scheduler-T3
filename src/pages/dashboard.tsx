import { type NextPage } from "next";
import { trpc } from "../utils/trpc";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import type {
    MeetingRoom,
    MeetingRoomAttendee,
    MeetingRoomAttendeeDatetimeRange,
    MeetingRoomAttendeeDatetimeRangeDatetimeMode,
} from "@prisma/client";
import { ValidateEmail } from "../utils/common";

import { useRouter as NextNavigation } from "next/navigation";

const FreeColor = "#00FF00";
const BusyColor = "#FFC0CB";

const HorizontalTimeLine: React.FC<{
    room: MeetingRoom;
    attendee: MeetingRoomAttendee;
    attendeeDatetimeRange: MeetingRoomAttendeeDatetimeRange[];
    isCurrentAttendee: boolean;
    handleRefetch: () => void;
}> = ({ room, attendee, attendeeDatetimeRange, isCurrentAttendee, handleRefetch }) => {

    const deleteDatetimeRangeMutation = trpc.room.deleteMeetingTime.useMutation();

    const handleDeleteDatetimeRange = async (meetingTimeId: string) => {
        const result = await deleteDatetimeRangeMutation.mutateAsync({ id: meetingTimeId });

        if (deleteDatetimeRangeMutation.isError) {
            toast.error("Failed to delete meeting time");
            return;
        }

        if (!result.result) {
            toast.error("Unknown error");
            return;
        }

        toast.success("Meeting time deleted successfully");

        handleRefetch();
    };

    return (
        <div className="row border">
            <div className="col-2 text-center">
                <strong>
                    {attendee.attendeeName} {attendee.isHost && "(HOST)"} {isCurrentAttendee && "(YOU)"}
                </strong>
            </div>
            <div className="col-10">
                {attendeeDatetimeRange.length == 0 && (
                    <>
                        <i style={{ color: "red" }}>
                            No time slot allocated yet
                        </i>
                        ⌛
                    </>
                )}

                {attendeeDatetimeRange
                    .sort(function (a, b) {
                        return (
                            b.startDateTimeUTC.getTime() -
                            a.startDateTimeUTC.getTime()
                        );
                    })
                    .map((attendeeDatetimeRange) => {
                        return (
                            <div
                                key={attendeeDatetimeRange.id}
                                className="row border"
                                style={{
                                    backgroundColor:
                                        attendeeDatetimeRange.datetimeMode ===
                                        "FREE"
                                            ? FreeColor
                                            : BusyColor,
                                }}
                            >
                                <div className="col-5">
                                    {attendeeDatetimeRange.startDateTimeUTC.toString()}{" "}
                                    ({room.timeZone})
                                </div>
                                <div className="col-5">
                                    {attendeeDatetimeRange.endDateTimeUTC.toString()}{" "}
                                    ({room.timeZone})
                                </div>
                                <div className="col-2 d-flex justify-content-center align-items-center">
                                    {isCurrentAttendee && <button type="button" disabled={deleteDatetimeRangeMutation.isLoading} onClick={() => handleDeleteDatetimeRange(attendeeDatetimeRange.id)}>🗑️</button>}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

//render a navbar with only a logout button
const Navbar: React.FC = () => {
    const nextNavigation = NextNavigation();

    const logoutMutation = trpc.room.logout.useMutation();

    const handleLogout = async () => {
        const result = await logoutMutation.mutateAsync();

        if (logoutMutation.isError) {
            toast.error("Failed to logout");
            return;
        }

        if (!result.result) {
            toast.error("Unknown error");
            return;
        }

        toast.dismiss("logoutToast");
        toast.success("Logout successfully");
        nextNavigation.push("/");
    };

    return (
        <nav className="navbar bg-light">
            <div className="container-fluid">
                <a className="navbar-brand">Meeting Scheduler</a>
                <button
                    className="btn btn-outline-danger"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </div>
        </nav>
    );
};

const Dashboard: NextPage = () => {
    const nextNavigation = NextNavigation();

    const getRoomQuery = trpc.room.getRoomBySession.useQuery(undefined, {
        retry: false,
        initialData: undefined,
        cacheTime: 0,
    });

    const confirmMeetingByHostMutation =
        trpc.room.confirmMeetingByHost.useMutation();
    const submitMeetingTimeMutation = trpc.room.submitMeetingTime.useMutation();
    const cancelMeetingByHostMutation = trpc.room.deleteRoom.useMutation();

    const handleRefetch = () => {
        getRoomQuery.refetch();
    };

    useEffect(() => {
        console.log(
            "useEffect from dashboard",
            getRoomQuery.isFetchedAfterMount && getRoomQuery.isSuccess
        );

        if (
            getRoomQuery.isFetchedAfterMount &&
            getRoomQuery.isError &&
            getRoomQuery.error.data?.code === "UNAUTHORIZED"
        ) {
            toast.error("You are not logged in");
            nextNavigation.push("/");
        }

        if (
            getRoomQuery.isFetchedAfterMount &&
            getRoomQuery.isError &&
            getRoomQuery.error.data?.code === "NOT_FOUND"
        ) {
            toast.error("Room not found");
            nextNavigation.push("/");
        }
    }, [getRoomQuery.isFetchedAfterMount]);

    const [startDatetime, setStartDatetime] = useState<Date>();
    const [endDatetime, setEndDatetime] = useState<Date>();
    const [datetimeMode, setDatetimeMode] =
        useState<MeetingRoomAttendeeDatetimeRangeDatetimeMode>("FREE");
    const [actualStartDatetime, setActualStartDatetime] = useState<Date>();
    const [actualEndDatetime, setActualEndDatetime] = useState<Date>();

    const handleConfirmMeeting = async () => {
        if (!actualStartDatetime || !actualEndDatetime) {
            toast.error("Start datetime and end datetime must be set");
            return;
        }

        if (actualStartDatetime >= actualEndDatetime) {
            toast.error("Start datetime must be less than end datetime");
            return;
        }

        const result = await confirmMeetingByHostMutation.mutateAsync({
            startDatetime: actualStartDatetime,
            endDatetime: actualEndDatetime,
        });

        if (result) {
            toast.success("Meeting confirmed");
            setTimeout(() => {
                nextNavigation.refresh();
            }, 1300);
        }
    };

    const handleCancelMeeting = async () => {
        const result = await cancelMeetingByHostMutation.mutateAsync();

        if (result) {
            toast.success("Meeting cancelled");
            setTimeout(() => {
                nextNavigation.push("/");
            }, 1300);
        }
    };

    const handleSubmitMeetingTime = async () => {
        if (!startDatetime || !endDatetime) {
            toast.error("Start datetime and end datetime must be set");
            return;
        }

        const result = await submitMeetingTimeMutation.mutateAsync({
            startDateTime: startDatetime,
            endDateTime: endDatetime,
            datetimeMode: datetimeMode,
        });

        if (result.result) {
            toast.success("Meeting time submitted");

            handleRefetch();

            if (getRoomQuery.isError) {
                toast.error(getRoomQuery.error.message);
                return;
            }
        } else {
            toast.error(result.error);
        }
    };

    return (
        <>
            <Navbar />
            <main>
                <div className="container">
                    <br></br>
                    <h3>Meeting Details</h3>
                    <br></br>

                    <div className="row">
                        <div className="col-4 text-center border border-2 p-1">
                            <strong>Title</strong>
                        </div>
                        <div className="col-8 text-center border border-2 p-1">
                            {getRoomQuery.data?.room.title}
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-4 text-center border border-2 p-1">
                            <strong>Available Start Time</strong>
                        </div>
                        <div className="col-8 text-center border border-2 p-1">
                            {getRoomQuery.data?.room.availableStartDateTimeUTC.toString()}{" "}
                            ({getRoomQuery.data?.room.timeZone})
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-4 text-center border border-2 p-1">
                            <strong>Available End Time</strong>
                        </div>
                        <div className="col-8 text-center border border-2 p-1">
                            {getRoomQuery.data?.room.availableEndDateTimeUTC.toString()}{" "}
                            ({getRoomQuery.data?.room.timeZone})
                        </div>
                    </div>
                    <br></br>
                    <br></br>

                    {getRoomQuery.data?.room.actualEndTimeUTC && (
                        <>
                            <div className="row">
                                <div className="col-12 text-center">
                                    <h2>Meeting Already Confirmed!</h2>
                                    <p>
                                        Meeting started at{" "}
                                        {getRoomQuery.data?.room.actualStartTimeUTC!.toString()}{" "}
                                        ({getRoomQuery.data?.room.timeZone})
                                    </p>
                                    <p>
                                        Meeting ended at{" "}
                                        {getRoomQuery.data?.room.actualEndTimeUTC!.toString()}{" "}
                                        ({getRoomQuery.data?.room.timeZone})
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {!getRoomQuery.data?.room.actualEndTimeUTC &&
                        getRoomQuery.data?.attendee.find(
                            (s) => s.id == getRoomQuery.data.currentUserId
                        )?.isHost && (
                            <>
                                <h3>Room Management (HOST SPECIFIC)</h3>
                                <div className="row">
                                    <div className="col-12 text-center">
                                        <div className="form-group">
                                            <label>Start Datetime</label>
                                            <input
                                                type="datetime-local"
                                                className="form-control"
                                                disabled={
                                                    submitMeetingTimeMutation.isLoading ||
                                                    confirmMeetingByHostMutation.isLoading ||
                                                    cancelMeetingByHostMutation.isLoading
                                                }
                                                // value={ToISOStringLocal(
                                                //     actualStartDatetime
                                                // ).slice(0, 16)}
                                                onChange={(e) => {
                                                    setActualStartDatetime(
                                                        new Date(e.target.value)
                                                    );
                                                }}
                                            />

                                            <label>End Datetime</label>
                                            <input
                                                type="datetime-local"
                                                className="form-control"
                                                disabled={
                                                    submitMeetingTimeMutation.isLoading ||
                                                    confirmMeetingByHostMutation.isLoading ||
                                                    cancelMeetingByHostMutation.isLoading
                                                }
                                                // value={ToISOStringLocal(
                                                //     actualEndDatetime
                                                // ).slice(0, 16)}
                                                onChange={(e) => {
                                                    setActualEndDatetime(
                                                        new Date(e.target.value)
                                                    );
                                                }}
                                            />

                                            <button
                                                className="btn btn-primary m-3 float-end"
                                                disabled={
                                                    submitMeetingTimeMutation.isLoading ||
                                                    confirmMeetingByHostMutation.isLoading ||
                                                    cancelMeetingByHostMutation.isLoading
                                                }
                                                onClick={handleConfirmMeeting}
                                            >
                                                Confirm Meeting
                                            </button>

                                            <button
                                                className="btn btn-danger m-3 float-end"
                                                disabled={
                                                    submitMeetingTimeMutation.isLoading ||
                                                    confirmMeetingByHostMutation.isLoading ||
                                                    cancelMeetingByHostMutation.isLoading
                                                }
                                                onClick={handleCancelMeeting}
                                            >
                                                Cancel Meeting
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                    {!getRoomQuery.data?.room.actualEndTimeUTC && (
                        <>
                            <h3>
                                Submit Timeslot
                                {` (${
                                    getRoomQuery.data?.attendee.find(
                                        (x) =>
                                            x.id ==
                                            getRoomQuery.data.currentUserId
                                    )?.attendeeName
                                })`}
                            </h3>
                            <div className="row">
                                <div className="col-12 text-center">
                                    <div className="form-group">
                                        <label>Start Datetime</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            name="startDatetime"
                                            disabled={
                                                submitMeetingTimeMutation.isLoading ||
                                                confirmMeetingByHostMutation.isLoading ||
                                                cancelMeetingByHostMutation.isLoading
                                            }
                                            // value={ToISOStringLocal(
                                            //     startDatetime
                                            // ).slice(0, 16)}
                                            onChange={(e) => {
                                                setStartDatetime(
                                                    new Date(e.target.value)
                                                );
                                            }}
                                        />

                                        <br></br>
                                        <label>End Datetime</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            name="endDatetime"
                                            disabled={
                                                submitMeetingTimeMutation.isLoading ||
                                                confirmMeetingByHostMutation.isLoading ||
                                                cancelMeetingByHostMutation.isLoading
                                            }
                                            // value={ToISOStringLocal(
                                            //     endDatetime
                                            // ).slice(0, 16)}
                                            onChange={(e) => {
                                                setEndDatetime(
                                                    new Date(e.target.value)
                                                );
                                            }}
                                        />
                                        <br></br>

                                        <label>Mode</label>
                                        <select
                                            className="form-control"
                                            name="datetimeMode"
                                            disabled={
                                                submitMeetingTimeMutation.isLoading ||
                                                confirmMeetingByHostMutation.isLoading ||
                                                cancelMeetingByHostMutation.isLoading
                                            }
                                            onChange={(e) => {
                                                if (
                                                    e.target.value === "FREE" ||
                                                    e.target.value === "BUSY"
                                                ) {
                                                    setDatetimeMode(
                                                        e.target.value
                                                    );
                                                }
                                            }}
                                        >
                                            <option value="FREE">
                                                Available
                                            </option>
                                            <option value="BUSY">
                                                Not Available
                                            </option>
                                        </select>

                                        <button
                                            className="btn btn-primary m-3 float-end"
                                            disabled={
                                                submitMeetingTimeMutation.isLoading ||
                                                confirmMeetingByHostMutation.isLoading ||
                                                cancelMeetingByHostMutation.isLoading
                                            }
                                            onClick={handleSubmitMeetingTime}
                                        >
                                            Submit Meeting Time
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <h3>Timeslot Information</h3>

                    {getRoomQuery.data?.attendee.map((attendee) => {
                        const attendeeDatetimeRange =
                            getRoomQuery.data?.attendeeDatetimeRange.filter(
                                (x) => x.meetingRoomAttendeeId === attendee.id
                            );

                        const isCurrentAttendee = attendee.id === getRoomQuery.data.currentUserId;

                        return (
                            <div key={attendee.id}>
                                <br></br>
                                <HorizontalTimeLine
                                    room={getRoomQuery.data?.room}
                                    attendee={attendee}
                                    attendeeDatetimeRange={
                                        attendeeDatetimeRange
                                    }
                                    isCurrentAttendee={isCurrentAttendee}
                                    handleRefetch={handleRefetch}
                                />
                            </div>
                        );
                    })}
                    <br></br>
                    <br></br>
                </div>
            </main>
        </>
    );
};

export default Dashboard;
