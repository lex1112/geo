import { Request, Response } from "express";
import { WorkflowService } from "../service/workflowService";

export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) { }

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
  public getStatus = async (req: Request, res: Response) => {
    try {
      const result = await this.workflowService.getStatus(req.params.id);
      if (!result) return res.status(404).json({ message: "Workflow not found" });
      res.json(result);
    } catch (error) {
      console.error("Error:", error);
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
  public getResults = async (req: Request, res: Response) => {
    try {
      const result = await this.workflowService.getResults(req.params.id);

      if (result && "error" in result) {
        if (result.error === "NOT_FOUND") return res.status(404).json({ message: "Workflow not found" });
        return res.status(400).json({ message: "Workflow is not yet completed", status: result.status });
      }

      res.json(result);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
