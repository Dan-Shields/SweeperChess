import { Server as SocketServer, Socket } from 'socket.io'

export function initSocket (io: SocketServer) {

    // Socket.IO setup
    io.on('connection', (socket: Socket) => {
    //console.log('New socket connection: ID %s with IP %s', socket.id, socket.handshake.address);
	
        socket.on('error', err => {
            console.error(err.stack)
        })
	
        socket.on('room', room => {
            socket.join(room)
        })
    })
}
