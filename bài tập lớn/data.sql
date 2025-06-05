
create database pktn;
use pktn;

CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,  -- Lưu password đã mã hóa
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm tài khoản bác sĩ mẫu (password: 'bacsi123')
INSERT INTO doctors (username, password, full_name) 
VALUES ('drjohn', '123456', 'John Smith');

CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    note VARCHAR(255)
);
CREATE TABLE medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    date DATE NOT NULL,
    diagnosis VARCHAR(255),
    prescription TEXT,
    note TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE bs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    working_hours VARCHAR(100) -- Ví dụ: "08:00-17:00"
);
CREATE TABLE appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_name VARCHAR(100),
    phone VARCHAR(20),
    date DATE,
    time TIME,
    note TEXT,
    created_at DATETIME
);


