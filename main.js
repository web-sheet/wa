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

// New endpoint to send messages
client.on('message_create', message => {   
    if (message.from === client.info.wid._serialized) {
        return; 
    }

    console.log(message.body);
    const messageBody = message.body;

    // Existing functionality to save messages to Google Sheets
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

    // Existing functionality to respond to messages
    const msgBody = message.body.toLowerCase();
    fetch('https://script.google.com/macros/s/AKfycbyFzI3fywUiQ11gzDuJAIdwU2VaofG9BYf4CS14-n_5jZcKEzqjr4jp_hZiObVRoHm1/exec?query=' + encodeURIComponent(msgBody))
        .then(response => response.json())
        .then(data => {
            if (data.response) {
                    // Replace escaped new line characters with actual new lines for display
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

// New function to send messages based on cell clicks
async function sendMessageToNumber(number, message) {
    try {
        await client.sendMessage(number, message);
        console.log(`Message sent to ${number}: ${message}`);
    } catch (error) {
        console.error(`Failed to send message to ${number}:`, error);
    }
}

client.initialize();
