import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useChat(projectId: Id<"projects">) {
  const messages = useQuery(api.chat.list, projectId ? { projectId } : "skip");
  const sendMessage = useMutation(api.chat.send);

  const send = async (message: string) => {
    if (!message.trim()) return;
    await sendMessage({ projectId, message });
  };

  return { messages, send };
}
