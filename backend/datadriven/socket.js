const { Server } = require('socket.io');

let io;

const init = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // In production, replace with your frontend URL
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`[SOCKET] User connected: ${socket.id}`);

        socket.on('join', (userId) => {
            if (userId) {
                socket.join(String(userId));
                console.log(`[SOCKET] User ${userId} joined room`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[SOCKET] User disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

const emitNotification = (userId, notification) => {
    if (io) {
        io.to(String(userId)).emit('notification', notification);
        console.log(`[SOCKET] Emitted notification to user ${userId}`);
    }
};

module.exports = {
    init,
    getIO,
    emitNotification
};
