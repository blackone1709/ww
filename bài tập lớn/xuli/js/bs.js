document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginMessage = document.getElementById('loginMessage');
    loginMessage.textContent = '';

    try {
        const res = await fetch('http://localhost:5000/api/doctor/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        const result = await res.json();
        if (result.success) {
            window.location.href = 'dk.html'; // Chuyển sang trang điều khiển
        } else {
            loginMessage.textContent = result.message || 'Đăng nhập thất bại!';
        }
    } catch (err) {
        loginMessage.textContent = 'Không thể kết nối máy chủ!';
    }
});