document.addEventListener('DOMContentLoaded', loadDoctors);

async function loadDoctors() {
    try {
        const res = await fetch('http://localhost:5000/api/bs', { credentials: 'include' });
        const result = await res.json();
        const tbody = document.querySelector('#doctorsTable tbody');
        tbody.innerHTML = result.data.map(d => `
            <tr data-id="${d.id}">
                <td class="fullname-cell">${d.full_name}</td>
                <td class="phone-cell">${d.phone || ''}</td>
                <td class="working-cell">${d.working_hours || ''}</td>
                <td>
                    <button onclick="enableEditDoctor(${d.id})">Sửa</button>
                    <button onclick="deleteDoctor(${d.id})">Xóa</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Lỗi tải danh sách bác sĩ:', error);
    }
}

document.getElementById('addDoctorForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const full_name = document.getElementById('newFullName').value.trim();
    const phone = document.getElementById('newPhone').value.trim();
    const working_hours = document.getElementById('newWorkingHours').value.trim();
    await fetch('http://localhost:5000/api/bs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ full_name, phone, working_hours })
    });
    this.reset();
    loadDoctors();
});

window.enableEditDoctor = function(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    const fullname = row.querySelector('.fullname-cell').innerText;
    const phone = row.querySelector('.phone-cell').innerText;
    const working = row.querySelector('.working-cell').innerText;

    row.querySelector('.fullname-cell').innerHTML = `<input class="edit-fullname" value="${fullname}">`;
    row.querySelector('.phone-cell').innerHTML = `<input class="edit-phone" value="${phone}">`;
    row.querySelector('.working-cell').innerHTML = `<input class="edit-working" value="${working}">`;
    row.querySelector('td:last-child').innerHTML = `
        <button onclick="updateDoctor(${id})">Lưu</button>
        <button onclick="loadDoctors()">Hủy</button>
    `;
};

window.updateDoctor = async function(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    const full_name = row.querySelector('.edit-fullname').value;
    const phone = row.querySelector('.edit-phone').value;
    const working_hours = row.querySelector('.edit-working').value;
    await fetch(`http://localhost:5000/api/bs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ full_name, phone, working_hours })
    });
    loadDoctors();
}

window.deleteDoctor = async function(id) {
    if (confirm('Bạn có chắc muốn xóa bác sĩ này?')) {
        await fetch(`http://localhost:5000/api/bs/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        loadDoctors();
    }
}