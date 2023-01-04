import { type NextPage, GetServerSideProps  } from "next";
import { trpc } from "../utils/trpc";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import Router from "next/router";
import type { MeetingRoomAttendeeDatetimeRange } from "@prisma/client";

type DashboardProps = {
    data: MeetingRoomAttendeeDatetimeRange[];
};

const Dashboard: NextPage<DashboardProps> = (props) => {
    
    const [datetimeRange, setDatetimeRange] = useState<MeetingRoomAttendeeDatetimeRange[]>(props.data);

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

    const data = getRoomQuery.data;

    const result : DashboardProps = {
        data : data?.data?.attendeeDatetimeRange ?? []
    };

    return {
        props: result,
    };
}

export default Dashboard;

