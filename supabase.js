
const SUPABASE_URL = "https://yymdcdddrekxygxqjxbe.supabase.co";

const SUPABASE_KEY = "sb_publishable_FQotHCYHarrXvvorG40xWA_5caaN4mT";

const { createClient } = supabase;

const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
// ดึง Access Token ของผู้ใช้ที่ล็อกอินอยู่
async function getAccessToken() {
    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    return data.session?.access_token || null;
}