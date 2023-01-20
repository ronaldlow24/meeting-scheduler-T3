import { type NextPage, GetServerSideProps, GetStaticProps } from "next";
import { trpc } from "../utils/trpc";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useState } from "react";
import Router from "next/router";
import type {
    MeetingRoom,
    MeetingRoomAttendee,
    MeetingRoomAttendeeDatetimeRange,
    MeetingRoomAttendeeDatetimeRangeDatetimeMode,
} from "@prisma/client";

type DashboardProps = {
    room: MeetingRoom;
    attendee: MeetingRoomAttendee[];
    attendeeDatetimeRange: MeetingRoomAttendeeDatetimeRange[];
    currentUserId: string;
};

const FreeColor = "#00FF00";
const BusyColor = "#FF0000";

const HorizontalTimeLine: React.FC<{
    room: MeetingRoom;
    attendee: MeetingRoomAttendee;
    attendeeDatetimeRange: MeetingRoomAttendeeDatetimeRange[];
}> = ({ room, attendee, attendeeDatetimeRange }) => {
    return (
        <div className="row">
            <div className="col-2">
                <p className="text-center">{attendee.attendeeName}</p>
            </div>
            <div className="col-10">
                <div className="row">
                    {attendeeDatetimeRange
                        .sort(function (a, b) {
                            return (
                                b.startDateTimeUTC.getTime() -
                                a.startDateTimeUTC.getTime()
                            );
                        })
                        .map((attendeeDatetimeRange) => {
                            return (
                                <div className="col-2">
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "50%",
                                            borderBottom: `1px solid ${
                                                attendeeDatetimeRange.datetimeMode ==
                                                    "BUSY" && BusyColor
                                            } ${
                                                attendeeDatetimeRange.datetimeMode ==
                                                    "FREE" && FreeColor
                                            }`,
                                        }}
                                    >
                                        {attendeeDatetimeRange.startDateTimeUTC.toString()} ({room.timeZone})
                                    </div>
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "50%",
                                            borderTop: `1px solid ${
                                                attendeeDatetimeRange.datetimeMode ==
                                                    "BUSY" && BusyColor
                                            } ${
                                                attendeeDatetimeRange.datetimeMode ==
                                                    "FREE" && FreeColor
                                            }`,
                                        }}
                                    >
                                        {attendeeDatetimeRange.endDateTimeUTC.toString()} ({room.timeZone})
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

const Dashboard: NextPage = () => {
    const getRoomQuery = trpc.room.getRoomBySession.useQuery();

    if(getRoomQuery.isSuccess){
        console.log("fsfsffsfsf")
        console.log(getRoomQuery.data);
    }    

    const confirmMeetingByHostMutation =
        trpc.room.confirmMeetingByHost.useMutation();
    const submitMeetingTimeMutation = trpc.room.submitMeetingTime.useMutation();
    const cancelMeetingByHostMutation = trpc.room.deleteRoom.useMutation();

    const [dashboardProp, setDashboardProp] = useState<DashboardProps>();
    const [startDatetime, setStartDatetime] = useState<Date>(new Date());
    const [endDatetime, setEndDatetime] = useState<Date>(new Date());
    const [datetimeMode, setDatetimeMode] =
        useState<MeetingRoomAttendeeDatetimeRangeDatetimeMode>("BUSY");

    const [actualStartDatetime, setActualStartDatetime] = useState<Date>(
        new Date()
    );
    const [actualEndDatetime, setActualEndDatetime] = useState<Date>(
        new Date()
    );

    const handleChangeDatetime = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const inputtedDatetime = new Date(value);
        if (name === "startDatetime") {
            if (inputtedDatetime >= endDatetime) {
                toast.error("Start datetime must be less than end datetime");
                return;
            }

            setStartDatetime(new Date(value));
        } else if (name === "endDatetime") {
            if (inputtedDatetime <= startDatetime) {
                toast.error("End datetime must be greater than start datetime");
                return;
            }

            setEndDatetime(new Date(value));
        }
    };

    const handleConfirmMeeting = async () => {

        if(actualStartDatetime >= actualEndDatetime){
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
                Router.reload();
            }, 1300);
        }
    };

    const handleCancelMeeting = async () => {
        const result = await cancelMeetingByHostMutation.mutateAsync();

        if (result) {
            toast.success("Meeting cancelled");
            setTimeout(() => {
                Router.push("/");
            }, 1300);
        }
    };

    const handleSubmitMeetingTime = async () => {
        const result = await submitMeetingTimeMutation.mutateAsync({
            startDateTime: startDatetime,
            endDateTime: endDatetime,
            datetimeMode: datetimeMode,
        });

        if (result) {
            toast.success("Meeting time submitted");

            getRoomQuery.refetch();

            if (getRoomQuery.isError) {
                toast.error(getRoomQuery.error.message);
                return;
            }

            setDashboardProp({
                room: getRoomQuery.data!.room,
                attendee: getRoomQuery.data!.attendee,
                attendeeDatetimeRange: getRoomQuery.data!.attendeeDatetimeRange,
                currentUserId: getRoomQuery.data!.currentUserId,
            });
        }
    };

    return (
        <>
            <main>
                <div className="container">
                    <h1 className="text-center">Meeting Scheduler</h1>
                    <h3 className="text-center">Title : {getRoomQuery.data?.room.title}</h3>
                    <h3 className="text-center">Available Start Time : {getRoomQuery.data?.room.availableStartDateTimeUTC.toString()} ({getRoomQuery.data?.room.timeZone})</h3>
                    <h3 className="text-center">Available End Time : {getRoomQuery.data?.room.availableEndDateTimeUTC.toString()} ({getRoomQuery.data?.room.timeZone})</h3>

                    {getRoomQuery.data?.room.actualEndTimeUTC && (
                        <>
                            <div className="row">
                                <div className="col-12 text-center">
                                    <h2>Meeting Already Confirmed!</h2>
                                    <p>
                                        Meeting started at {getRoomQuery.data?.room.actualStartTimeUTC!.toString()} ({getRoomQuery.data?.room.timeZone})
                                    </p>
                                    <p>
                                        Meeting ended at {getRoomQuery.data?.room.actualEndTimeUTC!.toString()} ({getRoomQuery.data?.room.timeZone})
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {!getRoomQuery.data?.room.actualEndTimeUTC && getRoomQuery.data?.attendee.find(s => s.id == getRoomQuery.data.currentUserId)?.isHost && (
                        <div className="row">
                            <div className="col-12 text-center">
                                <h2>Confirm Meeting</h2>
                                <div className="row">
                                    <div className="col-6">
                                        <div className="form-group">
                                            <label>Start Datetime</label>
                                            <input
                                                type="datetime-local"
                                                className="form-control"
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
                                                onChange={(e) => {
                                                    setActualEndDatetime(
                                                        new Date(e.target.value)
                                                    );
                                                }}
                                            />

                                            <button
                                                className="btn btn-primary mt-3"
                                                onClick={handleConfirmMeeting}
                                            >
                                                Confirm Meeting
                                            </button>

                                            <button
                                                className="btn btn-danger mt-3 ml-3"
                                                onClick={handleCancelMeeting}
                                            >
                                                Cancel Meeting
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!getRoomQuery.data?.room.actualEndTimeUTC && !getRoomQuery.data?.attendee.find(s => s.id == getRoomQuery.data.currentUserId)?.isHost && (
                        <>
                            <div className="row">
                                <div className="col-12 text-center">
                                    <h2>Submit Meeting Time</h2>
                                    <div className="row">
                                        <div className="col-6">
                                            <div className="form-group">
                                                <label>Start Datetime</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-control"
                                                    name="startDatetime"
                                                    onChange={
                                                        handleChangeDatetime
                                                    }
                                                />

                                                <label>End Datetime</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-control"
                                                    name="endDatetime"
                                                    onChange={
                                                        handleChangeDatetime
                                                    }
                                                />

                                                <label>Datetime Mode</label>
                                                <select
                                                    className="form-control"
                                                    name="datetimeMode"
                                                    onChange={(e) => {
                                                        if (
                                                            e.target.value ===
                                                            "FREE"
                                                        ) {
                                                            setDatetimeMode(
                                                                e.target.value
                                                            );
                                                        }

                                                        if (
                                                            e.target.value ===
                                                            "BUSY"
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
                                                    className="btn btn-primary mt-3"
                                                    onClick={
                                                        handleSubmitMeetingTime
                                                    }
                                                >
                                                    Submit Meeting Time
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {getRoomQuery.data?.attendee.map((attendee) => {
                        const attendeeDatetimeRange =
                        getRoomQuery.data?.attendeeDatetimeRange.filter(
                                (x) => x.meetingRoomAttendeeId === attendee.id
                            );

                        return (
                            <HorizontalTimeLine
                                room={getRoomQuery.data?.room}
                                attendee={attendee}
                                attendeeDatetimeRange={attendeeDatetimeRange}
                            />
                        );
                    })}
                </div>
            </main>
        </>
    );
};

export default Dashboard;
