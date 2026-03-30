export const Constants = {
    public: {
        Enums: {
            app_role: ["admin", "user"],
            call_status: ["ringing", "answered", "ended", "missed", "ai_fallback"],
            call_type: ["audio", "video"],
            fir_stato: [
                "DRAFT",
                "READY_TO_SEND",
                "ACTIVE",
                "IN_TRANSIT",
                "DELIVERED_PENDING_ACCEPTANCE",
                "CLOSED",
                "SENT_TO_RENTRI_DATA",
            ],
            membership_role: ["owner", "admin", "operator", "viewer"],
            org_role_rentri: [
                "produttore",
                "trasportatore",
                "destinatario",
                "intermediario",
            ],
            presence_status: ["online", "offline", "busy", "away"],
            register_movement_type: ["CARICO", "SCARICO"],
            register_send_status: ["PENDING", "SENT"],
        },
    },
};
