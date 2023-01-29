import Modal from "react-modal";
import { trpc } from "../utils/trpc";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { ToISOStringLocal, ValidateEmail } from "../utils/common";
import { isLoggedIn, logout } from "../utils/session";
import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import { parse } from "querystring";

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

const MinimumNumberOfAttendees = 2;

type BasedModalComponentType = {
    isOpen: boolean;
    closeModal: () => void;
};

type JoinRoomModalComponentType = BasedModalComponentType & {
    roomSecretKey: string | undefined;
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
    const router = useRouter();

    const [roomTitle, setRoomTitle] = useState<string>("");
    const [hostName, setHostName] = useState<string>("");
    const [hostEmail, setHostEmail] = useState<string>("");
    const [startTime, setStartTime] = useState<Date>(new Date());
    const [endTime, setEndTime] = useState<Date>(new Date());
    const [numberOfAttendees, setNumberOfAttendees] = useState<number>();

    const handleChangeNumberOfAttendees = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const inputValue = parseInt(e.target.value);
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

        if (!ValidateEmail(hostEmail)) {
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

        if (numberOfAttendees === null || numberOfAttendees === undefined) {
            toast.error("Number of attendees must not be empty");
            return;
        }

        if (numberOfAttendees < MinimumNumberOfAttendees) {
            toast.error(
                `Number of attendees must be greater than ${
                    MinimumNumberOfAttendees - 1
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
            timeZone,
        });

        if (createRoomMutation.isError || !createRoomResult) {
            toast.error("Failed to create room");
            return;
        }

        clearAndCloseModal();

        const RoomURL = `${window.location.origin}?roomSecretKey=${createRoomResult.secretKey}`;

        toast.success(
            `Room created successfully, your room URL is copied to clipboard, please save it immediately!`
        );

        navigator.clipboard.writeText(RoomURL);

        //toast a component with copy function
        toast(
            <strong
                onClick={() => {
                    navigator.clipboard.writeText(RoomURL);
                    toast.success("Copied to clipboard");
                }}
                style={{ cursor: "pointer" }}
            >
                Click here to copy room URL again
            </strong>,
            {
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
            }
        );

        //toast a component with join function
        toast(
            <strong
                onClick={() => {
                    router.push("/dashboard");
                }}
                style={{ cursor: "pointer" }}
            >
                Click here to join room
            </strong>,
            {
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
            }
        );
    };

    const clearAndCloseModal = () => {
        setRoomTitle("");
        setHostName("");
        setHostEmail("");
        setStartTime(new Date());
        setEndTime(new Date());
        setNumberOfAttendees(undefined);
        closeModal();
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={clearAndCloseModal}
            style={modalCustomStyles}
            contentLabel="Example Modal"
            ariaHideApp={false}
            shouldCloseOnOverlayClick={false}
        >
            <div className="row">
                <div className="col">
                    <h2>Create Room</h2>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="form-floating">
                        <input
                            id="roomTitleInput"
                            type="text"
                            className="form-control"
                            placeholder="Meeting Room Title"
                            disabled={createRoomMutation.isLoading}
                            value={roomTitle}
                            onChange={(e) => setRoomTitle(e.target.value)}
                        />
                        <label htmlFor="roomTitleInput">
                            Meeting Room Title
                        </label>
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="form-floating">
                        <input
                            id="hostNameInput"
                            type="text"
                            className="form-control"
                            placeholder="Host Name"
                            disabled={createRoomMutation.isLoading}
                            value={hostName}
                            onChange={(e) => setHostName(e.target.value)}
                        />
                        <label htmlFor="hostNameInput">Host Name</label>
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="form-floating">
                        <input
                            id="hostEmailInput"
                            type="email"
                            className="form-control"
                            placeholder="Host Email"
                            disabled={createRoomMutation.isLoading}
                            value={hostEmail}
                            onChange={(e) => setHostEmail(e.target.value)}
                        />
                        <label htmlFor="hostEmailInput">Host Email</label>
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="form-floating">
                        <input
                            id="startTimeInput"
                            type="datetime-local"
                            className="form-control"
                            disabled={createRoomMutation.isLoading}
                            value={ToISOStringLocal(startTime).slice(0, 16)}
                            onChange={(e) =>
                                setStartTime(new Date(e.target.value))
                            }
                        />
                        <label htmlFor="startTimeInput">Start Time</label>
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="form-floating">
                        <input
                            id="endTimeInput"
                            type="datetime-local"
                            className="form-control"
                            disabled={createRoomMutation.isLoading}
                            value={ToISOStringLocal(endTime).slice(0, 16)}
                            onChange={(e) =>
                                setEndTime(new Date(e.target.value))
                            }
                        />
                        <label htmlFor="endTimeInput">End Time</label>
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="form-floating">
                        <input
                            id="numberOfAttendeesInput"
                            type="number"
                            className="form-control"
                            placeholder="Number of Attendees"
                            disabled={createRoomMutation.isLoading}
                            value={numberOfAttendees ?? ""}
                            onKeyDown={(evt) =>
                                evt.key === "e" && evt.preventDefault()
                            }
                            onChange={(e) => handleChangeNumberOfAttendees(e)}
                        />
                        <label htmlFor="numberOfAttendeesInput">
                            Number of Attendees
                        </label>
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

            <div className="row">
                <div className="col">
                    <button
                        type="button"
                        className="btn btn-danger w-100"
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

const JoinRoomModalComponent: React.FC<JoinRoomModalComponentType> = ({
    isOpen,
    closeModal,
    roomSecretKey,
}) => {
    const joinRoomMutation = trpc.room.joinRoom.useMutation();

    const [secretKey, setSecretKey] = useState<string>(
        roomSecretKey ? roomSecretKey : ""
    );
    const [attendeeName, setAttendeeName] = useState<string>("");
    const [attendeeEmail, setAttendeeEmail] = useState<string>("");
    const router = useRouter();

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

        if (!ValidateEmail(attendeeEmail)) {
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
            router.push("/dashboard");
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
            ariaHideApp={false}
            shouldCloseOnOverlayClick={false}
        >
            <div className="row">
                <div className="col">
                    <h2>Join Room</h2>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="form-floating">
                        <input
                            id="serectKeyInput"
                            type="text"
                            className="form-control"
                            placeholder="Secret Key"
                            disabled={
                                roomSecretKey != undefined ||
                                joinRoomMutation.isLoading
                            }
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                        />
                        <label htmlFor="serectKeyInput">Secret Key</label>
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="form-floating">
                        <input
                            id="attendeeNameInput"
                            type="text"
                            className="form-control"
                            placeholder="Name"
                            disabled={joinRoomMutation.isLoading}
                            value={attendeeName}
                            onChange={(e) => setAttendeeName(e.target.value)}
                        />
                        <label htmlFor="attendeeNameInput">Name</label>
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <div className="form-floating">
                        <input
                            id="attendeeEmailInput"
                            type="text"
                            className="form-control"
                            placeholder="Email"
                            disabled={joinRoomMutation.isLoading}
                            value={attendeeEmail}
                            onChange={(e) => setAttendeeEmail(e.target.value)}
                        />
                        <label htmlFor="attendeeEmailInput">Email</label>
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

            <div className="row">
                <div className="col">
                    <button
                        type="button"
                        className="btn btn-danger w-100"
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

const Home: NextPage = () => {
    const router = useRouter();
    const { roomSecretKey }  = parse(router.asPath.substr(router.asPath.indexOf("?") + 1));

    const logoutMutation = trpc.room.logout.useMutation();

    const getRoomQuery = trpc.room.getRoomBySession.useQuery(undefined, {
        retry: false,
    });

    if (!roomSecretKey && getRoomQuery.isSuccess) {
        router.push("/dashboard");
    }

    if (
        roomSecretKey &&
        getRoomQuery.isSuccess &&
        getRoomQuery.data.room.secretKey == roomSecretKey
    ) {
        router.push("/dashboard");
    }

    if (
        roomSecretKey &&
        getRoomQuery.isSuccess &&
        getRoomQuery.data.room.secretKey != roomSecretKey
    ) {
        logoutMutation.mutate();
    }

    const closeModal = () => {
        setModalOpeningState("close");
    };

    const [modalOpeningState, setModalOpeningState] =
        useState<ModalOpeningState>(
            roomSecretKey ? "openingJoinRoomModal" : "close"
        );
    return (
        <>
            <CreateRoomModalComponent
                isOpen={modalOpeningState === "openingCreateRoomModal"}
                closeModal={() => closeModal()}
            />
            <JoinRoomModalComponent
                isOpen={modalOpeningState === "openingJoinRoomModal"}
                closeModal={() => closeModal()}
                roomSecretKey={roomSecretKey as string | undefined}
            />
            <div
                className="h-100 d-flex align-items-center justify-content-center"
                style={{
                    backgroundColor: "#D9AFD9",
                    backgroundImage:
                        "linear-gradient(0deg, #D9AFD9 0%, #97D9E1 100%)",
                }}
            >
                <div className="d-flex align-items-center justify-content-center flex-column gap-3 ">
                    <h1 className="text-center">Meeting Scheduler</h1>
                    <button
                        type="button"
                        className="btn btn-success "
                        onClick={() =>
                            setModalOpeningState("openingCreateRoomModal")
                        }
                    >
                        Create a room
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                            setModalOpeningState("openingJoinRoomModal")
                        }
                    >
                        Join a room
                    </button>
                </div>
            </div>
        </>
    );
};

export default Home;
