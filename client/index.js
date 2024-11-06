import WebSocket from 'ws';
import fetch from 'node-fetch';
import fs from 'fs'
import { exec } from 'child_process';
import path from 'path';

const OPEN_PRINT_HTTP_SERVER_URL = 'http://localhost:3000';
const OPEN_PRINT_WS_SERVER_URL = 'ws://localhost:3000';

class OpenPrintClient {
    constructor() {
        const self = this;
        self.connect()
    }

    connect() {
        const self = this;  // Capture the context as `self`
        self.connection = new WebSocket(OPEN_PRINT_WS_SERVER_URL);

        // Use `self` for accessing class methods inside callbacks
        self.connection.on('open', () => self.onOpen());
        self.connection.on('message', (message) => self.onMessage(message));
        self.connection.on('error', (error) => self.onError(error));
        self.connection.on('close', () => self.onClose());
    }

    onOpen() {
        let self = this
        console.log('Connection opened successfully');
        self.startSendingPrintersInfo()
    }

    onMessage(data) {
        let self = this
        let message = JSON.parse(data)
        if(message.id){
            self.id = message.id
        }
        console.log('Received message:', message);

    }

    onClose() {
        let self = this
        setTimeout(() => {
            console.log('Connection closed, trying to reconnect ...');
            self.connect()                
        }, 5000);
    }

    onError(error) {
        let self = this

    }

    fetchNetowkPrintersInfo() {
        let self = this
        // Check the operating system and get printers accordingly
        let command;

        // Determine the command based on the OS
        if (process.platform === 'win32') {
            command = 'wmic printer get name';
        } else if (process.platform === 'darwin') {
            command = 'lpstat -v';
        } else if (process.platform === 'linux') {
            command = 'lpstat -v';
        } else {
            console.error('Unsupported OS for printer detection');
            return;
        }
        let printersInfo = {}
        // Execute the command to list printers
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error retrieving printers: ${stderr}`);
                return;
            }

            // Send printer information via WebSocket
            const printers = stdout.split('\n').filter(line => line.trim() !== '');
            printersInfo = {
                // client_id: self.id,
                printers: {}
            };
            for (const printer of printers) {
                printersInfo.printers[printer.trim().split(': ')[0].split(' ').slice(-1)] = printer.trim().split(': ')[1]
            }
            console.log(printersInfo)
            console.log('sending printersInfo')
            if(self.connection.OPEN){
                self.connection.send(JSON.stringify(printersInfo))
            }
        })
    }
    fetchLocalPrintersInfo() {
        // Check the operating system and get printers accordingly
        let command;

        // Determine the command based on the OS
        if (process.platform === 'win32') {
            command = 'wmic printer get name';
        } else if (process.platform === 'darwin') {
            command = 'lpstat -e';
        } else if (process.platform === 'linux') {
            command = 'lpstat -e';
        } else {
            console.error('Unsupported OS for printer detection');
            return;
        }
        let printersInfo = {}
        // Execute the command to list printers
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error retrieving printers: ${stderr}`);
                return;
            }

            // Send printer information via WebSocket
            const printers = stdout.split('\n').filter(line => line.trim() !== '');
            printersInfo = {
                printers: printers.map(printer => printer.trim())
            };
            console.log(printersInfo)
            console.log('sending printersInfo')
            self.connection.send(JSON.stringify(printersInfo))
        })
    }
    fetchPrintersInfo() {
        let self = this
        self.fetchNetowkPrintersInfo()
    }
    startSendingPrintersInfo() {
        let self = this
        if (self.fetchPrintersInterval) {
            clearInterval(self.fetchPrintersInterval)
        }
        self.fetchPrintersInterval = setInterval(() => {
            self.fetchPrintersInfo()
        }, 5000);
    }
    stopSendingPrintersInfo() {
        let self = this
        if (self.fetchPrintersInterval) {
            clearInterval(self.fetchPrintersInterval)
        }
    }
    downloadAndPrint(fileUrl, printerName) {
        // Define the file path where the file will be saved
        const filePath = path.join(__dirname, 'downloaded_file.pdf'); // Change the extension based on your file type

        // Determine the command to use for downloading the file
        const downloadCommand = process.platform === 'win32'
            ? `powershell -Command "Invoke-WebRequest -Uri '${fileUrl}' -OutFile '${filePath}'"`
            : `curl -o '${filePath}' '${fileUrl}'`;

        // Execute the download command
        exec(downloadCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error downloading file: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Download stderr: ${stderr}`);
                return;
            }
            console.log(`File downloaded to ${filePath}`);

            // Define the print command based on the platform
            const printCommand = process.platform === 'win32'
                ? `print /D:"${printerName}" "${filePath}"`
                : `lp -d ${printerName} '${filePath}'`; // Adjust for lp command usage

            // Execute the print command
            exec(printCommand, (printError, printStdout, printStderr) => {
                if (printError) {
                    console.error(`Error printing file: ${printError.message}`);
                    return;
                }
                if (printStderr) {
                    console.error(`Print stderr: ${printStderr}`);
                    return;
                }
                console.log(`File sent to printer: ${printerName}`);
                // Remove the downloaded file after printing
                fs.unlink(filePath, (unlinkError) => {
                    if (unlinkError) {
                        console.error(`Error deleting file: ${unlinkError.message}`);
                        return;
                    }
                    console.log(`File deleted: ${filePath}`);
                });
            });
        });
    }
}

let client = new OpenPrintClient();