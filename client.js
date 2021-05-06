// TODO: Get EventEmitter3 working for maximum performance

const WebSocket = require('ws')

const { EventEmitter } = require('events')

// Client Constructor 🚀

class Client extends EventEmitter {
    constructor(options = {
        room: '',
        limit: 0,
        url: '',
        actions: []
    }) {

        super()
        // EventEmitter

        if (options['actions']) options.actions = []

        // Connect to WebSocket Server 🍻
        this.socket = new WebSocket(`${options.url}?room=${options.room}&limit=${options.limit}`)

        this.actions = options['actions']
        // Add action support.

        // Handle ping/pong is alive protocol. If we get disconnected, we'll be kicked from the room and socket destroyed.

        // Ping/pong to prevent bugs. 🦠🐛
        this.on('ready', () => {

            setInterval(() => {
                
                this.socket.send('ping')
                // Send the timestamp. Let the server know were still there.

            }, 2500);

        })

        // Handle Messages 📬
        this.socket.on('message', async (chunk) => {

            let data = JSON.parse(chunk)
        
            // Handle ready event. (When socket is authorized and player added to room)
            if (data['event'] === 'ready') {
        
                if (this.readyState === this.OPEN) {
                    // If client is ready
                    this.id = data['data']

                    this.emit('ready', null)
        
                } else {
        
                    this.on('open', () => {
        
                        this.id = data['data']
                        
                        this.emit('ready', null)
        
                    })
        
                }
        
                return
        
            }

            data['data'] = {
                x: data['data'].slice(1, 4) / 1,
                y: data['data'].slice(5, 8) / 1
            }

            this.emit('message', data)
        
        })
    }

    // Send function. 🤑
    send(options = {
        event: '',
        data: '',
        actions: []
    }) {
        let actions = ''
        // 😱 Parse actions into a string.
        for (let i = 0; i < options['actions'].length; i++) {
            if (i === options['actions'].length - 1) {
                actions += `${options['actions'][i]}`
            } else {
                actions += `${options['actions'][i]}/`
            }
        }
        // Send to room! ⚡ (Don't even need ready event! Cache them and then send!)
        if (this.socket.readyState === this.socket.OPEN) {

            this.socket.send(JSON.stringify({
                event: options['event'],
                data: options['data'],
                actions: actions
            }))

        } else {

            this.socket.on('open', () => {

                for (const message of this.socket.messageQueue) {

                    this.socket.send(message)

                }

            })

            this.socket.messageQueue = []

            this.socket.messageQueue.push(JSON.stringify({
                event: options['event'],
                data: options['data'],
                actions: actions
            }))

        }

        // Cha-ching! Mail sent! 📨
    }
}

module.exports = Client

// Testing

const client = new Client({
    room: '1234567',
    // Must be 7 chars long
    limit: 2,
    url: 'ws://localhost:5000',
    actions: []
})

client.on('message', (data) => {

    console.log(data)

})

setInterval(() => {
    
    client.send({
        event: 'position',
        data: 'x0.4y1.8',
        actions: []
    })

}, 1000);