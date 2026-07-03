const ADMIN_HESABI = "yigit"; 

const myUsername = localStorage.getItem('username');
if(!myUsername) { window.location.href = '/'; }
document.getElementById('current-username').innerText = myUsername;

const socket = io();
const msgBox = document.getElementById('messages-box');
let currentRoom = 'general'; 
let lastDisplayedDate = ""; 

// Odayı ilk açışta odayı da sunucuya bildiriyoruz
socket.emit('user join', { username: myUsername, room: currentRoom });

const colors = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0d9488', '#ea580c'];
function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    return colors[Math.abs(hash) % colors.length];
}

function appendMessageElement(data, isHistoryLoad = false) {
    if(!data || !data.username || !data.text) return;

    if (data.dateStamp && data.dateStamp !== lastDisplayedDate) {
        const dateDiv = document.createElement('div');
        dateDiv.classList.add('date-divider');
        const bugün = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
        const basılacakTarih = (data.dateStamp === bugün) ? "Bugün" : data.dateStamp;
        dateDiv.innerHTML = `<span>${basılacakTarih}</span>`;
        msgBox.appendChild(dateDiv);
        lastDisplayedDate = data.dateStamp;
    }

    const div = document.createElement('div');
    div.classList.add('message-row');
    div.setAttribute('id', `msg-${data.id}`);
    
    const isMe = data.username === myUsername;
    if(isMe) div.classList.add('row-sent');

    const avatarColor = getAvatarColor(data.username);
    const firstLetter = data.username.charAt(0).toUpperCase();
    const gonderimSaati = data.time ? data.time : '--:--';
    const deleteBtn = (myUsername === 'admin' || myUsername === ADMIN_HESABI) ? `<i class="fa-regular fa-trash-can delete-icon" onclick="deleteMessage('${data.id}')"></i>` : '';

    let tickHtml = '';
    if (isMe && currentRoom !== 'general') {
        if (data.read) {
            tickHtml = `<span class="status-tick tick-read">🔵🔵</span>`; // Okundu (Mavi Çift Tik)
        } else {
            tickHtml = `<span class="status-tick tick-unread">✔️</span>`; // Gitti (Tek Tik)
        }
    }

    div.innerHTML = `
        <div class="avatar" style="background: ${avatarColor}">${firstLetter}</div>
        <div class="message-wrapper">
            <div class="message-body">
                <div class="meta">${data.username}</div>
                <div class="text">${data.text}</div>
                <div class="message-footer">
                    <span class="message-time">⏱ ${gonderimSaati} ${tickHtml}</span>
                    ${deleteBtn}
                </div>
            </div>
        </div>
    `;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;

    // Eğer özel odadaysak ve mesaj karşı taraftan anlık geldiyse sunucuya okundu bilgisini fırlat
    if (!isHistoryLoad && currentRoom !== 'general' && data.sender === currentRoom && data.receiver === myUsername) {
        socket.emit('mark as read', { sender: currentRoom, receiver: myUsername });
    }
}

socket.on('load history', function(history) {
    if (currentRoom === 'general') {
        msgBox.innerHTML = "";
        lastDisplayedDate = ""; 
        history.forEach(msg => appendMessageElement(msg, true));
    }
});

socket.on('load private history response', function(history) {
    if (currentRoom !== 'general') {
        msgBox.innerHTML = "";
        lastDisplayedDate = ""; 
        history.forEach(msg => appendMessageElement(msg, true));
    }
});

socket.on('chat message', function(data) {
    if (currentRoom === 'general' && data.room === 'general') {
        appendMessageElement(data);
    }
});

socket.on('private chat message', function(data) {
    if (currentRoom !== 'general' && 
        ((data.sender === myUsername && data.receiver === currentRoom) || 
         (data.sender === currentRoom && data.receiver === myUsername))) {
        appendMessageElement(data);
    }
    // DM listesindeki bildirimleri vs yenilemek için sunucuyu tetikle
    socket.emit('user join', { username: myUsername, room: currentRoom });
});

