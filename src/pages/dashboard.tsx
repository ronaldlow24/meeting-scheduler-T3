import { type NextPage, GetServerSideProps  } from "next";
import { trpc } from "../utils/trpc";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import Router from "next/router";
import type { MeetingRoom, MeetingRoomAttendee, MeetingRoomAttendeeDatetimeRange } from "@prisma/client";

type DashboardProps = {
    room: MeetingRoom;
    attendee: MeetingRoomAttendee[];
    attendeeDatetimeRange: MeetingRoomAttendeeDatetimeRange[];
};

const Dashboard: NextPage<DashboardProps> = (props) => {
    
    const [dashboardProp, setDashboardProp] = useState<DashboardProps>(props);

    return (
        <>
            <main>
                <div className="container">
                    <h1 className="text-center">Meeting Scheduler</h1>
                    <div className="row">
                        <div className="col-12 text-center">
                            <button
                                type="button"
                                className="btn btn-outline-success"
                            >
                                Create a room
                            </button>
                        </div>
                        <div className="col-12 text-center">
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                            >
                                Join a room
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export const getServerSideProps: GetServerSideProps = async (context) => {

    const getRoomQuery = trpc.room.getRoomBySession.useQuery();

    if (getRoomQuery.isError) {
        toast.error(getRoomQuery.error.message);
        return {
            props: {},
        };
    }

    const result : DashboardProps = {
        room: getRoomQuery.data!.room,
        attendee: getRoomQuery.data!.attendee,
        attendeeDatetimeRange: getRoomQuery.data!.attendeeDatetimeRange,
    };

    return {
        props: result,
    };
}

export default Dashboard;

