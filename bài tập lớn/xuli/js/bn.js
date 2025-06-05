document.addEventListener('DOMContentLoaded', loadPatients);

async function loadPatients() {
    const res = await fetch('http://localhost:5000/api/patients', { credentials: 'include' });
    const result = await res.json();
    const tbody = document.querySelector('#patientsTable tbody');
    tbody.innerHTML = result.data.map(p => `
        <tr data-id="${p.id}">
            <td class="name-cell">${p.name}</td>
            <td class="phone-cell">${p.phone}</td>
            <td class="note-cell">${p.note || ''}</td>
            <td>
                <button onclick="enableEdit(${p.id})">Sửa</button>
                <button onclick="deletePatient(${p.id})">Xóa</button>
                <button onclick="showRecords(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Hồ sơ khám</button>
            </td>
        </tr>
    `).join('');
}

window.enableEdit = function(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    const nameCell = row.querySelector('.name-cell');
    const phoneCell = row.querySelector('.phone-cell');
    const noteCell = row.querySelector('.note-cell');

    const name = nameCell.innerText;
    const phone = phoneCell.innerText;
    const note = noteCell.innerText;

    nameCell.innerHTML = `<input class="edit-name" data-id="${id}" value="${name}">`;
    phoneCell.innerHTML = `<input class="edit-phone" data-id="${id}" value="${phone}">`;
    noteCell.innerHTML = `<input class="edit-note" data-id="${id}" value="${note}">`;

    const actionCell = row.querySelector('td:last-child');
    actionCell.innerHTML = `
        <button onclick="updatePatient(${id})">Lưu</button>
        <button onclick="loadPatients()">Hủy</button>
    `;
}

window.updatePatient = async function(id) {
    const name = document.querySelector(`.edit-name[data-id="${id}"]`).value;
    const phone = document.querySelector(`.edit-phone[data-id="${id}"]`).value;
    const note = document.querySelector(`.edit-note[data-id="${id}"]`).value;

    await fetch(`http://localhost:5000/api/patient/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, phone, note })
    });

    loadPatients();
}

window.deletePatient = async function(id) {
    if (confirm('Bạn có chắc muốn xóa?')) {
        await fetch(`http://localhost:5000/api/patient/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        loadPatients();
    }
}

document.getElementById('addPatientForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('newName').value.trim();
    const phone = document.getElementById('newPhone').value.trim();
    const note = document.getElementById('newNote').value.trim();

    if (!name || !phone) {
        alert('Vui lòng nhập đầy đủ họ tên và SĐT!');
        return;
    }

    await fetch('http://localhost:5000/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, phone, note })
    });

    this.reset();
    loadPatients();
});

// Hồ sơ khám bệnh & toa thuốc
window.showRecords = async function(patientId, patientName) {
    document.getElementById('recordsModal').style.display = 'block';
    document.getElementById('modalTitle').innerText = 'Hồ sơ khám bệnh: ' + patientName;
    loadRecords(patientId);

    document.getElementById('addRecordForm').onsubmit = async function(e) {
        e.preventDefault();
        await fetch(`http://localhost:5000/api/patient/${patientId}/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                date: document.getElementById('recordDate').value,
                diagnosis: document.getElementById('diagnosis').value,
                prescription: document.getElementById('prescription').value,
                note: document.getElementById('recordNote').value
            })
        });
        loadRecords(patientId);
        this.reset();
    }
}

window.loadRecords = async function(patientId) {
    const res = await fetch(`http://localhost:5000/api/patient/${patientId}/records`, { credentials: 'include' });
    const result = await res.json();
    document.getElementById('recordsList').innerHTML = result.data.map(r => `
        <div style="border-bottom:1px solid #eee; margin-bottom:10px;">
            <b>Ngày:</b> ${r.date} <br>
            <b>Chẩn đoán:</b> ${r.diagnosis} <br>
            <b>Toa thuốc:</b> ${r.prescription} <br>
            <b>Ghi chú:</b> ${r.note}
        </div>
    `).join('');
}

window.closeRecordsModal = function() {
    document.getElementById('recordsModal').style.display = 'none';
}


async function exportPatientsPDF() {
    const res = await fetch('http://localhost:5000/api/patients', { credentials: 'include' });
    const result = await res.json();

    if (!result.success) {
        alert('Không thể lấy dữ liệu bệnh nhân!');
        return;
    }

    const data = result.data;

    const content = [
        { text: 'BÁO CÁO DANH SÁCH BỆNH NHÂN', style: 'header', alignment: 'center' },
        '\n'
    ];

    for (let i = 0; i < data.length; i++) {
        const p = data[i];
        content.push({ text: `STT: ${i + 1}`, bold: true });
        content.push(`Họ tên: ${p.name}`);
        content.push(`SĐT: ${p.phone}`);
        content.push(`Ghi chú: ${p.note || 'Không có'}`);

        let records = [];
        try {
            const recRes = await fetch(`http://localhost:5000/api/patient/${p.id}/records`, { credentials: 'include' });
            const recResult = await recRes.json();
            if (recResult.success) records = recResult.data;
        } catch (e) {}

        if (records.length > 0) {
            content.push({ text: 'Hồ sơ khám:', bold: true });
            const rows = [['Ngày', 'Chẩn đoán', 'Toa thuốc', 'Ghi chú']];
            for (const r of records) {
                rows.push([
                    new Date(r.date).toLocaleDateString(),
                    r.diagnosis,
                    r.prescription || '',
                    r.note || ''
                ]);
            }
            content.push({
                table: {
                    widths: ['20%', '*', '*', '*'],
                    body: rows
                },
                margin: [0, 0, 0, 10]
            });
        } else {
            content.push('Hồ sơ khám: Không có\n');
        }

        content.push('\n');
    }

    const docDefinition = {
        content: content,
        defaultStyle: {
            font: 'Roboto'
        },
        styles: {
            header: {
                fontSize: 16,
                bold: true
            }
        }
    };

    pdfMake.createPdf(docDefinition).download('bao_cao_benh_nhan.pdf');
}
