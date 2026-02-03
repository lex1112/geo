"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatus = void 0;
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["Queued"] = "queued";
    TaskStatus["InProgress"] = "in_progress";
    TaskStatus["Completed"] = "completed";
    TaskStatus["Failed"] = "failed";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
