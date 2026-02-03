import { WorkflowStep } from "./WorkflowStep";

export interface WorkflowDefinition {
  name: string;
  steps: WorkflowStep[];
}
