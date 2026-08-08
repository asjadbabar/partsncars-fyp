// socketManager.js (new file or inside your server.js)
const { Server } = require('socket.io');
const onlineUsers = new Map(); // sellerId => socketId

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    socket.on('registerUser', (userId) => {
      onlineUsers.set(userId, socket.id);
    });

    socket.on('disconnect', () => {
      for (let [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
    });
  });
};

const notifySeller = (sellerId, orderDetails) => {
  const socketId = onlineUsers.get(sellerId);
  if (socketId && io) {
    io.to(socketId).emit('newOrderPlaced', orderDetails);
  }
};

module.exports = { initSocket, notifySeller };
