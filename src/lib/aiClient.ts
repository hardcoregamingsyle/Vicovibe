export async function sendToAI(
  message: string,
  task: string = "auto"
): Promise<{ reply: string; task: string; model: string }> {
  const response = await fetch("https://<your-worker-name>.workers.dev/api/vicovibe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, task }),
  });

  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "AI request failed");
  return { reply: data.reply, task: data.task, model: data.model };
}
