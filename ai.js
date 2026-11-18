
// =====================================
// 1. ตั้งค่า Backend
// =====================================

const AI_API_URL = "http://127.0.0.1:5000";

const $ = (id) => document.getElementById(id);


// =====================================
// 2. แสดงสถานะ
// =====================================

function showMessage(message, type = "") {
    const element = $("message");

    element.textContent = message;
    element.className = "status";

    if (type) {
        element.classList.add(type);
    }
}


// =====================================
// 3. ตรวจสอบ Login และสิทธิ์ Manager
// =====================================

async function checkManagerPermission() {

    const { data: auth, error: authError } =
        await supabaseClient.auth.getUser();

    if (authError || !auth.user) {
        window.location.replace("index.html");
        return false;
    }

    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("full_name, role, is_active")
            .eq("auth_user_id", auth.user.id)
            .maybeSingle();

    if (profileError || !profile) {
        showMessage("ไม่พบข้อมูลโปรไฟล์ผู้ใช้งาน", "error");
        return false;
    }

    if (profile.is_active !== true) {
        await supabaseClient.auth.signOut();
        window.location.replace("index.html");
        return false;
    }

    if (profile.role !== "manager") {
        showMessage(
            "คุณไม่มีสิทธิ์เข้าถึงระบบวิเคราะห์ยอดขาย AI",
            "error"
        );

        $("userName").textContent = profile.full_name || "ผู้ใช้งาน";

        setTimeout(() => {
            window.location.replace("dashboard.html");
        }, 2000);

        return false;
    }

    $("userName").textContent =
        profile.full_name + " · ผู้จัดการ";

    $("sessionStatus").textContent = "ยืนยันตัวตนแล้ว";
    $("roleStatus").textContent = "Manager";
    $("roleStatus").style.color = "#15803d";

    return true;
}


// =====================================
// 4. แสดงข้อมูลการขาย
// =====================================

function renderSales(sales) {

    if (!sales || sales.length === 0) {
        $("salesTable").innerHTML =
            '<tr><td colspan="4" class="empty">ไม่พบข้อมูลการขาย</td></tr>';
        return;
    }

    $("salesTable").innerHTML = sales.map(sale => {

        const date = sale.created_at
            ? new Date(sale.created_at).toLocaleString("th-TH", {
                timeZone: "Asia/Bangkok"
            })
            : "-";

        return `
            <tr>
                <td>${escapeHTML(sale.receipt_number || sale.id || "-")}</td>
                <td>฿${Number(sale.total_amount || 0).toLocaleString("th-TH")}</td>
                <td>${escapeHTML(sale.status || "-")}</td>
                <td>${escapeHTML(date)}</td>
            </tr>
        `;

    }).join("");
}


// =====================================
// 5. แสดงข้อมูลสินค้า
// =====================================

function renderProducts(products) {

    if (!products || products.length === 0) {
        $("productsTable").innerHTML =
            '<tr><td colspan="3" class="empty">ไม่พบข้อมูลสินค้า</td></tr>';
        return;
    }

    $("productsTable").innerHTML = products.map(product => {

        return `
            <tr>
                <td>${escapeHTML(product.name || "-")}</td>
                <td>฿${Number(product.selling_price || 0).toLocaleString("th-TH")}</td>
                <td>${Number(product.stock_quantity || 0).toLocaleString("th-TH")}</td>
            </tr>
        `;

    }).join("");
}


// =====================================
// 6. ป้องกัน HTML Injection
// =====================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));

}


// =====================================
// 7. เรียกข้อมูลจาก Flask Backend
// =====================================

async function loadAIData() {

    const refreshButton = $("refreshButton");

    refreshButton.disabled = true;
    refreshButton.textContent = "กำลังโหลด...";

    showMessage("กำลังเชื่อมต่อ Flask และ Supabase...");

    try {

        // ตรวจสอบ Session อีกครั้ง
        const token = await getAccessToken();

        if (!token) {
            await supabaseClient.auth.signOut();
            window.location.replace("index.html");
            return;
        }

        // เรียก Flask
        const response = await fetch(
            `${AI_API_URL}/api/ai/data`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const result = await response.json();

        $("backendStatus").textContent =
            response.ok ? "Online" : "มีข้อผิดพลาด";

        if (response.status === 401) {
            showMessage(
                "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",
                "error"
            );

            await supabaseClient.auth.signOut();
            window.location.replace("index.html");
            return;
        }

        if (response.status === 403) {
            showMessage(
                result.message || "ไม่มีสิทธิ์เข้าถึงข้อมูล AI",
                "error"
            );
            return;
        }

        if (!response.ok || result.status !== "success") {
            throw new Error(
                result.message || "ไม่สามารถดึงข้อมูลได้"
            );
        }

        // ข้อมูลที่ได้รับจาก Backend
        const data = result.data;

        const sales = data.sales?.data || [];
        const items = data.sale_items?.data || [];
        const products = data.products?.data || [];

        // แสดงจำนวนตัวอย่าง
        $("salesCount").textContent = sales.length;
        $("itemsCount").textContent = items.length;
        $("productsCount").textContent = products.length;

        $("salesStatus").textContent =
            `${sales.length} รายการ`;

        $("itemsStatus").textContent =
            `${items.length} รายการ`;

        $("productsStatus").textContent =
            `${products.length} รายการ`;

        $("databaseStatus").textContent = "Connected";

        $("databaseStatus").style.color = "#15803d";
        $("backendStatus").style.color = "#15803d";

        // แสดงข้อมูล
        renderSales(sales);
        renderProducts(products);

        showMessage(
            "เชื่อมต่อสำเร็จ และดึงข้อมูลจาก Supabase ได้แล้ว",
            "success"
        );

    } catch (error) {

        console.error("AI Data Error:", error);

        $("backendStatus").textContent = "Error";

        showMessage(
            "เกิดข้อผิดพลาด: " + error.message,
            "error"
        );

    } finally {

        refreshButton.disabled = false;
        refreshButton.textContent = "รีเฟรชข้อมูล";

    }
}


// =====================================
// 8. ออกจากระบบ
// =====================================

$("logoutButton").addEventListener("click", async function () {

    this.disabled = true;

    await supabaseClient.auth.signOut();

    window.location.replace("index.html");

});


// =====================================
// 9. เริ่มต้นระบบ
// =====================================

async function initAI() {

    try {

        const permitted = await checkManagerPermission();

        if (!permitted) {
            $("refreshButton").disabled = true;
            return;
        }

        $("refreshButton").disabled = false;

        await loadAIData();

    } catch (error) {

        console.error("AI Initialization Error:", error);

        showMessage(
            "ไม่สามารถเริ่มต้นหน้า AI ได้: " + error.message,
            "error"
        );

    }

}

$("refreshButton").addEventListener("click", loadAIData);

initAI();
