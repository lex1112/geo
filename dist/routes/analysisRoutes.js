"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = require("../data-source");
const WorkflowFactory_1 = require("../workflows/WorkflowFactory"); // Create a folder for factories if you prefer
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const workflowFactory = new WorkflowFactory_1.WorkflowFactory(data_source_1.AppDataSource);
/**
 * @swagger
 * /analysis:
 *   post:
 *     summary: Create a new workflow from a YAML definition
 *     tags: [Workflows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientId
 *               - geoJson
 *             properties:
 *               clientId:
 *                 type: string
 *                 example: "client_123"
 *               geoJson:
 *                 type: object
 *                 description: Valid GeoJSON object
 *                 example:
 *                   type: "Polygon"
 *                   coordinates: [
 *                     [
 *                       [-63.624885020050996, -10.311050368263523],
 *                       [-63.624885020050996, -10.367865108370523],
 *                       [-63.61278302732815, -10.367865108370523],
 *                       [-63.61278302732815, -10.311050368263523],
 *                       [-63.624885020050996, -10.311050368263523]
 *                     ]
 *                   ]
 *     responses:
 *       202:
 *         description: Workflow created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workflowId:
 *                   type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: Workflow file not found
 *       500:
 *         description: Server error
 */
router.post("/", async (req, res) => {
    const { clientId, geoJson } = req.body;
    const workflowFile = path_1.default.join(__dirname, "../workflows/example_workflow.yml");
    try {
        const workflow = await workflowFactory.createWorkflowFromYAML(workflowFile, clientId, JSON.stringify(geoJson));
        if (!workflow) {
            res.status(404).json({ message: "Workflow not found" });
            return;
        }
        res.status(202).json({
            workflowId: workflow.workflowId,
            message: "Workflow created and tasks queued from YAML definition.",
        });
    }
    catch (error) {
        console.error("Error creating workflow:", error);
        res.status(500).json({ message: "Failed to create workflow" });
    }
});
exports.default = router;
