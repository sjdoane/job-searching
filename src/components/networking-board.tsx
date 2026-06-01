"use client";

import { useMemo, useState, useTransition } from "react";

import {
  deleteContactAction,
  draftOutreachAction,
  saveContactAction,
  setStageAction,
} from "@/app/networking/actions";
import { Badge, Card } from "@/components/ui";
import { formatDate, relativeDeadline, urgencyClass } from "@/lib/dates";
import {
  OUTREACH_KIND_OPTIONS,
  OUTREACH_STAGE_COLORS,
  OUTREACH_STAGE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  labelFor,
} from "@/lib/labels";

export interface NetContact {
  id: number;
  targetId: number | null;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  linkedin: string | null;
  relationship: string | null;
  outreachStage: string;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
  firmCompany: string | null;
  firmTrack: string | null;
}

export interface FirmOption {
  id: number;
  company: string;
  track: string;
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className={`my-8 w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-xl bg-white p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ContactForm({
  firms,
  contact,
  onDone,
}: {
  firms: FirmOption[];
  contact?: NetContact;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  async function handle(formData: FormData) {
    setPending(true);
    try {
      await saveContactAction(formData);
      onDone();
    } finally {
      setPending(false);
    }
  }
  const L = (s: string) => <span className="mb-1 block text-xs font-medium text-slate-600">{s}</span>;
  return (
    <form action={handle} className="space-y-3">
      {contact ? <input type="hidden" name="id" value={contact.id} /> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>{L("Name *")}<input name="name" required defaultValue={contact?.name ?? ""} className={inputCls} placeholder="Jane Doe" /></label>
        <label>{L("Firm")}
          <select name="targetId" defaultValue={contact?.targetId ?? ""} className={inputCls}>
            <option value="">— No firm / other —</option>
            {firms.map((f) => (
              <option key={f.id} value={f.id}>{f.company}</option>
            ))}
          </select>
        </label>
        <label>{L("Title")}<input name="title" defaultValue={contact?.title ?? ""} className={inputCls} placeholder="Quant Researcher" /></label>
        <label>{L("Relationship")}
          <select name="relationship" defaultValue={contact?.relationship ?? "alum"} className={inputCls}>
            {RELATIONSHIP_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </label>
        <label>{L("Email")}<input name="email" type="email" defaultValue={contact?.email ?? ""} className={inputCls} /></label>
        <label>{L("LinkedIn")}<input name="linkedin" defaultValue={contact?.linkedin ?? ""} className={inputCls} placeholder="linkedin.com/in/…" /></label>
        <label>{L("Stage")}
          <select name="outreachStage" defaultValue={contact?.outreachStage ?? "to_contact"} className={inputCls}>
            {OUTREACH_STAGE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </label>
        <label>{L("Next follow-up")}<input name="nextFollowUpAt" type="date" defaultValue={contact?.nextFollowUpAt ?? ""} className={inputCls} /></label>
        <label>{L("Last contacted")}<input name="lastContactedAt" type="date" defaultValue={contact?.lastContactedAt ?? ""} className={inputCls} /></label>
      </div>
      <label>{L("Notes")}<textarea name="notes" rows={2} defaultValue={contact?.notes ?? ""} className={inputCls} placeholder="How you know them, context, what to mention…" /></label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button type="submit" disabled={pending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{pending ? "Saving…" : "Save contact"}</button>
      </div>
    </form>
  );
}

function OutreachModal({
  contact,
  aiEnabled,
  onClose,
}: {
  contact: NetContact;
  aiEnabled: boolean;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<string>("cold_intro");
  const [extra, setExtra] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subject: string; message: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setPending(true);
    try {
      const d = await draftOutreachAction({
        contactId: contact.id,
        kind: kind as never,
        extra: extra || undefined,
      });
      setDraft(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to draft.");
    } finally {
      setPending(false);
    }
  }
  async function copy(text: string, which: string) {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <Modal title={`Draft outreach — ${contact.name}`} onClose={onClose} wide>
      {!aiEnabled ? (
        <p className="text-sm text-slate-600">Add ANTHROPIC_API_KEY to .env.local and restart to enable AI outreach drafting.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-600">
              <span className="mb-1 block font-medium">Type</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
                {OUTREACH_KIND_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </label>
            <button onClick={generate} disabled={pending} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">{pending ? "Drafting…" : draft ? "Regenerate" : "Generate"}</button>
          </div>
          <label className="block text-xs text-slate-600">
            <span className="mb-1 block font-medium">Optional context (anything to mention)</span>
            <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={2} className={inputCls} placeholder="e.g. we both did robotics; I'm applying to the NYC quant trader role" />
          </label>
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          {draft ? (
            <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Subject</span>
                <button onClick={() => copy(draft.subject, "subject")} className="text-xs text-indigo-600 hover:underline">{copied === "subject" ? "Copied!" : "Copy"}</button>
              </div>
              <div className="text-sm font-medium text-slate-900">{draft.subject}</div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-medium text-slate-500">Message</span>
                <button onClick={() => copy(draft.message, "message")} className="text-xs text-indigo-600 hover:underline">{copied === "message" ? "Copied!" : "Copy"}</button>
              </div>
              <textarea readOnly value={draft.message} rows={9} className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-800" />
              <p className="text-[11px] text-slate-400">Grounded in your real profile + this firm&apos;s notes. Always read it over and make it yours before sending.</p>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

function StageSelect({ contact }: { contact: NetContact }) {
  const [, start] = useTransition();
  return (
    <select
      defaultValue={contact.outreachStage}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("id", String(contact.id));
        fd.set("outreachStage", e.target.value);
        start(() => void setStageAction(fd));
      }}
      className={`rounded-full px-2 py-1 text-xs font-medium ${OUTREACH_STAGE_COLORS[contact.outreachStage] ?? OUTREACH_STAGE_COLORS.to_contact}`}
    >
      {OUTREACH_STAGE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

export function NetworkingBoard({
  contacts,
  firms,
  aiEnabled,
}: {
  contacts: NetContact[];
  firms: FirmOption[];
  aiEnabled: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<NetContact | null>(null);
  const [outreach, setOutreach] = useState<NetContact | null>(null);
  const [, start] = useTransition();

  const due = useMemo(
    () =>
      contacts
        .filter((c) => c.nextFollowUpAt)
        .sort((a, b) => (a.nextFollowUpAt ?? "").localeCompare(b.nextFollowUpAt ?? "")),
    [contacts],
  );

  const groups = useMemo(() => {
    const m = new Map<string, NetContact[]>();
    for (const c of contacts) {
      const key = c.firmCompany ?? c.company ?? "— Unlinked —";
      const list = m.get(key) ?? [];
      list.push(c);
      m.set(key, list);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [contacts]);

  function remove(id: number) {
    if (!confirm("Delete this contact?")) return;
    const fd = new FormData();
    fd.set("id", String(id));
    start(() => void deleteContactAction(fd));
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setAdding(true)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">+ Add contact</button>
        <span className="text-sm text-slate-500">{contacts.length} contact{contacts.length === 1 ? "" : "s"} across {groups.length} firm{groups.length === 1 ? "" : "s"}</span>
      </div>

      {due.length > 0 ? (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <div className="mb-2 text-sm font-semibold text-amber-900">Follow-ups</div>
          <ul className="space-y-1">
            {due.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <span className={`text-xs ${urgencyClass(c.nextFollowUpAt!)}`}>{relativeDeadline(c.nextFollowUpAt!)}</span>
                <span className="font-medium">{c.name}</span>
                <span className="text-slate-500">{c.firmCompany ?? c.company ?? ""}</span>
                <button onClick={() => setOutreach(c)} className="ml-auto text-xs text-indigo-600 hover:underline">Draft follow-up</button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-slate-700">No contacts yet</p>
          <p className="mt-1 text-sm text-slate-500">Add an alum, recruiter, or employee at a firm you&apos;re targeting. Referrals get your application read.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([firm, list]) => (
            <div key={firm}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">{firm} <span className="font-normal text-slate-400">· {list.length}</span></h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-100">
                  {list.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{c.name}</span>
                          {c.relationship ? <Badge className="bg-slate-100 text-slate-600">{labelFor(RELATIONSHIP_OPTIONS, c.relationship)}</Badge> : null}
                        </div>
                        <div className="text-xs text-slate-500">
                          {c.title ?? ""}
                          {c.email ? ` · ${c.email}` : ""}
                          {c.nextFollowUpAt ? ` · follow up ${formatDate(c.nextFollowUpAt)}` : ""}
                        </div>
                      </div>
                      <StageSelect contact={c} />
                      <button onClick={() => setOutreach(c)} className="rounded border border-violet-200 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50">Draft outreach</button>
                      <button onClick={() => setEditing(c)} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">Edit</button>
                      <button onClick={() => remove(c.id)} className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Delete</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <Modal title="Add contact" onClose={() => setAdding(false)} wide>
          <ContactForm firms={firms} onDone={() => setAdding(false)} />
        </Modal>
      ) : null}
      {editing ? (
        <Modal title="Edit contact" onClose={() => setEditing(null)} wide>
          <ContactForm firms={firms} contact={editing} onDone={() => setEditing(null)} />
        </Modal>
      ) : null}
      {outreach ? (
        <OutreachModal contact={outreach} aiEnabled={aiEnabled} onClose={() => setOutreach(null)} />
      ) : null}
    </div>
  );
}
