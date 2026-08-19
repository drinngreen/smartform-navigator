import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [role, setRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRoleReady, setIsRoleReady] = useState(false);
    const ADMIN_TENANT_EMAILS = [
        "globalreco@zolisoftware.cloud",
        "globalreco@zolisoftware.space",
        "multyproget@zolidragon.cloud",
        "nijol@zolidragon.cloud",
        "admin@zoli.live",
        "direzioneglobalreco@zoli.live",
        "formulariglobalreco@zoli.live",
        "amministrazioneglobalreco@zoli.live",
        "amministrazioneglobal@zoli.live",
        "segreteriaglobalreco@zoli.live",
        "multyniyol@zoli.live",
        "superadmin@zoli.live",
        "superadminglobal@zoli.live"
    ];
    const markPresence = async (userId, status) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session)
                return;
            const { error } = await supabase
                .from("online_status")
                .upsert({
                user_id: userId,
                status,
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            if (error) {
                console.warn("[Auth] presence upsert failed, trying edge function:", error);
                await supabase.functions.invoke("update-presence", { body: { status } });
            }
        }
        catch (e) {
            console.warn("[Auth] markPresence failed:", e);
        }
    };
    // Nessuna chiamata di bootstrap può bloccare la UI: ogni step ha un timeout.
    const withTimeout = async (p, ms, label) => {
        return await Promise.race([
            p.catch((e) => {
                console.warn(`[Auth] ${label} failed:`, e);
                return null;
            }),
            new Promise((resolve) => setTimeout(() => {
                console.warn(`[Auth] ${label} timeout (${ms}ms)`);
                resolve(null);
            }, ms)),
        ]);
    };
    const fetchUserData = async (userId, userEmail) => {
        const email = userEmail?.toLowerCase() ?? "";
        const isAdminTenantEmail = ADMIN_TENANT_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === email);
        try {
            if (isAdminTenantEmail) {
                // non bloccante: se la RPC è lenta/bloccata la UI parte lo stesso
                await withTimeout(Promise.resolve(supabase.rpc("bootstrap_admin_role")), 4000, "bootstrap_admin_role");
            }
            const profileRes = await withTimeout(Promise.resolve(supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle()), 6000, "profiles fetch");
            setProfile(profileRes?.data ? profileRes.data : null);
            const roleRes = await withTimeout(Promise.resolve(supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle()), 6000, "user_roles fetch");
            if (roleRes?.data) {
                setRole(roleRes.data.role);
            }
            else if (isAdminTenantEmail) {
                setRole("admin");
            }
            else {
                setRole("user");
            }
            markPresence(userId, "online").catch(() => { });
        }
        catch (error) {
            console.error("Error fetching user data:", error);
            if (isAdminTenantEmail)
                setRole("admin");
        }
        finally {
            // In ogni caso la UI deve sbloccarsi.
            setIsRoleReady(true);
            setIsLoading(false);
        }
    };
    const refreshUserData = async () => {
        if (!user)
            return;
        await fetchUserData(user.id, user.email);
    };
    useEffect(() => {
        let initialLoad = true;
        let mounted = true;
        const forceUnlockTimer = window.setTimeout(() => {
            if (mounted) {
                console.warn("[Auth] bootstrap timeout, forcing UI unlock");
                setIsLoading(false);
                setIsRoleReady(true);
            }
        }, 7000);
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted)
                return;
            setSession(session);
            setUser(session?.user ?? null);
            if (!session?.user) {
                setProfile(null);
                setRole(null);
                setIsRoleReady(true);
                setIsLoading(false);
                return;
            }
            // For initial load, getSession handles it below
            if (!initialLoad) {
                // Un rinnovo silenzioso del token non deve smontare l'intera UI:
                // i formulari aperti contengono lavoro locale non ancora salvato.
                fetchUserData(session.user.id, session.user.email)
                    .catch((error) => {
                    console.error("[Auth] onAuthStateChange fetchUserData failed:", error);
                });
            }
        });
        supabase.auth.getSession()
            .then(async ({ data: { session } }) => {
            if (!mounted)
                return;
            setSession(session);
            setUser(session?.user ?? null);
            if (!session?.user)
                setIsRoleReady(true);
            if (session?.user) {
                try {
                    await fetchUserData(session.user.id, session.user.email);
                }
                catch (error) {
                    console.error("[Auth] initial fetchUserData failed:", error);
                }
            }
        })
            .catch((error) => {
            console.error("[Auth] getSession failed:", error);
        })
            .finally(() => {
            initialLoad = false;
            if (mounted)
                setIsLoading(false);
        });
        return () => {
            mounted = false;
            window.clearTimeout(forceUnlockTimer);
            subscription.unsubscribe();
        };
    }, []);
    const signUp = async (email, password, nome, cognome, codiceFiscale) => {
        try {
            const redirectUrl = `${window.location.origin}/`;
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectUrl,
                    data: {
                        nome,
                        cognome,
                        codice_fiscale: codiceFiscale
                    }
                }
            });
            if (error)
                throw error;
            if (data.user) {
                const { data: defaultTenant } = await supabase
                    .from("tenants")
                    .select("id")
                    .eq("is_default", true)
                    .single();
                await supabase.from("profiles").insert({
                    user_id: data.user.id,
                    nome,
                    cognome,
                    codice_fiscale: codiceFiscale,
                    tenant_id: defaultTenant?.id || null
                });
                await supabase.from("user_roles").insert({
                    user_id: data.user.id,
                    role: "user"
                });
            }
            return { error: null };
        }
        catch (error) {
            return { error: error };
        }
    };
    const signIn = async (email, password) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error)
                throw error;
            return { error: null };
        }
        catch (error) {
            return { error: error };
        }
    };
    const signOut = async () => {
        if (user)
            await markPresence(user.id, "offline");
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setIsRoleReady(true);
    };
    return (_jsx(AuthContext.Provider, { value: {
            user,
            session,
            profile,
            role,
            isLoading,
            isRoleReady,
            isAdmin: role === "admin",
            refreshUserData,
            signUp,
            signIn,
            signOut,
        }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
