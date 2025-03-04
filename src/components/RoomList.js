import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function RoomList() {
    const [rooms, setRooms] = useState([]);
    const [roomName, setRoomName] = useState('');
    const userId = localStorage.getItem('userId');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await axios.get(`http://localhost:3001/rooms/${userId}`);
                setRooms(response.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchRooms();
    }, [userId]);

    const createRoom = async () => {
        try {
            await axios.post('http://localhost:3001/create-room', { userId, roomName });
            setRoomName('');
            window.location.reload();
        } catch (error) {
            console.error(error);
        }
    };
    const joinRoom = (roomId) => {
      navigate(`/video/${roomId}`);
    };

    return (
        <div>
            <h2>Your Rooms</h2>
            <input type="text" placeholder="Room Name" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
            <button onClick={createRoom}>Create Room</button>
            <ul>
                {rooms.map((room) => (
                    <li key={room.id}>
                        {room.room_name} - <button onClick={() => joinRoom(room.id)}>Join</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default RoomList;