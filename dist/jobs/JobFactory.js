"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobForTaskType = getJobForTaskType;
const DataAnalysisJob_1 = require("./DataAnalysisJob");
const EmailNotificationJob_1 = require("./EmailNotificationJob");
const PolygonAreaJob_1 = require("./PolygonAreaJob");
const ReportGenerationJob_1 = require("./ReportGenerationJob");
const jobMap = {
    polygonArea: () => new PolygonAreaJob_1.PolygonAreaJob(),
    analysis: () => new DataAnalysisJob_1.DataAnalysisJob(),
    notification: () => new EmailNotificationJob_1.EmailNotificationJob(),
    reportGeneration: () => new ReportGenerationJob_1.ReportGenerationJob(),
};
function getJobForTaskType(taskType) {
    const jobFactory = jobMap[taskType];
    if (!jobFactory) {
        throw new Error(`No job found for task type: ${taskType}`);
    }
    return jobFactory();
}
