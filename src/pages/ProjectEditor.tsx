import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Send, Code2, Eye, Menu, Github, GitBranch, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useAction } from "convex/react";
import { toast } from "sonner";

export default function ProjectEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated, user, signIn } = useAuth();
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
  const listRepos = useAction(api.github.listUserRepos);
  const importRepo = useAction(api.github.importRepository);
  const createRepo = useAction(api.github.createRepository);
  const ensureGithubConnected = useMutation(api.githubMutations.ensureGithubConnected);
  const disconnectGithub = useMutation(api.githubMutations.disconnectGithubAccount);

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"chat" | "sandbox">("chat");
  const [showGithubDialog, setShowGithubDialog] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [githubAction, setGithubAction] = useState<"import" | "create" | null>(null);
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-check if user is GitHub connected on mount
  useEffect(() => {
    if (user) {
      ensureGithubConnected();
    }
  }, [user, ensureGithubConnected]);

  const isGithubConnected = user?.githubConnected;

  const handleOpenGithubDialog = async () => {
    if (!isGithubConnected) {
      setShowConnectDialog(true);
      return;
    }
    
    setShowGithubDialog(true);
    setGithubAction(null);
  };

  const handleGithubError = (error: any) => {
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("GitHub not connected") || errorMessage.includes("Please connect your GitHub account")) {
      setShowConnectDialog(true);
    } else {
      toast.error(errorMessage);
    }
  };

  const handleConnectGithub = async () => {
    setShowConnectDialog(false);
    try {
      await signIn("github");
      // After successful sign-in, the page will reload and ensureGithubConnected will run
      toast.success("GitHub account connected successfully!");
    } catch (error) {
      console.error("GitHub connection error:", error);
      toast.error("Failed to connect GitHub account");
    }
  };

  const handleDeclineConnect = () => {
    setShowConnectDialog(false);
    toast.error("You need to connect your GitHub account to import GitHub repositories");
  };

  const handleSelectAction = async (action: "import" | "create") => {
    setGithubAction(action);
    
    if (action === "import") {
      setIsLoading(true);
      try {
        const repos = await listRepos();
        setUserRepos(repos);
      } catch (error) {
        setShowGithubDialog(false);
        handleGithubError(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleImportRepo = async () => {
    if (!selectedRepo || !project) return;
    
    setIsLoading(true);
    try {
      await importRepo({
        projectId: project._id,
        repoFullName: selectedRepo,
      });
      toast.success("Repository imported successfully!");
      setShowGithubDialog(false);
      setSandboxOpen(true);
    } catch (error) {
      setShowGithubDialog(false);
      handleGithubError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRepo = async () => {
    if (!newRepoName.trim() || !project) return;
    
    setIsLoading(true);
    try {
      await createRepo({
        projectId: project._id,
        repoName: newRepoName.trim(),
        description: newRepoDescription || undefined,
        isPrivate,
      });
      toast.success("Repository created successfully!");
      setShowGithubDialog(false);
      setSandboxOpen(true);
    } catch (error) {
      setShowGithubDialog(false);
      handleGithubError(error);
    } finally {
      setIsLoading(false);
    }
  };

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
            {project.githubRepoUrl && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                <span>Synced</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hidden sm:flex"
              onClick={handleOpenGithubDialog}
            >
              <Github className="h-4 w-4" />
              {isGithubConnected ? "GitHub" : "Connect GitHub"}
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

      {/* GitHub Connect Confirmation Dialog */}
      {showConnectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Github className="h-5 w-5" />
              Connect GitHub Account
            </h2>
            <p className="text-muted-foreground mb-6">
              Do you want to connect your GitHub account? This will allow you to import existing repositories and create new ones.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleDeclineConnect}
              >
                No
              </Button>
              <Button
                onClick={handleConnectGithub}
                className="gap-2"
              >
                <Github className="h-4 w-4" />
                Yes, Connect
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* GitHub Dialog */}
      {showGithubDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Integration
            </h2>
            
            {!githubAction ? (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleSelectAction("import")}
                >
                  <GitBranch className="h-4 w-4" />
                  Import Existing Repository
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleSelectAction("create")}
                >
                  <Github className="h-4 w-4" />
                  Create New Repository
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowGithubDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : githubAction === "import" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Repository
                  </label>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <select
                      value={selectedRepo}
                      onChange={(e) => setSelectedRepo(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Choose a repository...</option>
                      {userRepos.map((repo) => (
                        <option key={repo.id} value={repo.fullName}>
                          {repo.fullName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setGithubAction(null)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleImportRepo}
                    disabled={isLoading || !selectedRepo}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Github className="h-4 w-4" />
                    )}
                    Import
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Repository Name
                  </label>
                  <Input
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="my-awesome-project"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Description (Optional)
                  </label>
                  <Textarea
                    value={newRepoDescription}
                    onChange={(e) => setNewRepoDescription(e.target.value)}
                    placeholder="What's this project about?"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="private"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  <label htmlFor="private" className="text-sm">
                    Make repository private
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setGithubAction(null)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateRepo}
                    disabled={isLoading || !newRepoName.trim()}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Github className="h-4 w-4" />
                    )}
                    Create
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

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