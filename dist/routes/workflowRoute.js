"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = require("../data-source");
const Workflow_1 = require("../models/Workflow");
const TaskStatus_1 = require("../workers/TaskStatus");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /workflow/{id}/status:
 *   get:
 *     summary: Get the current status and progress of a workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique UUID of the workflow
 *     responses:
 *       200:
 *         description: Workflow status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workflowId:
 *                   type: string
 *                   example: "bf7060e3-863b-4d75-afa0-8bcb8a62bd32"
 *                 status:
 *                   type: string
 *                   example: "completed"
 *                 completedTasks:
 *                   type: integer
 *                   example: 4
 *                 totalTasks:
 *                   type: integer
 *                   example: 4
 *       404:
 *         description: Workflow not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Workflow not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
const getWorkflowStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const workflowRepo = data_source_1.AppDataSource.getRepository(Workflow_1.Workflow);
        const workflow = await workflowRepo.findOne({
            where: { workflowId: id },
            relations: ["tasks"],
        });
        if (!workflow) {
            res.status(404).json({ message: "Workflow not found" });
            return;
        }
        const totalTasks = workflow.tasks.length;
        const completedTasks = workflow.tasks.filter((t) => t.status === TaskStatus_1.TaskStatus.Completed || t.status === TaskStatus_1.TaskStatus.Failed).length;
        res.json({
            workflowId: workflow.workflowId,
            status: workflow.status,
            completedTasks,
            totalTasks,
        });
    }
    catch {
        res.status(500).json({ error: "Internal server error" });
    }
};
/**
 * @swagger
 * /workflow/{id}/results:
 *   get:
 *     summary: Retrieve the final results of a completed workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique ID of the workflow
 *     responses:
 *       200:
 *         description: Successful retrieval of workflow results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workflowId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   example: "completed"
 *                 finalResult:
 *                   type: object
 *                   description: The parsed JSON object containing all task outputs
 *       400:
 *         description: Workflow is still in progress or failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Workflow is not yet completed"
 *                 status:
 *                   type: string
 *                   example: "pending"
 *       404:
 *         description: Workflow not found
 *       500:
 *         description: Internal server error
 */
const getWorkflowResults = async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch only the necessary fields using the Repository API
        const workflow = await data_source_1.AppDataSource.getRepository(Workflow_1.Workflow).findOne({
            where: { workflowId: id },
            select: {
                workflowId: true,
                status: true,
                finalResult: true, // Assuming this column exists in your Workflow entity
            },
        });
        // Return 404 if ID does not exist
        if (!workflow) {
            res.status(404).json({ message: "Workflow not found" });
            return;
        }
        // Return 400 if workflow is not yet completed
        if (workflow.status !== "completed") {
            res.status(400).json({
                message: "Workflow is not yet completed",
                status: workflow.status,
            });
            return;
        }
        // Success Response
        res.json({
            workflowId: workflow.workflowId,
            status: workflow.status,
            finalResult: JSON.parse(workflow.finalResult ?? ""),
        });
    }
    catch (error) {
        console.error("Error retrieving workflow results:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
router.get("/:id/status", getWorkflowStatus);
router.get("/:id/results", getWorkflowResults);
exports.default = router;
