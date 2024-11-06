import { randomUUID } from 'crypto';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

// Initialize the Express application
const app = express();

// Create an HTTP server using Express
const server = http.createServer(app);

// Initialize the WebSocket server instance
const wss = new WebSocketServer({ server });

const clients = {}
let printers = {}

// Middleware to parse JSON bodies
app.use(express.json());

// Sample HTTP route
app.get('/', (req, res) => {
    res.send('Hello from Express!');
});
app.get('/printers', (req, res) => {
    res.send(printers);
});
// app.post('/printers', (req, res) => {
//     res.send(printers);
// });

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    // let client_id = randomUUID()
    // // Send a welcome message to the client
    // ws.send(JSON.stringify({ id: client_id}));

    // Handle incoming messages from the client
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        if(message.printers){
            for(const [key, val] of Object.entries(message.printers)){
                printers[key] = {
                    url: val,
                }
            }
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