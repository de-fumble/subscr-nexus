import { supabase } from "@/integrations/supabase/client";

export const logAuditEvent = async (
    action: "login" | "logout" | "create_invoice" | "create_plan" | string,
    entityType: "organization" | "user" | "invoice" | "plan" | string,
    entityId: string,
    moduleName: "auth" | "invoices" | "plans" | "organization" | string,
    details: Record<string, any> = {},
    roleContext: string = "User" // Expected to pass the user's role in the org
) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Attach the actor's role to the details
        const enhancedDetails = {
            ...details,
            role: roleContext
        };

        const { error } = await supabase.functions.invoke("log-audit-event", {
            body: {
                action,
                entity_type: entityType,
                entity_id: entityId,
                details: enhancedDetails,
                module_name: moduleName,
            },
        });

        if (error) {
            console.warn("Audit logging failed:", error);
        }
    } catch (error) {
        console.warn("Audit logging error:", error);
    }
};
