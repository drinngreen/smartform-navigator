import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
const ADMIN_EMAILS = {
    multyproget: "multyproget@zolidragon.cloud",
    niyol: "niyol@zolidragon.cloud",
};
/**
 * Returns the admin user_id for the given MN context (multyproget or niyol).
 * Falls back to the MultyNiyol consolidated admin (multyniyol@zoli.live).
 */
export function useMNAdminId(context) {
    const [adminId, setAdminId] = useState(null);
    useEffect(() => {
        async function fetchAdmin() {
            const email = ADMIN_EMAILS[context];
            if (!email)
                return;
            // Try context-specific admin first
            const { data, error } = await supabase
                .from("profiles")
                .select("user_id")
                .eq("codice_fiscale", email) // profiles don't store email directly
                .maybeSingle();
            if (data?.user_id) {
                setAdminId(data.user_id);
                return;
            }
            // Fallback: look up via auth metadata by searching profiles with mn_context
            // The admin accounts use email-based login, so we search by tenant admin pattern
            // The consolidated admin is multyniyol@zoli.live
            const { data: fallback } = await supabase.rpc("get_admin_user_id");
            if (fallback)
                setAdminId(fallback);
        }
        fetchAdmin();
    }, [context]);
    return adminId;
}
