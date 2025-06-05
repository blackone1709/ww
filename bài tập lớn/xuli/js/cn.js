document.addEventListener('DOMContentLoaded', async () => {
    await loadAppointments();

    // Xử lý logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('http://localhost:5000/api/doctor/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = 'login.html';
        });
    }
});

async function loadAppointments() {
    try {
        const response = await fetch('http://localhost:5000/api/appointments', {
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            // Hiển thị danh sách lịch hẹn trong bảng
            const tbody = document.querySelector('#appointmentsTable tbody');
            if (tbody) {
                tbody.innerHTML = result.data.map(app => `
                    <tr data-id="${app.id}">
                        <td>${app.patient_name}</td>
                        <td>${app.phone}</td>
                        <td>${app.date}</td>
                        <td>${formatTimeForInput(app.time)}</td>
                        <td>${app.note || '-'}</td>
                        <td>
                            <button onclick="enableEditAppointment(${app.id})">Sửa</button>
                            <button onclick="deleteAppointment(${app.id})">Xóa</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
    }
}

window.enableEditAppointment = function(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) {
        alert('Không tìm thấy dòng lịch hẹn!');
        return;
    }
    const cells = row.querySelectorAll('td');
    const [name, phone, date, time, note] = Array.from(cells).map(td => td.innerText);
    row.setAttribute('data-id', id);

    cells[0].innerHTML = `<input class="edit-name" value="${name}">`;
    cells[1].innerHTML = `<input class="edit-phone" value="${phone}">`;
    cells[2].innerHTML = `<input class="edit-date" type="date" value="${date}">`;
    cells[3].innerHTML = `<input class="edit-time" type="time" value="${formatTimeForInput(time)}">`;
    cells[4].innerHTML = `<input class="edit-note" value="${note}">`;
    cells[5].innerHTML = `
        <button onclick="updateAppointment(${id})">Lưu</button>
        <button onclick="loadAppointments()">Hủy</button>
    `;
};

window.updateAppointment = async function(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    const name = row.querySelector('.edit-name').value;
    const phone = row.querySelector('.edit-phone').value;
    const date = row.querySelector('.edit-date').value;
    const time = row.querySelector('.edit-time').value;
    const note = row.querySelector('.edit-note').value;

    await fetch(`http://localhost:5000/api/appointment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ patient_name: name, phone, date, time, note })
    });
    loadAppointments();
};

window.deleteAppointment = async function(id) {
    if (confirm('Bạn có chắc muốn xóa lịch hẹn này?')) {
        await fetch(`http://localhost:5000/api/appointment/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        loadAppointments();
    }
};

function formatTimeForInput(timeStr) {
    // Chấp nhận cả "H:mm:ss" hoặc "HH:mm:ss"
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
        return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0');
    }
    return timeStr;
}