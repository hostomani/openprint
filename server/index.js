import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import fetch from 'node-fetch';

const ODOO_URL = 'https://bd0aae1d-d3f6-4f5c-92e6-b042ab8b4145.odoo.bot'
const UPDATES_URL = ODOO_URL + '/openprint/updates'
// Initialize the Express application
const app = express();

// Create an HTTP server using Express
const server = http.createServer(app);

// Initialize the WebSocket server instance
const wss = new WebSocketServer({ server });

// const clients = {}
// let printers = {}


// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log('New WebSocket connection');
    // let client_id = randomUUID()
    // // Send a welcome message to the client
    // ws.send(JSON.stringify({ id: client_id}));

    // Handle incoming messages from the client
    ws.on('message', async (data) => {
        const message = JSON.parse(data);
        if(message.printers){
            // {
            //     client_id: 'bc:d0:74:21:96:92',
            //     printers: {
            //       HP_DeskJet_2700_series__1CB41C_: 'ipps://HP38CA841CB41C.local.:631/ipp/print'
            //     }
            // }
            message.client_ip = ip_address
            console.log(message)

            const response = await fetch(UPDATES_URL, {
                method: 'post',
                body: JSON.stringify(message),
                headers: {'Content-Type': 'application/json'}
            });
            const data = await response.json();
            
        }
        if(message.print){
            for(const [printer, fileUrl] of Object.entries(message.print)){
                console.log('printer name ', printer)
                console.log('file url ', fileUrl)
            }
        }

    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    // Handle WebSocket close events
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

// Start the server on port 3000
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Express server listening on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
});