export interface WorkflowStep {
  taskType: string;
  stepNumber: number;
  dependsOn?: string | null;
}
