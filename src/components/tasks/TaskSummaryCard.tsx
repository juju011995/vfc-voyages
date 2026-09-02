import type { TaskCounts } from "../../lib/taskCalc";
import "./TaskSummaryCard.css";

export function TaskSummaryCard({ counts }: { counts: TaskCounts }) {
  const total = counts.aFaire + counts.enCours + counts.fait;

  return (
    <div className="task-summary">
      {total === 0 ? (
        <p className="task-summary__line">Aucune tâche pour l'instant</p>
      ) : (
        <>
          <p className="task-summary__line">
            <strong>{counts.enCours}</strong> en cours · <strong>{counts.aFaire}</strong> à
            faire
          </p>
          <p
            className={
              "task-summary__sub" + (counts.enRetard > 0 ? " task-summary__sub--alert" : "")
            }
          >
            {counts.enRetard > 0
              ? `${counts.enRetard} tâche${counts.enRetard > 1 ? "s" : ""} en retard`
              : `${counts.fait} terminée${counts.fait > 1 ? "s" : ""}`}
          </p>
        </>
      )}
    </div>
  );
}
