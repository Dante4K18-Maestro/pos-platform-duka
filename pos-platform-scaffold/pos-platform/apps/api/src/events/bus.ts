// In-process emitter now, queue (e.g. BullMQ) later once there's more than
// one API instance. Callers should not care which.
import { EventEmitter } from "node:events";

export const bus = new EventEmitter();
