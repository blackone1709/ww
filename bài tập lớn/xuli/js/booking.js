document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("bookingForm");
  const messageDiv = document.getElementById("message");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Lấy dữ liệu từ form
    const data = {
      patient_name: form.patient_name.value.trim(),
      phone: form.phone.value.trim(),
      date: form.date.value,
      time: form.time.value,
      note: form.note.value.trim()
    };

    // Hiển thị trạng thái "Đang xử lý..."
    messageDiv.textContent = "Đang gửi dữ liệu...";
    messageDiv.style.color = "blue";

    try {
      // Gửi request đến backend Flask
      const response = await fetch("http://localhost:5000/api/book_appointment", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      // Hiển thị thông báo từ backend
      messageDiv.textContent = result.message;
      messageDiv.style.color = result.success ? "green" : "red";

      // Reset form nếu thành công
      if (result.success) {
        form.reset();
      }
    } catch (error) {
      // Xử lý lỗi kết nối
      messageDiv.textContent = "Lỗi kết nối đến server!";
      messageDiv.style.color = "red";
      console.error("Lỗi:", error);
    }
  });
});