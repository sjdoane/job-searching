import {
  PlanBoard,
  type PlanGoal,
  type PlanSuggestion,
  type PlanTask,
} from "@/components/plan-board";
import { PageHeader } from "@/components/ui";
import {
  generateSuggestions,
  listGoalsWithProgress,
  listTasksWithFirm,
} from "@/lib/planner";
import { listFirmsForPicker } from "@/lib/tracker";

export const dynamic = "force-dynamic";

export default function PlanPage() {
  const tasks: PlanTask[] = listTasksWithFirm().map((t) => ({
    id: t.task.id,
    title: t.task.title,
    status: t.task.status,
    kind: t.task.kind,
    priority: t.task.priority,
    dueAt: t.task.dueAt,
    targetId: t.task.targetId,
    goalId: t.task.goalId,
    notes: t.task.notes,
    firmCompany: t.firmCompany,
  }));
  const goals: PlanGoal[] = listGoalsWithProgress().map((g) => ({
    id: g.goal.id,
    title: g.goal.title,
    horizon: g.goal.horizon,
    targetDate: g.goal.targetDate,
    status: g.goal.status,
    notes: g.goal.notes,
    total: g.total,
    done: g.done,
  }));
  const suggestions: PlanSuggestion[] = generateSuggestions();
  const firms = listFirmsForPicker();

  return (
    <div>
      <PageHeader
        title="Plan"
        subtitle="Your weekly action queue. Timing is the #1 lever — turn open firms and follow-ups into things you actually do this week."
      />
      <PlanBoard
        tasks={tasks}
        goals={goals}
        suggestions={suggestions}
        firms={firms}
      />
    </div>
  );
}
