import { Repository } from "typeorm";
import { Workflow } from "../models/Workflow";
import { TaskStatus } from "../workers/TaskStatus";

export class WorkflowService {
  constructor(private readonly workflowRepo: Repository<Workflow>) {}

  async getStatus(id: string) {
    const workflow = await this.workflowRepo.findOne({
      where: { workflowId: id },
      relations: ["tasks"],
    });

    if (!workflow) return null;

    const totalTasks = workflow.tasks.length;
    const completedTasks = workflow.tasks.filter(
      (t) => t.status === TaskStatus.Completed || t.status === TaskStatus.Failed,
    ).length;

    return {
      workflowId: workflow.workflowId,
      status: workflow.status,
      completedTasks,
      totalTasks,
    };
  }

  async getResults(id: string) {
    const workflow = await this.workflowRepo.findOne({
      where: { workflowId: id },
      select: { workflowId: true, status: true, finalResult: true },
    });

    if (!workflow) return { error: "NOT_FOUND" };
    if (workflow.status !== "completed") return { error: "NOT_COMPLETED", status: workflow.status };

    return {
      workflowId: workflow.workflowId,
      status: workflow.status,
      finalResult: workflow.finalResult ? JSON.parse(workflow.finalResult) : null,
    };
  }
}
