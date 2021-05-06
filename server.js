const WebSocket = require('ws')

// Server Peer-Peer

const rooms = new Map()

const server = new WebSocket.Server({
    port: process.env.PORT || 3000
})

// On connection
server.on('connection', (socket, request) => {

    console.log('client connected')

    // Handle disconnection websockets. Close it if it doesn't work.
    socket.lastPing = Date.now()

    socket.isAlive = true

    const room = request.url.replace('/', '').split('room=')[1].slice(0, 7)
    // Get room name

    const maxMembers = request.url.replace('/', '').split('limit=')[1].split(0, 1)
    // Can only be 1-9 Single digit
    
    // Handle messages. peer2peer messaging.
    socket.on('message', (chunk) => {

        chunk = chunk.toString()
        
        const roomClients = rooms.get(room)['clients']

        if (chunk.includes('ping')) {
            
            console.log('Got a ping!')
            // If client gets message and returns it, say ok.
            socket.isAlive = true

            socket.lastPing = Date.now()
            // Set timestamp of last ping message.

            return

        }

        for (let i = 0; i < roomClients.length; i++) {

            if (i + 1 !== socket.id) roomClients[i].send(chunk)
            // -- Only send it to other players.
            
        }

    })

    if (room.length > 7) {

        socket.send(JSON.stringify({
            error: 'Room ID Too Long.'
        }))

        socket.terminate()

        return
        
    }

    if (rooms.has(room) && rooms.get(room)['clients'].length >= rooms.get(room)['limit']) {

        socket.send(JSON.stringify({
            error: 'Room is full.'
        }))

        socket.terminate()

        return
        
    }

    // Accept user.

    if (!rooms.has(room)) rooms.set(room, {
        name: room,
        clients: [],
        limit: maxMembers
    })

    let thisRoom = rooms.get(room)

    // Add client to list
    thisRoom['clients'].push(socket)

    rooms.set(room, thisRoom)

    // Give user their id. (incremental)

    socket.id = thisRoom['clients'].length

    socket.send(JSON.stringify({
        event: 'ready',
        data: thisRoom['clients'].length
    }))

    console.log(`Client connected on channel ${socket.id} on room ${room}`)

    // Make sure client is connected. If not, kill connection, and kick from room.

    socket.aliveCheck = setInterval(() => {
        
        // Update thisRoom variable
        thisRoom = rooms.get(room)

        const durationBetween = Date.now() - socket.lastPing

        console.log(`Duration for client ${socket.id}. ${durationBetween}ms`)

        if (durationBetween > 5000) {

            // Clear the timeout!
            clearInterval(socket.aliveCheck)

            // Kick user if not responding for 5 seconds

            // Tell others in the room that their id is going to be changed.
            for (let i = 0; i < thisRoom['clients'].length; i++) {

                if (i >= socket.id) {
                    // ----------------------- ^ Only send to users who are affected.
                    const thisClient = thisRoom['clients'][i]

                    thisClient['id']--

                    thisClient.send(JSON.stringify({
                        event: 'ready',
                        data: i + 1
                    }))
                    // -- Update all affected user's ids. Keep everything operating smoothly.

                }
                
                console.log('Lenold:', rooms.get(room)['clients'].length)

                // Remove client from room.

                console.log(socket.id === 1)
                if (socket.id === 1) {

                    thisRoom['clients'] = []

                    rooms.set(room, thisRoom)

                } else {

                    thisRoom['clients'].splice(socket.id - 1, 1)
                
                    rooms.set(room, thisRoom)

                }

                console.log('splicing...', socket.id - 1)

                console.log('Len:', rooms.get(room)['clients'].length)

            }
            
            console.log(`Client ${socket.id} disconnected from room ${room}`)
            // Of course, log it to the console.

            socket.terminate()

            delete socket
            // Kill them! Vaporize another garbage user! 😈

        }

    }, 2500);

})