"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const ReportGenerationJob_1 = require("./ReportGenerationJob");
const taskRunner_1 = require("../workers/taskRunner");
const sleep = __importStar(require("../utils/sleep"));
describe("ReportGenerationJob", () => {
    let job;
    let mockTask;
    beforeEach(() => {
        job = new ReportGenerationJob_1.ReportGenerationJob();
        mockTask = {
            taskId: "report-001",
            taskType: "reportGeneration",
            status: taskRunner_1.TaskStatus.Queued,
            output: "",
            workflow: {
                workflowId: "wf-123",
                tasks: [
                    {
                        taskId: "task-1",
                        taskType: "analysis",
                        output: "Result 1",
                        status: taskRunner_1.TaskStatus.Completed
                    },
                    {
                        taskId: "report-001", // The report task itself
                        taskType: "reportGeneration",
                        output: "",
                        status: taskRunner_1.TaskStatus.Queued
                    }
                ]
            }
        };
        jest.clearAllMocks();
    });
    it("should successfully aggregate tasks and set status to Completed", async () => {
        await job.run(mockTask);
        // Verify sleep was called
        expect(sleep).toHaveBeenCalledTimes(1);
        // Verify status update
        expect(mockTask.status).toBe(taskRunner_1.TaskStatus.Completed);
        // Verify output content
        const parsedOutput = JSON.parse(mockTask.output);
        expect(parsedOutput.workflowId).toBe("wf-123");
        expect(parsedOutput.tasks).toHaveLength(1); // Excludes itself
        expect(parsedOutput.tasks[0].taskId).toBe("task-1");
        expect(parsedOutput.finalReport).toBe("Aggregated data from 1 tasks.");
    });
    it("should throw error if workflow or tasks are missing", async () => {
        // Creating a task without a workflow safely
        const brokenTask = {
            taskId: "err-1",
            workflow: undefined
        };
        const sleepSpy = jest.spyOn(sleep, "sleep").mockResolvedValue(undefined);
        await expect(job.run(brokenTask)).rejects.toThrow("Workflow data or related tasks are missing for report generation.");
        sleepSpy.mockRestore();
    });
    it("should handle a workflow with only the report task itself", async () => {
        // Workflow with no other tasks
        mockTask.workflow.tasks = [mockTask];
        await job.run(mockTask);
        const parsedOutput = JSON.parse(mockTask.output);
        expect(parsedOutput.tasks).toHaveLength(0);
        expect(parsedOutput.finalReport).toBe("Aggregated data from 0 tasks.");
    });
});
