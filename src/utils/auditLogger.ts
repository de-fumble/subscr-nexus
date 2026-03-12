import { supabase } from "@/integrations/supabase/client";

export const logAuditEvent = async (
    action: string,
    entityType: string,
    entityId: string,
    moduleName: string,
    details: Record<string, any> = {},
    roleContext: string = "Owner"
) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("audit_logs").insert({
            actor_id: user.id,
            action,
            entity_type: entityType,
            entity_id: entityId,
            details: { ...details, role: roleContext },
            module: moduleName,
        });

        if (error) {
            console.error("🟢 Audit log insert failed:", error);
        } else {
            console.log("🟢 Audit log inserted successfully:", { action, entityType, entityId, moduleName });
        }
    } catch (err) {
        console.error("🟢 Audit logging exception:", err);
    }
};
