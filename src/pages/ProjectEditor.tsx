import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Send, Code2, Eye, Menu, Github } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

export default function ProjectEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const project = useQuery(api.projects.get, slug ? { slug } : "skip");
  const chatMessages = useQuery(
    api.chat.list,
    project ? { projectId: project._id } : "skip"
  );
  const projectFiles = useQuery(
    api.files.list,
    project ? { projectId: project._id } : "skip"
  );
  const sendMessage = useMutation(api.chat.send);

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"chat" | "sandbox">("chat");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (authLoading || project === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center dark">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/auth");
    return null;
  }

  if (project === null) {
    return (
      <div className="min-h-screen flex items-center justify-center dark">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project not found</h2>
          <Button onClick={() => navigate("/projects")}>Back to Projects</Button>
        </div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !project) return;
    
    setIsSending(true);
    try {
      await sendMessage({
        projectId: project._id,
        message: message.trim(),
      });
      setMessage("");
      toast.success("Message sent!");
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const selectedFileContent = selectedFile
    ? projectFiles?.find((f) => f.filePath === selectedFile)?.content
    : null;

  return (
    <div className="min-h-screen bg-background dark flex flex-col">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src="/assets/logo.jpg" alt="Logo" className="h-8 w-8" />
              <span className="font-bold text-xl hidden sm:inline">Vibe Coder</span>
            </div>
            <span className="text-sm text-muted-foreground hidden md:inline">
              {project.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
              <Github className="h-4 w-4" />
              Import
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileView(mobileView === "chat" ? "sandbox" : "chat")}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Interface - Left Side */}
        <div
          className={`flex flex-col border-r ${
            sandboxOpen ? "w-full md:w-1/3" : "w-full"
          } ${mobileView === "sandbox" ? "hidden md:flex" : "flex"}`}
        >
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages && chatMessages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start chatting to build your project with AI</p>
              </div>
            )}
            {chatMessages?.map((msg) => (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-[80%] p-4 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </Card>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Describe what you want to build..."
                rows={2}
                className="resize-none"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isSending || !message.trim()}
                size="icon"
                className="shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!sandboxOpen && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 gap-2"
                onClick={() => setSandboxOpen(true)}
              >
                <Code2 className="h-4 w-4" />
                Open Sandbox
              </Button>
            )}
          </div>
        </div>

        {/* Sandbox - Right Side */}
        {sandboxOpen && (
          <div
            className={`flex flex-col w-full md:w-2/3 ${
              mobileView === "chat" ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Sandbox Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                <span className="font-semibold">Sandbox</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {showPreview ? "Hide" : "Show"} Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSandboxOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Sandbox Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* File Tree */}
              <div className="w-64 border-r p-4 overflow-y-auto">
                <h3 className="font-semibold mb-2 text-sm">Files</h3>
                {projectFiles && projectFiles.length === 0 && (
                  <p className="text-sm text-muted-foreground">No files yet</p>
                )}
                <div className="space-y-1">
                  {projectFiles?.map((file) => (
                    <button
                      key={file._id}
                      onClick={() => setSelectedFile(file.filePath)}
                      className={`w-full text-left text-sm p-2 rounded hover:bg-accent ${
                        selectedFile === file.filePath ? "bg-accent" : ""
                      }`}
                    >
                      {file.filePath}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Viewer / Preview */}
              <div className="flex-1 overflow-hidden">
                {showPreview ? (
                  <div className="h-full bg-white">
                    <iframe
                      title="Preview"
                      className="w-full h-full border-0"
                      srcDoc="<html><body><h1>Preview coming soon</h1></body></html>"
                    />
                  </div>
                ) : (
                  <div className="h-full p-4 overflow-y-auto">
                    {selectedFile ? (
                      <div>
                        <h3 className="font-semibold mb-2">{selectedFile}</h3>
                        <Textarea
                          value={selectedFileContent || ""}
                          readOnly
                          className="font-mono text-sm min-h-[500px]"
                        />
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        Select a file to view its contents
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}