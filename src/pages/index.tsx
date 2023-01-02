import { type NextPage } from "next";
import Modal from "react-modal";

import { trpc } from "../utils/trpc";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";

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

type CreateRoomModalComponentType = BasedModalComponentType & {
    createRoom: (
        title: string, hostName: string, startTime : Date, endTime : Date, numberOfAttendees : number
    ) => Promise<boolean|undefined>;
};

type JoinRoomModalComponentType = BasedModalComponentType & {
    joinRoom: (
        secretKey: string, name: string
    ) => Promise<boolean|undefined>;
};

type ModalOpeningState = "openingCreateRoomModal" | "openingJoinRoomModal" | "close";

const CreateRoomModalComponent: React.FC<CreateRoomModalComponentType> = ({
    isOpen,
    closeModal,
    createRoom,
}) => {
    const [roomTitle, setRoomTitle] = useState<string>("");
    const [hostName, setHostName] = useState<string>("");
    const [startTime, setStartTime] = useState<Date>(new Date());
    const [endTime, setEndTime] = useState<Date>(new Date());
    const [numberOfAttendees, setNumberOfAttendees] = useState<number>(DefaultNumberOfAttendees);

    const handleChangeNumberOfAttendees = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = parseInt(e.target.value);

        if (inputValue < DefaultNumberOfAttendees) {
            toast.error(`Number of attendees must be greater than ${DefaultNumberOfAttendees-1}`);
            return;
        }

        setNumberOfAttendees(inputValue);
    };

    const handleSubmit = async () =>{
        //validate all input
        if (roomTitle.trim() === "") {
            toast.error("Room title must not be empty");
            return;
        }

        if (hostName.trim() === "") {
            toast.error("Host name must not be empty");
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
            toast.error(`Number of attendees must be greater than ${DefaultNumberOfAttendees-1}`);
            return;
        }

        const result = await createRoom(roomTitle, hostName, startTime, endTime, numberOfAttendees);

        if (!result) {
            toast.error("Failed to create room");
            return;
        }

        clearAndCloseModal();
    }


    const clearAndCloseModal = () => {
        setRoomTitle("");
        setHostName("");
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
                    <h2>
                        Create Room
                    </h2>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Meeting Room Title"
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
                            type="datetime-local"
                            className="form-control"
                            value={startTime.toISOString().slice(0, 16)}
                            onChange={(e) => setStartTime(new Date(e.target.value))}
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
                            value={endTime.toISOString().slice(0, 16)}
                            onChange={(e) => setEndTime(new Date(e.target.value))}
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
                        onClick={clearAndCloseModal}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const JoinRoomModalComponent: React.FC<JoinRoomModalComponentType> = ({
    isOpen,
    closeModal,
    joinRoom,
}) => {
    const [secret, setSecret] = useState<string>("");
    const [name, setName] = useState<string>("");

    const handleSubmit = async () => {
        //validate all input
        if (secret.trim() === "") {
            toast.error("Secret must not be empty");
            return;
        }

        if (name.trim() === "") {
            toast.error("Name must not be empty");
            return;
        }

        const result = await joinRoom(secret, name);

        if (!result) {
            toast.error("Failed to join room");
            return;
        }

        clearAndCloseModal();
    };

    const clearAndCloseModal = () => {
        setSecret("");
        setName("");
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
                    <h2>
                        Join Room
                    </h2>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Secret"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
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
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="row mt-5 mb-1">
                <div className="col">
                    <button
                        type="button"
                        className="btn btn-success w-100"
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
                        onClick={clearAndCloseModal}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};



const Home: NextPage = () => {

    const createRoomMutation = trpc.room.createRoom.useMutation();
    const joinRoomMutation = trpc.room.joinRoom.useMutation();

    const closeModal = () => {
        setModalOpeningState("close");
    };

    const handleCreateRoom = async (title: string, hostName: string, startTime : Date, endTime : Date, numberOfAttendees : number) => {

        const createRoomResult = await createRoomMutation.mutateAsync({
            title,
            hostName,
            startTime,
            endTime,
            numberOfAttendees
        });

        if(!createRoomResult.result){
            toast.error("Failed to create room");
            return;
        }

        toast.success(`Room created successfully, your secret is copied to clipboard, please save it immediately!`);
        navigator.clipboard.writeText(createRoomResult.data?.secretKey!);

        return createRoomResult.result;
    };

    const handleJoinRoom = async (secretKey: string, attendeeName: string) => {

        const joinRoomResult = await joinRoomMutation.mutateAsync({
            secretKey,
            attendeeName
        });

        if(!joinRoomResult.result){
            toast.error(joinRoomResult.error);
            return;
        }

        return joinRoomResult.result;
    };

    const [modalOpeningState, setModalOpeningState] = useState<ModalOpeningState>("close");

    return (
        <>
            <CreateRoomModalComponent isOpen={modalOpeningState === "openingCreateRoomModal"} closeModal={() => closeModal()} createRoom={handleCreateRoom} />
            <JoinRoomModalComponent isOpen={modalOpeningState === "openingJoinRoomModal"} closeModal={() => closeModal()} joinRoom={handleJoinRoom} />
            <main>
                <div className="container">
                    <h1 className="text-center">Meeting Scheduler</h1>
                    <div className="row">
                        <div className="col-12 text-center">
                            <button
                                type="button"
                                className="btn btn-outline-success"
                                onClick={() => setModalOpeningState("openingCreateRoomModal")}
                            >
                                Create a room
                            </button>
                        </div>
                        <div className="col-12 text-center">
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => setModalOpeningState("openingJoinRoomModal")}
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

export default Home;

