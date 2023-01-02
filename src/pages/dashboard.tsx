import { type NextPage } from "next";
import { trpc } from "../utils/trpc";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import Router from "next/router";

const Dashboard: NextPage = () => {

    const getRoomQuery = trpc.room.getRoomBySession.useQuery();

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

export default Dashboard;

