import { type NextPage, GetServerSideProps, GetStaticProps } from "next";
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

import { useRouter as NextNavigation } from "next/navigation";
import { useRouter as NextRouter } from 'next/router'

const FreeColor = "#00FF00";
const BusyColor = "#FF0000";

const HorizontalTimeLine: React.FC<{
    key: string;
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
                                <div
                                    className="col-2"
                                    key={attendeeDatetimeRange.id}
                                >
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
                                        {attendeeDatetimeRange.startDateTimeUTC.toString()}{" "}
                                        ({room.timeZone})
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
                                        {attendeeDatetimeRange.endDateTimeUTC.toString()}{" "}
                                        ({room.timeZone})
                                    </div>
                                </div>
                            );
                        })}
                </div>
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
        console.log("Logout" , result.result)
        nextNavigation.push("/");
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <a className="navbar-brand" href="#">Navbar</a>
        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ml-auto">
            <li className="nav-item">
              <button className="nav-link" onClick={
                handleLogout
              }>Logout</button>
            </li>
          </ul>
        </div>
      </nav>
    );
};

const Dashboard: NextPage = () => {
    const nextNavigation = NextNavigation();

    const getRoomQuery = trpc.room.getRoomBySession.useQuery(undefined, {
        retry: false,
        initialData: undefined,
        cacheTime: 0
    });

    const confirmMeetingByHostMutation =
        trpc.room.confirmMeetingByHost.useMutation();
    const submitMeetingTimeMutation = trpc.room.submitMeetingTime.useMutation();
    const cancelMeetingByHostMutation = trpc.room.deleteRoom.useMutation();

    useEffect(() => {
        console.log("useEffect from dashboard", getRoomQuery.isFetchedAfterMount && getRoomQuery.isSuccess)
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
        }
    };

    return (
        <>
            <Navbar />
            <main>
                <div className="container">
                    <h1 className="text-center">Meeting Scheduler</h1>
                    <h3 className="text-center">
                        Title : {getRoomQuery.data?.room.title}
                    </h3>
                    <h3 className="text-center">
                        Available Start Time :{" "}
                        {getRoomQuery.data?.room.availableStartDateTimeUTC.toString()}{" "}
                        ({getRoomQuery.data?.room.timeZone})
                    </h3>
                    <h3 className="text-center">
                        Available End Time :{" "}
                        {getRoomQuery.data?.room.availableEndDateTimeUTC.toString()}{" "}
                        ({getRoomQuery.data?.room.timeZone})
                    </h3>

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
                                                            new Date(
                                                                e.target.value
                                                            )
                                                        );
                                                    }}
                                                />

                                                <label>End Datetime</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-control"
                                                    onChange={(e) => {
                                                        setActualEndDatetime(
                                                            new Date(
                                                                e.target.value
                                                            )
                                                        );
                                                    }}
                                                />

                                                <button
                                                    className="btn btn-primary mt-3"
                                                    onClick={
                                                        handleConfirmMeeting
                                                    }
                                                >
                                                    Confirm Meeting
                                                </button>

                                                <button
                                                    className="btn btn-danger mt-3 ml-3"
                                                    onClick={
                                                        handleCancelMeeting
                                                    }
                                                >
                                                    Cancel Meeting
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    {!getRoomQuery.data?.room.actualEndTimeUTC &&
                        !getRoomQuery.data?.attendee.find(
                            (s) => s.id == getRoomQuery.data.currentUserId
                        )?.isHost && (
                            <>
                                <div className="row">
                                    <div className="col-12 text-center">
                                        <h2>Submit Meeting Time</h2>
                                        <div className="row">
                                            <div className="col-6">
                                                <div className="form-group">
                                                    <label>
                                                        Start Datetime
                                                    </label>
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
                                                                e.target
                                                                    .value ===
                                                                "FREE"
                                                            ) {
                                                                setDatetimeMode(
                                                                    e.target
                                                                        .value
                                                                );
                                                            }

                                                            if (
                                                                e.target
                                                                    .value ===
                                                                "BUSY"
                                                            ) {
                                                                setDatetimeMode(
                                                                    e.target
                                                                        .value
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
                                key={attendee.id}
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
