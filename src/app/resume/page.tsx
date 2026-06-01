import { ResumeBuilder } from "@/components/resume-builder";
import { PageHeader } from "@/components/ui";
import { hasAnthropic } from "@/lib/config";
import { getExperienceMeta, getProjectMeta } from "@/lib/resume/data";

import { buildResumeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const projects = getProjectMeta();
  const experiences = getExperienceMeta();
  const initial = await buildResumeAction({ track: "pm" });
  const aiEnabled = hasAnthropic();

  return (
    <div>
      <PageHeader
        title="Résumé Builder"
        subtitle="Generate a track-tailored, Overleaf-ready LaTeX résumé from your verified content bank. Paste a job description to surface the most relevant true projects and skills."
      />
      <ResumeBuilder
        projects={projects}
        experiences={experiences}
        initial={initial}
        aiEnabled={aiEnabled}
      />
    </div>
  );
}
