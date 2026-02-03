"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
const sleep = (ms) => {
    if (ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    else {
        return new Promise((resolve) => setImmediate(resolve));
    }
};
exports.sleep = sleep;
