import { GetServerSideProps, type NextPage } from "next";
import Modal from "react-modal";

import { trpc } from "../utils/trpc";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import Router from "next/router";
import { ValidateEmail } from "../utils/mail";

const modalCustomStyles = {
    content: {
        top: "50%",
        left: "50%",
        right: "auto",
        bottom: "auto",
        marginRight: "-50%",
        transform: "translate(-50%, -50%)",
    },
};

const DefaultNumberOfAttendees = 2;

type BasedModalComponentType = {
    isOpen: boolean;
    closeModal: () => void;
};

type ModalOpeningState =
    | "openingCreateRoomModal"
    | "openingJoinRoomModal"
    | "close";

const CreateRoomModalComponent: React.FC<BasedModalComponentType> = ({
    isOpen,
    closeModal,
}) => {
    const createRoomMutation = trpc.room.createRoom.useMutation();

    const [roomTitle, setRoomTitle] = useState<string>("");
    const [hostName, setHostName] = useState<string>("");
    const [hostEmail, setHostEmail] = useState<string>("");
    const [startTime, setStartTime] = useState<Date>(new Date());
    const [endTime, setEndTime] = useState<Date>(new Date());
    const [numberOfAttendees, setNumberOfAttendees] = useState<number>(
        DefaultNumberOfAttendees
    );

    const handleChangeNumberOfAttendees = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const inputValue = parseInt(e.target.value);

        if (inputValue < DefaultNumberOfAttendees) {
            toast.error(
                `Number of attendees must be greater than ${
                    DefaultNumberOfAttendees - 1
                }`
            );
            return;
        }

        setNumberOfAttendees(inputValue);
    };

    const handleSubmit = async () => {
        //validate all input
        if (roomTitle.trim() === "") {
            toast.error("Room title must not be empty");
            return;
        }

        if (hostName.trim() === "") {
            toast.error("Host name must not be empty");
            return;
        }

        if (hostEmail.trim() === "") {
            toast.error("Host email must not be empty");
            return;
        }

        if(!ValidateEmail(hostEmail))
        {
            toast.error("Email is not valid");
            return;
        }

        if (startTime === null || startTime === undefined) {
            toast.error("Start time must not be empty");
            return;
        }

        if (endTime === null || endTime === undefined) {
            toast.error("End time must not be empty");
            return;
        }

        if (startTime > endTime) {
            toast.error("Start time must be less than end time");
            return;
        }

        if (numberOfAttendees < DefaultNumberOfAttendees) {
            toast.error(
                `Number of attendees must be greater than ${
                    DefaultNumberOfAttendees - 1
                }`
            );
            return;
        }

        const { timeZone } = Intl.DateTimeFormat().resolvedOptions();

        const createRoomResult = await createRoomMutation.mutateAsync({
            title: roomTitle,
            hostName,
            hostEmail,
            startTime,
            endTime,
            numberOfAttendees,
            timeZone
        });

        if (createRoomMutation.isError || !createRoomResult) {
            toast.error("Failed to create room");
            return;
        }

        toast.success(
            `Room created successfully, your secret is copied to clipboard, please save it immediately!`,
            {
                autoClose: false,
            }
        );

        navigator.clipboard.writeText(createRoomResult.secretKey);

        toast.info(`Your secret key is ${createRoomResult.secretKey}`, {
            autoClose: false,
        });

        setTimeout(() => {
            clearAndCloseModal();
        }, 5000);
    };

    const clearAndCloseModal = () => {
        setRoomTitle("");
        setHostName("");
        setHostEmail("");
        setStartTime(new Date());
        setEndTime(new Date());
        setNumberOfAttendees(DefaultNumberOfAttendees);
        closeModal();
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={clearAndCloseModal}
            style={modalCustomStyles}
            contentLabel="Example Modal"
        >
            <div className="row">
                <div className="col">
                    <h2>Create Room</h2>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Meeting Room Title"
                            disabled={createRoomMutation.isLoading}
                            value={roomTitle}
                            onChange={(e) => setRoomTitle(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Host Name"
                            disabled={createRoomMutation.isLoading}
                            value={hostName}
                            onChange={(e) => setHostName(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="email"
                            className="form-control"
                            placeholder="Host Email"
                            disabled={createRoomMutation.isLoading}
                            value={hostEmail}
                            onChange={(e) => setHostEmail(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="datetime-local"
                            className="form-control"
                            disabled={createRoomMutation.isLoading}
                            value={startTime.toISOString().slice(0, 16)}
                            onChange={(e) =>
                                setStartTime(new Date(e.target.value))
                            }
                        />
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="datetime-local"
                            className="form-control"
                            disabled={createRoomMutation.isLoading}
                            value={endTime.toISOString().slice(0, 16)}
                            onChange={(e) =>
                                setEndTime(new Date(e.target.value))
                            }
                        />
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="number"
                            className="form-control"
                            placeholder="Number of Attendees"
                            disabled={createRoomMutation.isLoading}
                            value={numberOfAttendees}
                            onChange={(e) => handleChangeNumberOfAttendees(e)}
                        />
                    </div>
                </div>
            </div>

            <div className="row mt-5 mb-1">
                <div className="col">
                    <button
                        type="button"
                        className="btn btn-success w-100"
                        disabled={createRoomMutation.isLoading}
                        hidden={createRoomMutation.isSuccess}
                        onClick={handleSubmit}
                    >
                        Save Change
                    </button>
                </div>
            </div>

            <div className="row mt-1 mb-1">
                <div className="col">
                    <button
                        type="button"
                        className="btn btn-primary w-100"
                        disabled={createRoomMutation.isLoading}
                        hidden={createRoomMutation.isSuccess}
                        onClick={clearAndCloseModal}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const JoinRoomModalComponent: React.FC<BasedModalComponentType> = ({
    isOpen,
    closeModal,
}) => {
    const joinRoomMutation = trpc.room.joinRoom.useMutation();

    const [secretKey, setSecretKey] = useState<string>("");
    const [attendeeName, setAttendeeName] = useState<string>("");
    const [attendeeEmail, setAttendeeEmail] = useState<string>("");

    const handleSubmit = async () => {
        //validate all input
        if (secretKey.trim() === "") {
            toast.error("Secret must not be empty");
            return;
        }

        if (attendeeName.trim() === "") {
            toast.error("Name must not be empty");
            return;
        }

        if (attendeeEmail.trim() === "") {
            toast.error("Email must not be empty");
            return;
        }

        if(!ValidateEmail(attendeeEmail))
        {
            toast.error("Email is not valid");
            return;
        }

        const joinRoomResult = await joinRoomMutation.mutateAsync({
            secretKey,
            attendeeName,
            attendeeEmail,
        });

        if (joinRoomMutation.isError) {
            toast.error("Failed to join room");
            return;
        }

        if (!joinRoomResult.result) {
            toast.error(joinRoomResult.error);
            return;
        }

        toast.success("Joined room successfully, will redirect to room page");

        setTimeout(() => {
            Router.push("/dashboard");
        }, 1300);
    };

    const clearAndCloseModal = () => {
        setSecretKey("");
        setAttendeeName("");
        setAttendeeEmail("");
        closeModal();
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={clearAndCloseModal}
            style={modalCustomStyles}
            contentLabel="Example Modal"
        >
            <div className="row">
                <div className="col">
                    <h2>Join Room</h2>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Secret Key"
                            disabled={joinRoomMutation.isLoading}
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Name"
                            disabled={joinRoomMutation.isLoading}
                            value={attendeeName}
                            onChange={(e) => setAttendeeName(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Email"
                            disabled={joinRoomMutation.isLoading}
                            value={attendeeEmail}
                            onChange={(e) => setAttendeeEmail(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="row mt-5 mb-1">
                <div className="col">
                    <button
                        type="button"
                        className="btn btn-success w-100"
                        disabled={joinRoomMutation.isLoading}
                        onClick={handleSubmit}
                    >
                        Join Room
                    </button>
                </div>
            </div>

            <div className="row mt-1 mb-1">
                <div className="col">
                    <button
                        type="button"
                        className="btn btn-primary w-100"
                        disabled={joinRoomMutation.isLoading}
                        onClick={clearAndCloseModal}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const Home: NextPage = (data) => {
    const closeModal = () => {
        setModalOpeningState("close");
    };

    const [modalOpeningState, setModalOpeningState] =
        useState<ModalOpeningState>("close");

    return (
        <>
            <CreateRoomModalComponent
                isOpen={modalOpeningState === "openingCreateRoomModal"}
                closeModal={() => closeModal()}
            />
            <JoinRoomModalComponent
                isOpen={modalOpeningState === "openingJoinRoomModal"}
                closeModal={() => closeModal()}
            />
            <main>
                <div className="container">
                    <h1 className="text-center">Meeting Scheduler</h1>
                    <div className="row">
                        <div className="col-12 text-center">
                            <button
                                type="button"
                                className="btn btn-outline-success"
                                onClick={() =>
                                    setModalOpeningState(
                                        "openingCreateRoomModal"
                                    )
                                }
                            >
                                Create a room
                            </button>
                        </div>
                        <div className="col-12 text-center">
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() =>
                                    setModalOpeningState("openingJoinRoomModal")
                                }
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
    if (context.req.session.user) {
        Router.push("/dashboard");
    }

    return {
        props: {},
    };
};

export default Home;
