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
exports.WorkflowFactory = void 0;
const promises_1 = require("node:fs/promises");
const yaml = __importStar(require("js-yaml"));
const Workflow_1 = require("../models/Workflow");
const Task_1 = require("../models/Task");
const TaskStatus_1 = require("../workers/TaskStatus");
const WorkflowStatus_1 = require("./WorkflowStatus");
class WorkflowFactory {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    /**
     * Creates a workflow by reading a YAML file and constructing the Workflow and Task entities.
     * @param filePath - Path to the YAML file.
     * @param clientId - Client identifier for the workflow.
     * @param geoJson - The geoJson data string for tasks (customize as needed).
     * @returns A promise that resolves to the created Workflow.
     */
    async createWorkflowFromYAML(filePath, clientId, geoJson) {
        //file reading operation must be async
        const fileContent = await (0, promises_1.readFile)(filePath, "utf8");
        const workflowDef = yaml.load(fileContent);
        this.checkForCircularDependencies(workflowDef.steps);
        const workflowRepository = this.dataSource.getRepository(Workflow_1.Workflow);
        const taskRepository = this.dataSource.getRepository(Task_1.Task);
        const workflow = new Workflow_1.Workflow();
        workflow.clientId = clientId;
        workflow.status = WorkflowStatus_1.WorkflowStatus.Initial;
        const savedWorkflow = await workflowRepository.save(workflow);
        const aliasMap = new Map();
        workflowDef.steps.forEach((s) => {
            const stepNumber = String(s.stepNumber).padStart(3, "0"); // 001, 002, 003
            const shortHash = crypto.randomUUID().substring(0, 4);
            const compositeId = `${stepNumber}-${s.taskType}-${shortHash}`;
            aliasMap.set(s.taskType, compositeId);
        });
        const tasks = workflowDef.steps.map((step) => {
            const task = new Task_1.Task();
            task.taskId = aliasMap.get(step.taskType);
            task.clientId = clientId;
            task.geoJson = geoJson;
            task.status = TaskStatus_1.TaskStatus.Queued;
            task.taskType = step.taskType;
            task.stepNumber = step.stepNumber;
            task.workflow = savedWorkflow;
            if (step.dependsOn) {
                task.dependsOnId = aliasMap.get(step.dependsOn);
            }
            return task;
        });
        tasks.sort((a, b) => {
            if (b.dependsOnId === a.taskId)
                return -1;
            if (a.dependsOnId === b.taskId)
                return 1;
            return a.stepNumber - b.stepNumber;
        });
        await taskRepository.save(tasks);
        return savedWorkflow;
    }
    /**
     * Validates that there are no circular dependencies in the workflow steps.
     * Uses taskType as the unique identifier for dependency resolution.
     */
    checkForCircularDependencies(steps) {
        // Create a lookup map for quick dependency retrieval
        const dependencyMap = new Map(steps.map((s) => [s.taskType, s.dependsOn ?? undefined]));
        for (const step of steps) {
            const path = new Set();
            let currentTaskType = step.taskType;
            while (currentTaskType) {
                if (path.has(currentTaskType)) {
                    const chain = Array.from(path).join(" -> ");
                    throw new Error(`Circular dependency detected: ${chain} -> ${currentTaskType}`);
                }
                path.add(currentTaskType);
                // Move to the task this task depends on
                currentTaskType = dependencyMap.get(currentTaskType);
            }
        }
    }
}
exports.WorkflowFactory = WorkflowFactory;
