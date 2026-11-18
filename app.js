
const loginForm = document.getElementById("loginForm");
const employeeCodeInput = document.getElementById("employee_code");
const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("loginButton");
const togglePassword = document.getElementById("togglePassword");

const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

function clearMessages() {
    errorMessage.style.display = "none";
    successMessage.style.display = "none";

    errorMessage.textContent = "";
    successMessage.textContent = "";
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = "block";
}

// แสดง / ซ่อนรหัสผ่าน
togglePassword.addEventListener("click", function () {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.textContent = "ซ่อน";
    } else {
        passwordInput.type = "password";
        togglePassword.textContent = "แสดง";
    }
});

// ตรวจสอบ Session เดิม
async function checkExistingSession() {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        window.location.replace("dashboard.html");
    }
}

checkExistingSession();

// Login
loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearMessages();

    const employeeCode = employeeCodeInput.value.trim().toUpperCase();
    const password = passwordInput.value;

    if (!employeeCode || !password) {
        showError("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "กำลังเข้าสู่ระบบ...";

    try {
        const { data, error } =
            await supabaseClient.functions.invoke(
                "employee-login",
                {
                    body: {
                        employee_code: employeeCode,
                        password: password
                    }
                }
            );

        if (error) {
            throw error;
        }

        if (!data || data.success !== true || !data.session) {
            throw new Error("Login failed");
        }

        const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.setSession(data.session);

        if (sessionError || !sessionData.session) {
            throw sessionError || new Error("Session error");
        }

        showSuccess("เข้าสู่ระบบสำเร็จ");

        loginButton.textContent = "กำลังเข้าสู่ระบบ...";

        window.location.replace("dashboard.html");

    } catch (error) {
        console.error("Login Error:", error);

        showError("รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง");

        loginButton.disabled = false;
        loginButton.textContent = "เข้าสู่ระบบ";
    }
});
