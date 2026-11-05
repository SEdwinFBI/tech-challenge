import os from 'node:os';
import { env } from './env';

export const instanceId = env.INSTANCE_ID || os.hostname();
