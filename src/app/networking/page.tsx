import {
  NetworkingBoard,
  type FirmOption,
  type NetContact,
} from "@/components/networking-board";
import { PageHeader } from "@/components/ui";
import { hasAnthropic } from "@/lib/config";
import { listContactsWithFirm, listFirmsForPicker } from "@/lib/tracker";

export const dynamic = "force-dynamic";

export default function NetworkingPage() {
  const contacts: NetContact[] = listContactsWithFirm().map((c) => ({
    id: c.contact.id,
    targetId: c.contact.targetId,
    name: c.contact.name,
    title: c.contact.title,
    company: c.contact.company,
    email: c.contact.email,
    linkedin: c.contact.linkedin,
    relationship: c.contact.relationship,
    outreachStage: c.contact.outreachStage,
    lastContactedAt: c.contact.lastContactedAt,
    nextFollowUpAt: c.contact.nextFollowUpAt,
    notes: c.contact.notes,
    firmCompany: c.firmCompany,
    firmTrack: c.firmTrack,
  }));
  const firms: FirmOption[] = listFirmsForPicker();

  return (
    <div>
      <PageHeader
        title="Networking"
        subtitle="Referrals are the #2 lever after timing — a warm intro gets your application actually read. Track contacts per firm and draft genuine outreach."
      />
      <NetworkingBoard
        contacts={contacts}
        firms={firms}
        aiEnabled={hasAnthropic()}
      />
    </div>
  );
}
