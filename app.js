// 1. FIREBASE CONFIG (Kendi bilgilerinizi yapıştırın)
const firebaseConfig = {
    apiKey: "SİZİN_API_KEYİNİZ",
    authDomain: "SİZİN_AUTH_DOMAINİNİZ",
    databaseURL: "SİZİN_DATABASE_URLNİZ",
    projectId: "SİZİN_PROJECT_IDNİZ",
    storageBucket: "SİZİN_STORAGE_BUCKETINIZ",
    messagingSenderId: "SİZİN_SENDER_IDNİZ",
    appId: "SİZİN_APP_IDNİZ"
};
firebase.initializeApp(firebaseConfig);

// 2. SAYFA GEÇİŞLERİ (Garantili Yöntem)
document.addEventListener("click", function(e) {
    if (e.target && e.target.id === "to-register") {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    }
    if (e.target && e.target.id === "to-login") {
        e.preventDefault();
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    }
});

// 3. KAYIT OLMA BUTONU
document.addEventListener("click", function(e) {
    if (e.target && e.target.id === "btn-register") {
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;

        if (username === "" || password === "") { alert("Lütfen tüm alanları doldurun!"); return; }
        if (password.length < 6) { alert("Şifre en az 6 karakter olmalıdır!"); return; }

        const fakeEmail = username.toLowerCase() + "@netchat.com";

        firebase.auth().createUserWithEmailAndPassword(fakeEmail, password)
            .then(function(userCredential) {
                userCredential.user.updateProfile({ displayName: username }).then(function() {
                    window.location.href = "chat.html";
                });
            })
            .catch(function(error) { alert("Hata: " + error.message); });
    }
});

// 4. GİRİŞ YAPMA BUTONU
document.addEventListener("click", function(e) {
    if (e.target && e.target.id === "btn-login") {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (username === "" || password === "") { alert("Lütfen tüm alanları doldurun!"); return; }

        const fakeEmail = username.toLowerCase() + "@netchat.com";

        firebase.auth().signInWithEmailAndPassword(fakeEmail, password)
            .then(function() { window.location.href = "chat.html"; })
            .catch(function(error) { alert("Kullanıcı adı veya şifre hatalı!"); });
    }
});
