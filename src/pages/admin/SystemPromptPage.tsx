import { AdminLayout } from "@/components/layout/AdminLayout";
import { SystemPromptRequestForm } from "@/components/system-prompt/SystemPromptRequestForm";
import { SystemPromptAssistantChat } from "@/components/system-prompt/SystemPromptAssistantChat";

// Global Reco tenant
const GLOBAL_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";

export default function SystemPromptPage() {
  return (
    <AdminLayout title="System Prompt" subtitle="Configurazione AI Agent">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SystemPromptRequestForm
            tenantLabel="global"
            tenantId={GLOBAL_TENANT_ID}
            tenantName="Global Reco"
          />
        </div>
        <div>
          <SystemPromptAssistantChat />
        </div>
      </div>
    </AdminLayout>
  );
}
