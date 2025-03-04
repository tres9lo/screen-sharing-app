const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  socket.on('new-peer', (peerId) => {
    socket.broadcast.emit('new-peer', { peerId, initiator: socket.id });
  });

  socket.on('send-message', (message) => {
    socket.broadcast.emit('send-message', message);
  });
});

const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});