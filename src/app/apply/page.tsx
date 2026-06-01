import { ApplyAssistant, type ApplyFirm } from "@/components/apply-assistant";
import { PageHeader } from "@/components/ui";
import { hasAnthropic } from "@/lib/config";
import { listTargets } from "@/lib/tracker";

export const dynamic = "force-dynamic";

export default function ApplyPage() {
  const firms: ApplyFirm[] = listTargets().map((t) => ({
    id: t.id,
    company: t.company,
    role: t.role,
    track: t.track,
    location: t.location,
    hasNotes: Boolean(t.notes && t.notes.trim()),
  }));

  return (
    <div>
      <PageHeader
        title="Application Assistant"
        subtitle="Draft a “why this firm”, “why this role”, short-answer, or cover-letter response — grounded only in your verified profile and the firm’s tracker notes. Honest by construction, shown for you to edit and make your own."
      />
      <ApplyAssistant firms={firms} aiEnabled={hasAnthropic()} />
    </div>
  );
}
