// src/lib/aiClient.ts
export async function sendToWorker(message: string, projectId?: string) {
  const base = import.meta.env.VITE_VICOVIBE_API || "https://<your-worker-subdomain>.workers.dev";
  const res = await fetch(`${base}/api/orchestrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, projectId })
  });
  return res.json();
}
