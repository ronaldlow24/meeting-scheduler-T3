import { type NextPage, GetServerSideProps  } from "next";
import { trpc } from "../utils/trpc";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import Router from "next/router";
import type { MeetingRoom, MeetingRoomAttendee, MeetingRoomAttendeeDatetimeRange, MeetingRoomAttendeeDatetimeRangeDatetimeMode } from "@prisma/client";

type DashboardProps = {
    room: MeetingRoom;
    attendee: MeetingRoomAttendee[];
    attendeeDatetimeRange: MeetingRoomAttendeeDatetimeRange[];
};

const Dashboard: NextPage<DashboardProps> = (props) => {
    const confirmMeetingByHostMutation = trpc.room.confirmMeetingByHost.useMutation();
    const submitMeetingTimeMutation = trpc.room.submitMeetingTime.useMutation();
    
    const [dashboardProp, setDashboardProp] = useState<DashboardProps>(props);
    const [startDatetime , setStartDatetime] = useState<Date>(new Date());
    const [endDatetime , setEndDatetime] = useState<Date>(new Date());
    const [datetimeMode , setDatetimeMode] = useState<MeetingRoomAttendeeDatetimeRangeDatetimeMode>("BUSY");

    const [actualStartDatetime , setActualStartDatetime] = useState<Date>(new Date());
    const [actualEndDatetime , setActualEndDatetime] = useState<Date>(new Date());

    const IsMeetingStarted = props.room.actualStartTime != null;

    const handleChangeDatetime = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const inputtedDatetime = new Date(value);
        if (name === "startDatetime") {
            
            if(inputtedDatetime >= endDatetime){
                toast.error("Start datetime must be less than end datetime");
                return;
            }

            setStartDatetime(new Date(value));
        } else if (name === "endDatetime") {

            if(inputtedDatetime <= startDatetime){
                toast.error("End datetime must be greater than start datetime");
                return;
            }

            setEndDatetime(new Date(value));
        }
    };

    const handleConfirmMeeting = async () => {
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

    const handleSubmitMeetingTime = async () => {
        const result = await submitMeetingTimeMutation.mutateAsync({
            startDateTime: startDatetime,
            endDateTime: endDatetime,
            datetimeMode: datetimeMode,
        });

        if (result) {
            toast.success("Meeting time submitted");
            
            const getRoomQuery = trpc.room.getRoomBySession.useQuery();

            if (getRoomQuery.isError) {
                toast.error(getRoomQuery.error.message);
                return;
            }

            setDashboardProp({
                room: getRoomQuery.data!.room,
                attendee: getRoomQuery.data!.attendee,
                attendeeDatetimeRange: getRoomQuery.data!.attendeeDatetimeRange,
            });
        }
    };

    return (
        <>
            <main>
                <div className="container">
                    <h1 className="text-center">Meeting Scheduler</h1>
                    <div className="row">
                        <div className="col-12 text-center">

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

