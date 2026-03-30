export { AuthProvider, useAuth } from "./useAuth.tsx";
        setProfile(null);
        setRole(null);
    };
    return (_jsx(AuthContext.Provider, { value: {
            user,
            session,
            profile,
            role,
            isLoading,
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
