"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailNotificationJob = void 0;
const sleep_1 = require("../utils/sleep");
class EmailNotificationJob {
    async run(task) {
        console.log(`EmailNotificationJob is running for task with input ${task.input}...`);
        // Perform notification work
        await (0, sleep_1.sleep)();
        console.log("Email sent!");
    }
}
exports.EmailNotificationJob = EmailNotificationJob;
