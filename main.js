import fetch from 'node-fetch';
import qrcode from 'qrcode-terminal';
import { Client } from 'whatsapp-web.js';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/sendMessage', (req, res) => {
    const { number, message } = req.body;
    sendMessageToNumber(number, message);
    res.status(200).send({ result: 'Message sent' });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

const client = new Client();

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('message_create', message => {   
    if (message.from === client.info.wid._serialized) {
        return; 
    }

    // Check if the message is a location message
    if (message.type === 'location') {
        const latitude = message.location.latitude;
        const longitude = message.location.longitude;

        console.log(`Received location: Latitude: ${latitude}, Longitude: ${longitude}`);

        // Send location data to Google Apps Script
        fetch('https://script.google.com/macros/s/AKfycbyFzI3fywUiQ11gzDuJAIdwU2VaofG9BYf4CS14-n_5jZcKEzqjr4jp_hZiObVRoHm1/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ latitude, longitude }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Location saved to Google Sheets:', data);
        })
        .catch((error) => {
            console.error('Error saving location:', error);
        });

        return; // Exit after processing location
    }

    // Handle regular text messages
    const messageBody = message.body;
    console.log(messageBody);
    
    fetch('https://script.google.com/macros/s/AKfycbyFzI3fywUiQ11gzDuJAIdwU2VaofG9BYf4CS14-n_5jZcKEzqjr4jp_hZiObVRoHm1/exec', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageBody }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Message saved to Google Sheets:', data);
    })
    .catch((error) => {
        console.error('Error saving message:', error);
    });

    const msgBody = message.body.toLowerCase();

    fetch('https://script.google.com/macros/s/AKfycbyFzI3fywUiQ11gzDuJAIdwU2VaofG9BYf4CS14-n_5jZcKEzqjr4jp_hZiObVRoHm1/exec?query=' + encodeURIComponent(msgBody))
        .then(response => response.json())
        .then(data => {
            if (data.response) {
                const formattedResponse = data.response.replace(/\\n/g, "\n");
                client.sendMessage(message.from, formattedResponse);
            } else {
                client.sendMessage(message.from, 'Hello, how can I assist you?');
            }
        })
        .catch((error) => {
            console.error('Error fetching response:', error);
            client.sendMessage(message.from, 'Sorry, I could not process your request.');
        });
});

client.initialize();

