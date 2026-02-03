import { readFile } from "node:fs/promises";
import * as yaml from "js-yaml";
import { DataSource } from "typeorm";
import { Workflow } from "../models/Workflow";
import { Task } from "../models/Task";
import { TaskStatus } from "../workers/TaskStatus";
import { WorkflowStatus } from "./WorkflowStatus";
import { WorkflowDefinition } from "./WorkflowDefinition";
import { WorkflowStep } from "./WorkflowStep";

export class WorkflowFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Creates a workflow by reading a YAML file and constructing the Workflow and Task entities.
   * @param filePath - Path to the YAML file.
   * @param clientId - Client identifier for the workflow.
   * @param geoJson - The geoJson data string for tasks (customize as needed).
   * @returns A promise that resolves to the created Workflow.
   */
  async createWorkflowFromYAML(
    filePath: string,
    clientId: string,
    geoJson: string,
  ): Promise<Workflow> {
    //file reading operation must be async
    const fileContent = await readFile(filePath, "utf8");
    const workflowDef = yaml.load(fileContent) as WorkflowDefinition;
    this.checkForCircularDependencies(workflowDef.steps);
    const workflowRepository = this.dataSource.getRepository(Workflow);
    const taskRepository = this.dataSource.getRepository(Task);
    const workflow = new Workflow();

    workflow.clientId = clientId;
    workflow.status = WorkflowStatus.Initial;

    const savedWorkflow = await workflowRepository.save(workflow);

    const aliasMap = new Map<string, string>();
    workflowDef.steps.forEach((s: WorkflowStep) => {
      const stepNumber = String(s.stepNumber).padStart(3, "0"); // 001, 002, 003
      const shortHash = crypto.randomUUID().substring(0, 4);
      const compositeId = `${stepNumber}-${s.taskType}-${shortHash}`;
      aliasMap.set(s.taskType, compositeId);
    });

    const tasks: Task[] = workflowDef.steps.map((step) => {
      const task = new Task();
      task.taskId = aliasMap.get(step.taskType)!;
      task.clientId = clientId;
      task.geoJson = geoJson;
      task.status = TaskStatus.Queued;
      task.taskType = step.taskType;
      task.stepNumber = step.stepNumber;
      task.workflow = savedWorkflow;
      if (step.dependsOn) {
        task.dependsOnId = aliasMap.get(step.dependsOn);
      }
      return task;
    });

    tasks.sort((a, b) => {
      if (b.dependsOnId === a.taskId) return -1;
      if (a.dependsOnId === b.taskId) return 1;
      return a.stepNumber - b.stepNumber;
    });

    await taskRepository.save(tasks);

    return savedWorkflow;
  }

  /**
   * Validates that there are no circular dependencies in the workflow steps.
   * Uses taskType as the unique identifier for dependency resolution.
   */
  private checkForCircularDependencies(steps: WorkflowStep[]): void {
    // Create a lookup map for quick dependency retrieval
    const dependencyMap = new Map<string, string | undefined>(
      steps.map((s) => [s.taskType, s.dependsOn ?? undefined]),
    );

    for (const step of steps) {
      const path = new Set<string>();
      let currentTaskType: string | undefined = step.taskType;

      while (currentTaskType) {
        if (path.has(currentTaskType)) {
          const chain = Array.from(path).join(" -> ");
          throw new Error(
            `Circular dependency detected: ${chain} -> ${currentTaskType}`,
          );
        }

        path.add(currentTaskType);
        // Move to the task this task depends on
        currentTaskType = dependencyMap.get(currentTaskType);
      }
    }
  }
}
