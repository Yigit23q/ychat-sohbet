const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs');

const ADMIN_HESABI = "yigit"; 

app.use(express.json());
app.use(express.static(__dirname)); 

const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const PRIVATE_FILE = path.join(__dirname, 'private_messages.json');
const USERS_FILE = path.join(__dirname, 'users.json');

let users = {};
let messages = []; 
let privateMessages = []; 
let onlineUsers = {}; 
let userActiveRooms = {}; // Hangi kullanıcının hangi odada (general veya bir kullanıcı adı) olduğunu tutar

if (fs.existsSync(USERS_FILE)) { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
if (fs.existsSync(MESSAGES_FILE)) { messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8')); }
if (fs.existsSync(PRIVATE_FILE)) { privateMessages = JSON.parse(fs.readFileSync(PRIVATE_FILE, 'utf8')); }

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if(users[username]) { return res.json({ success: false, message: "Bu kullanıcı adı zaten alınmış!" }); }
    users[username] = password; 
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    io.emit('update users', { online: Object.values(onlineUsers), all: Object.keys(users) });
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if(users[username] && users[username] === password) { return res.json({ success: true }); }
    res.json({ success: false, message: "Kullanıcı adı veya şifre hatalı!" });
});

io.on('connection', (socket) => {
    let currentSocketUser = "";

    // KULLANICI ODAYA GİRDİĞİNDE VEYA ODA DEĞİŞTİRDİĞİNDE
    socket.on('user join', (data) => {
        const { username, room } = data;
        currentSocketUser = username;
        onlineUsers[socket.id] = username;
        userActiveRooms[username] = room; // Kullanıcının o an hangi odada olduğunu kaydet

        io.emit('update users', { online: Object.values(onlineUsers), all: Object.keys(users) });
        
        if (room === 'general') {
            socket.emit('load history', messages);
        }

        // Eğer kullanıcı bir özel odaya girdiyse, o kişiden gelen okunmamış mesajları OKUNDU yap
        if (room !== 'general') {
            privateMessages.forEach(m => {
                if (m.sender === room && m.receiver === username) m.read = true;
            });
            fs.writeFileSync(PRIVATE_FILE, JSON.stringify(privateMessages, null, 2));
            io.emit('messages read status updated', { sender: room, receiver: username });
        }

        const interactedUsers = [...new Set(privateMessages
            .filter(m => m.sender === username || m.receiver === username)
            .map(m => m.sender === username ? m.receiver : m.sender)
        )];
        socket.emit('load dm list', interactedUsers);
    });

    // MANUEL MARK AS READ TETİKLEYİCİSİ
    socket.on('mark as read', (data) => {
        const { sender, receiver } = data;
        let changed = false;
        privateMessages.forEach(m => {
            if (m.sender === sender && m.receiver === receiver && !m.read) {
                m.read = true;
                changed = true;
            }
        });
        if (changed) {
            fs.writeFileSync(PRIVATE_FILE, JSON.stringify(privateMessages, null, 2));
            io.emit('messages read status updated', { sender, receiver });
        }
    });

    socket.on('chat message', (msg) => {
        const simdi = new Date();
        msg.id = Date.now() + Math.random().toString(36).substr(2, 9);
        msg.time = `${String(simdi.getHours()).padStart(2, '0')}:${String(simdi.getMinutes()).padStart(2, '0')}`;
        msg.dateStamp = simdi.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

        if (msg.room === 'general') {
            messages.push(msg); 
            fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
            io.emit('chat message', msg); 
        } else {
            // KRİTİK DÜZELTME: Karşı taraf o an aktif olarak BİZİM odamızda mı?
            const isReceiverInMyRoom = userActiveRooms[msg.receiver] === msg.sender;
            msg.read = isReceiverInMyRoom; // Eğer bizim odadaysa doğrudan okundu (true) yap

            privateMessages.push(msg);
            fs.writeFileSync(PRIVATE_FILE, JSON.stringify(privateMessages, null, 2));
            io.emit('private chat message', msg);
        }
    });

    socket.on('load private history', (roomData) => {
        const { user1, user2 } = roomData;
        const filtered = privateMessages.filter(m => 
            (m.sender === user1 && m.receiver === user2) || 
            (m.sender === user2 && m.receiver === user1)
        );
        socket.emit('load private history response', filtered);
    });

    socket.on('delete message', (msgId) => {
        if (currentSocketUser === 'admin' || currentSocketUser === ADMIN_HESABI) {
            messages = messages.filter(m => m.id !== msgId);
            privateMessages = privateMessages.filter(m => m.id !== msgId);
            fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
            fs.writeFileSync(PRIVATE_FILE, JSON.stringify(privateMessages, null, 2));
            io.emit('message deleted', msgId);
        }
    });

    socket.on('disconnect', () => {
        if (currentSocketUser) {
            delete userActiveRooms[currentSocketUser];
        }
        delete onlineUsers[socket.id];
        io.emit('update users', { online: Object.values(onlineUsers), all: Object.keys(users) });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla çalışıyor!`);
});