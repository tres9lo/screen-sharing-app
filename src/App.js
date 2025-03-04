import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import RoomList from './components/RoomList';
import VideoChat from './VideoChat'; // Your existing video chat component

function App() {
    const isAuthenticated = () => {
        return localStorage.getItem('token') !== null;
    };

    const PrivateRoute = ({ children }) => {
        return isAuthenticated() ? children : <Navigate to="/login" />;
    };

    return (
        <Router>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/rooms" element={<PrivateRoute><RoomList /></PrivateRoute>} />
                <Route path="/video/:roomId" element={<PrivateRoute><VideoChat /></PrivateRoute>} />
                <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
}

export default App;