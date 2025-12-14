import path from "node:path";
import { fileURLToPath } from "node:url";
import { cli, WorkerOptions } from "@livekit/agents";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const agentPath = path.resolve(__dirname, "./agent.js");
const opts = new WorkerOptions({
  agent: agentPath,
  wsURL: process.env.LIVEKIT_URL,
  apiKey: process.env.LIVEKIT_API_KEY,
  apiSecret: process.env.LIVEKIT_API_SECRET,
  agentName: "mock-interviewer"
});
cli.runApp(opts);
//# sourceMappingURL=run.js.map
