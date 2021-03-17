// Native
import { createServer as createHTTPServer, Server } from 'http'

// Packages
import express from 'express'
import { Server as SocketServer, Socket } from "socket.io"
import { createServer as createViteServer, ViteDevServer } from 'vite'

// Ours
import { initSocket } from './socket-controller.js'
import webRoutes from './routes/web.js'

import { config } from './config.js'

let app: express.Application
let server: Server
let io: SocketServer
let vite: ViteDevServer

export default async function () {
    // create Express app, HTTP(S) & Socket.IO servers
    app = express()
    server = createHTTPServer(app)
    io = new SocketServer(server, {
        serveClient: false,
    })

    if (process.env.NODE_ENV !== 'production') {
    // Set up vite
        vite = await createViteServer({
            root: process.env.CG_ROOT,
            server: {
                middlewareMode: true
            },
            mode: process.env.NODE_ENV || 'production'
        })

        app.use(vite.middlewares)
    }
  
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    initSocket(io)

    console.log(`Attempting to listen on ${config.host}:${config.port}`)
    server.on('error', (err: NodeJS.ErrnoException) => {
        switch (err.code) {
        case 'EADDRINUSE':
            console.error(`[server.js] Listen ${config.host}:${config.port} in use, is the server already running? the server will now exit.`)
            break
        default:
            console.error('Unhandled error!', err)
            break
        }
    })

    console.log('Loading web routes')
    app.use(webRoutes())

    server.listen({
        host: config.host,
        port: config.port
    }, () => {
        const protocol = 'http'
        console.log('sweeper-chess running on %s://%s', protocol, config.host + ':' + config.port)
    })
}
