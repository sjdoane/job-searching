import {
  PrepBoard,
  type PrepAssessment,
  type PrepFirmOption,
  type PrepItemRow,
  type StudyTaskRow,
} from "@/components/prep-board";
import { PageHeader } from "@/components/ui";
import { listTasksWithFirm } from "@/lib/planner";
import {
  listAssessmentsWithFirm,
  listFirmsForPicker,
  listPrepItems,
} from "@/lib/tracker";

export const dynamic = "force-dynamic";

export default function PrepPage() {
  const assessments: PrepAssessment[] = listAssessmentsWithFirm().map((a) => ({
    id: a.assessment.id,
    targetId: a.assessment.targetId,
    type: a.assessment.type,
    title: a.assessment.title,
    dueAt: a.assessment.dueAt,
    status: a.assessment.status,
    notes: a.assessment.notes,
    firmCompany: a.firmCompany,
    firmTrack: a.firmTrack,
  }));

  const prepItems: PrepItemRow[] = listPrepItems().map((p) => ({
    id: p.id,
    category: p.category,
    topic: p.topic,
    status: p.status,
    resourceUrl: p.resourceUrl,
    notes: p.notes,
    lastReviewedAt: p.lastReviewedAt,
  }));

  // Upcoming study/prep sessions live in the shared tasks table (managed on Plan).
  const studyTasks: StudyTaskRow[] = listTasksWithFirm()
    .filter(
      (t) =>
        (t.task.kind === "study" || t.task.kind === "prep") &&
        t.task.status !== "done",
    )
    .sort((a, b) => (a.task.dueAt ?? "9999").localeCompare(b.task.dueAt ?? "9999"))
    .slice(0, 8)
    .map((t) => ({
      id: t.task.id,
      title: t.task.title,
      firmCompany: t.firmCompany,
      dueAt: t.task.dueAt,
    }));

  const firms: PrepFirmOption[] = listFirmsForPicker();

  return (
    <div>
      <PageHeader
        title="Interview Prep"
        subtitle="Track every OA, case, and interview so nothing expires (quant OA windows are short), and keep a per-track readiness checklist for quant, consulting, PM, and behavioral prep."
      />
      <PrepBoard
        assessments={assessments}
        prepItems={prepItems}
        studyTasks={studyTasks}
        firms={firms}
      />
    </div>
  );
}