// OKUNDU DURUMU ANLIK DEĞİŞİNCE EKRANDAKİ TİKLERİ MAVİYE ÇEVİRME
socket.on('messages read status updated', function(data) {
    if (currentRoom !== 'general' && currentRoom === data.sender && myUsername === data.receiver) {
        // Özel oda geçmişini hızlıca yenileyerek tikleri mavi çift tike dönüştürür
        socket.emit('load private history', { user1: myUsername, user2: currentRoom });
    }
});

socket.on('load dm list', function(dmUsers) {
    const dmDiv = document.getElementById('dm-list');
    dmDiv.innerHTML = dmUsers.length === 0 ? '<span style="color:#475569; font-size:12px; padding:5px;">Henüz mesaj yok</span>' : '';
    dmUsers.forEach(user => {
        const uColor = getAvatarColor(user);
        const uLetter = user.charAt(0).toUpperCase();
        const activeClass = (currentRoom === user) ? 'active-chat' : '';
        dmDiv.innerHTML += `
            <div class="user-item ${activeClass}" onclick="selectPrivateChat('${user}')">
                <div class="mini-avatar" style="background: ${uColor}">${uLetter}</div>
                <span>${user}</span>
            </div>
        `;
    });
});

socket.on('update users', function(data) {
    const allUsers = data.all.filter(user => user !== myUsername);
    const onlineList = data.online;
    const allDiv = document.getElementById('all-users-list');
    allDiv.innerHTML = "";

    allUsers.forEach(user => {
        const isOnline = onlineList.includes(user);
        const uColor = isOnline ? getAvatarColor(user) : '#475569';
        const uLetter = user.charAt(0).toUpperCase();
        const activeClass = (currentRoom === user) ? 'active-chat' : '';
        const onlineDot = isOnline ? '<i class="fa-solid fa-circle" style="color:#22c55e; font-size:8px; margin-left:auto;"></i>' : '';

        allDiv.innerHTML += `
            <div class="user-item ${activeClass}" onclick="selectPrivateChat('${user}')">
                <div class="mini-avatar" style="background: ${uColor}">${uLetter}</div>
                <span>${user}</span>
                ${onlineDot}
            </div>
        `;
    });
});

function selectGeneralChat() {
    currentRoom = 'general';
    document.getElementById('general-btn').classList.add('active-chat');
    document.getElementById('chat-header').innerHTML = `<i class="fa-solid fa-users" style="color: #6366f1;"></i> Genel Sohbet Odası`;
    socket.emit('user join', { username: myUsername, room: currentRoom }); 
}

function selectPrivateChat(targetUser) {
    currentRoom = targetUser;
    document.getElementById('general-btn').classList.remove('active-chat');
    document.getElementById('chat-header').innerHTML = `<i class="fa-solid fa-user-lock" style="color: #22c55e;"></i> ${targetUser} ile Özel Sohbet`;
    socket.emit('load private history', { user1: myUsername, user2: targetUser });
    socket.emit('user join', { username: myUsername, room: currentRoom }); 
}

socket.on('message deleted', function(msgId) {
    const element = document.getElementById(`msg-${msgId}`);
    if(element) element.remove();
});

function sendMessage() {
    const input = document.getElementById('message-input');
    const txt = input.value.trim();
    if(txt === "") return;

    const messagePayload = { username: myUsername, text: txt, room: currentRoom };
    if (currentRoom !== 'general') {
        messagePayload.sender = myUsername;
        messagePayload.receiver = currentRoom;
    }

    socket.emit('chat message', messagePayload);
    input.value = "";
    input.focus();
}

function deleteMessage(msgId) {
    if(confirm("Bu mesajı herkestan silmek istediğinize emin misiniz?")) {
        socket.emit('delete message', msgId);
    }
}

function checkEnter(e) { if(e.key === 'Enter') sendMessage(); }
function logout() { localStorage.clear(); window.location.href = '/'; }
