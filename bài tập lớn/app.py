from flask import Flask, request, jsonify, session
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import timedelta
import bcrypt

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Thay bằng secret key mạnh
app.config.update(
    SESSION_COOKIE_SAMESITE='None',
    SESSION_COOKIE_SECURE=True
)

# Cấu hình CORS
CORS(app,
     supports_credentials=True,
     origins=["http://127.0.0.1:5500", "http://localhost:5500"])

# Cấu hình kết nối MySQL
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'database': 'pktn'
}

def get_db_connection():
    try:
        return mysql.connector.connect(**db_config)
    except Error as e:
        print("Lỗi kết nối MySQL:", e)
        return None

# Đặt lịch hẹn
@app.route('/api/book_appointment', methods=['POST'])
def book_appointment():
    conn = None
    try:
        data = request.get_json()
        required_fields = ['patient_name', 'phone', 'date', 'time']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': 'Thiếu thông tin bắt buộc'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Lỗi kết nối database'}), 500

        cursor = conn.cursor()
        sql = """
        INSERT INTO appointments (patient_name, phone, date, time, note)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (
            data['patient_name'],
            data['phone'],
            data['date'],
            data['time'],
            data.get('note', '')
        ))
        conn.commit()

        return jsonify({
            'success': True,
            'message': 'Đặt lịch thành công!'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Lỗi server: {str(e)}'
        }), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

# Đăng nhập bác sĩ
@app.route('/api/doctor/login', methods=['POST'])
def doctor_login():
    conn = None
    cursor = None
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Không nhận được dữ liệu JSON'}), 400

        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'success': False, 'message': 'Thiếu username hoặc password'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Lỗi kết nối cơ sở dữ liệu'}), 500

        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM doctors WHERE username = %s", (username,))
        doctor = cursor.fetchone()

        if not doctor:
            return jsonify({'success': False, 'message': 'Sai tên đăng nhập hoặc mật khẩu'}), 401

        stored_password = doctor.get('password')
        password_matched = False
        try:
            if stored_password and stored_password.startswith('$2b$'):
                password_matched = bcrypt.checkpw(
                    password.encode('utf-8'),
                    stored_password.encode('utf-8')
                )
            else:
                password_matched = (password == stored_password)
        except Exception as e:
            print("Lỗi khi so sánh mật khẩu:", str(e))

        if password_matched:
            session['doctor_id'] = doctor['id']
            session['doctor_name'] = doctor['full_name']
            return jsonify({
                'success': True,
                'message': 'Đăng nhập thành công',
                'doctor': {
                    'id': doctor['id'],
                    'name': doctor['full_name']
                }
            })

        return jsonify({'success': False, 'message': 'Sai tên đăng nhập hoặc mật khẩu'}), 401

    except Exception as e:
        print("Lỗi server khi login:", str(e))
        return jsonify({'success': False, 'message': 'Lỗi server'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

# Lấy danh sách lịch hẹn
@app.route('/api/appointments')
def get_appointments():
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Lỗi kết nối database'}), 500

    cursor = conn.cursor()
    cursor.execute("SELECT id, patient_name, phone, date, time, note FROM appointments")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    data = []
    for row in rows:
        time_value = row[4]
        if isinstance(time_value, timedelta):
            time_str = str(time_value)
        else:
            time_str = time_value

        date_value = row[3]
        if hasattr(date_value, 'isoformat'):
            date_str = date_value.isoformat()
        else:
            date_str = str(date_value)

        data.append({
            'id': row[0],
            'patient_name': row[1],
            'phone': row[2],
            'date': date_str,
            'time': time_str,
            'note': row[5]
        })

    return jsonify({'success': True, 'data': data})

# Thêm/lấy danh sách bệnh nhân
@app.route('/api/patients', methods=['GET', 'POST'])
def patients():
    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        phone = data.get('phone')
        note = data.get('note', '')
        if not name or not phone:
            return jsonify({'success': False, 'message': 'Thiếu thông tin'}), 400
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO patients (name, phone, note) VALUES (%s, %s, %s)", (name, phone, note))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'message': 'Thêm bệnh nhân thành công'})
    else:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM patients")
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'data': data})

# Sửa bệnh nhân
@app.route('/api/patient/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    sql = "UPDATE patients SET name=%s, phone=%s, note=%s WHERE id=%s"
    cursor.execute(sql, (data['name'], data['phone'], data.get('note', ''), patient_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Cập nhật thành công'})

# Xóa bệnh nhân
@app.route('/api/patient/<int:patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM patients WHERE id=%s", (patient_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Xóa thành công'})

# Lấy danh sách hồ sơ khám bệnh của 1 bệnh nhân
@app.route('/api/patient/<int:patient_id>/records', methods=['GET'])
def get_medical_records(patient_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM medical_records WHERE patient_id=%s ORDER BY date DESC", (patient_id,))
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({'success': True, 'data': data})

# Thêm hồ sơ khám bệnh mới
@app.route('/api/patient/<int:patient_id>/records', methods=['POST'])
def add_medical_record(patient_id):
    data = request.get_json()
    date = data.get('date')
    diagnosis = data.get('diagnosis', '')
    prescription = data.get('prescription', '')
    note = data.get('note', '')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO medical_records (patient_id, date, diagnosis, prescription, note) VALUES (%s, %s, %s, %s, %s)",
        (patient_id, date, diagnosis, prescription, note)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Thêm hồ sơ khám bệnh thành công'})

# Sửa lịch hẹn
@app.route('/api/appointment/<int:appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    sql = "UPDATE appointments SET patient_name=%s, phone=%s, date=%s, time=%s, note=%s WHERE id=%s"
    cursor.execute(sql, (data['patient_name'], data['phone'], data['date'], data['time'], data.get('note', ''), appointment_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Cập nhật lịch hẹn thành công'})

# Xóa lịch hẹn
@app.route('/api/appointment/<int:appointment_id>', methods=['DELETE'])
def delete_appointment(appointment_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM appointments WHERE id=%s", (appointment_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Xóa lịch hẹn thành công'})




# Lấy danh sách bác sĩ
@app.route('/api/bs', methods=['GET'])
def get_doctors():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, full_name, phone, working_hours FROM bs")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({'success': True, 'data': data})

@app.route('/api/bs', methods=['POST'])
def add_doctor():
    data = request.get_json()
    full_name = data.get('full_name')
    phone = data.get('phone')
    working_hours = data.get('working_hours', '')
    if not full_name or not phone or not working_hours:
        return jsonify({'success': False, 'message': 'Thiếu thông tin'}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO bs (full_name, phone, working_hours) VALUES (%s, %s, %s)",
        (full_name, phone, working_hours)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Thêm bác sĩ thành công'})

@app.route('/api/bs/<int:doctor_id>', methods=['PUT'])
def update_doctor(doctor_id):
    data = request.get_json()
    full_name = data.get('full_name')
    phone = data.get('phone')
    working_hours = data.get('working_hours', '')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE bs SET full_name=%s, phone=%s, working_hours=%s WHERE id=%s",
        (full_name, phone, working_hours, doctor_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Cập nhật thành công'})

@app.route('/api/bs/<int:doctor_id>', methods=['DELETE'])
def delete_doctor(doctor_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bs WHERE id=%s", (doctor_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True, 'message': 'Xóa thành công'})
# Đăng xuất
@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Đăng xuất thành công'})

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='127.0.0.1')
    