// Job bootstrap — import all job modules (side-effect: registerJob calls),
// then start the scheduler. Call from server entry point.

import "./email-verify-cleanup.js";
import "./api-usage-aggregate.js";
import "./reminder.js";
import "./growth-report.js";
import { startScheduler } from "./scheduler.js";

export { startScheduler };
