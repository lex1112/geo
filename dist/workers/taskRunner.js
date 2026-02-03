"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatus = exports.TaskRunner = void 0;
const Task_1 = require("../models/Task");
Object.defineProperty(exports, "TaskStatus", { enumerable: true, get: function () { return Task_1.TaskStatus; } });
const JobFactory_1 = require("../jobs/JobFactory");
const Workflow_1 = require("../models/Workflow");
const Result_1 = require("../models/Result");
const WorkflowStatus_1 = require("../workflows/WorkflowStatus");
class TaskRunner {
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }
    async run(task) {
        const workflowId = task.workflow.workflowId;
        try {
            // Initial State Update
            task.status = Task_1.TaskStatus.InProgress;
            task.progress = "Starting job...";
            await this.taskRepository.save(task);
            // Resolve Dependencies
            if (task.dependsOnId) {
                const dependency = await this.taskRepository.findOne({
                    where: { taskId: task.dependsOnId },
                    select: { status: true, output: true },
                });
                if (dependency?.status === Task_1.TaskStatus.Completed && dependency.output) {
                    task.input = dependency.output;
                }
            }
            const job = (0, JobFactory_1.getJobForTaskType)(task.taskType);
            try {
                // Execute the actual work
                await job.run(task);
                // Atomic Transaction: Save result and update task status
                await this.taskRepository.manager.transaction(async (tm) => {
                    const result = await tm.save(Result_1.Result, {
                        taskId: task.taskId,
                        data: JSON.stringify(task.output),
                    });
                    task.resultId = result.resultId;
                    task.status = Task_1.TaskStatus.Completed;
                    task.progress = null;
                    await tm.save(task);
                });
            }
            catch (error) {
                // Handle failure: Update task status before re-throwing
                task.status = Task_1.TaskStatus.Failed;
                task.progress = error instanceof Error ? error.message : String(error);
                await this.taskRepository.save(task);
                throw error;
            }
        }
        finally {
            // Guaranteed Workflow Sync
            // Runs on both success and failure to ensure workflow status matches task states
            await this.syncWorkflowStatus(workflowId);
        }
    }
    async syncWorkflowStatus(workflowId) {
        await this.taskRepository.manager.transaction(async (tm) => {
            const workflow = await tm.findOne(Workflow_1.Workflow, {
                where: { workflowId },
                relations: ["tasks"],
            });
            if (!workflow)
                return;
            const { tasks } = workflow;
            const anyFailed = tasks.some((t) => t.status === Task_1.TaskStatus.Failed);
            const allCompleted = tasks.every((t) => t.status === Task_1.TaskStatus.Completed);
            const allFinished = tasks.every((t) => [Task_1.TaskStatus.Completed, Task_1.TaskStatus.Failed].includes(t.status));
            // Determine new workflow status
            if (anyFailed)
                workflow.status = WorkflowStatus_1.WorkflowStatus.Failed;
            else if (allCompleted)
                workflow.status = WorkflowStatus_1.WorkflowStatus.Completed;
            else
                workflow.status = WorkflowStatus_1.WorkflowStatus.InProgress;
            // Aggregate final result if all tasks reached a terminal state
            if (allFinished) {
                workflow.finalResult = JSON.stringify({
                    totalTasks: tasks.length,
                    finishedAt: new Date().toISOString(),
                    results: tasks.map((t) => ({
                        taskId: t.taskId,
                        type: t.taskType,
                        status: t.status,
                        output: this.safeParse(t.output),
                        error: t.status === Task_1.TaskStatus.Failed ? t.progress : null,
                    })),
                });
            }
            await tm.save(workflow);
        });
    }
    safeParse(data) {
        if (!data)
            return null;
        try {
            return JSON.parse(data);
        }
        catch {
            return data;
        }
    }
}
exports.TaskRunner = TaskRunner;
