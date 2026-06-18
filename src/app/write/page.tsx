import {
  ApplicationWriter,
  type WriterFirm,
} from "@/components/application-writer";
import { PageHeader } from "@/components/ui";
import { hasAnthropic } from "@/lib/config";
import { listTargets } from "@/lib/tracker";

export const dynamic = "force-dynamic";

export default function WritePage() {
  const firms: WriterFirm[] = listTargets().map((t) => ({
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
        title="Application Writer"
        subtitle="Paste a job description and get a bold, human, honest cover letter or application answer — produced by a multi-pass draft → judge → synthesize → polish pipeline grounded only in your verified profile and the firm’s facts."
      />
      <ApplicationWriter firms={firms} aiEnabled={hasAnthropic()} />
    </div>
  );
}
