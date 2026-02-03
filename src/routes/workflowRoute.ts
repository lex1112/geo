import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Workflow } from "../models/Workflow";
import { WorkflowService } from "../service/workflowService";
import { WorkflowController } from "../controllers/workflowController";

const router = Router();

const workflowRepo = AppDataSource.getRepository(Workflow);
const workflowService = new WorkflowService(workflowRepo);
const workflowController = new WorkflowController(workflowService);


router.get("/:id/status", (req, res, next) => {
  workflowController.getStatus(req, res).catch(next);
});

router.get("/:id/results", (req, res, next) => {
  workflowController.getResults(req, res).catch(next);
});

export default router;
