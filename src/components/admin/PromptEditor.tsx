import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { adminAPIService } from "@/services/admin-api.service";
import { toast } from "sonner";
import {
  Edit,
  Save,
  X,
  History,
  Code,
  Play,
  Plus,
  Download,
  Upload,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  template_text: string;
  variables: any; // Will be cast to string[] when used
  version: number;
  created_at: string;
  updated_at: string;
  is_json_response: boolean;
  json_schema?: any;
  llm_model?: string;
  default_temperature?: number;
}

interface PromptVersion {
  id: string;
  version: number;
  template_text: string;
  variables: any; // Will be cast to string[] when used
  change_notes: string | null;
  created_at: string;
}

interface AdditionalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Default values for common prompt variables
const DEFAULT_VALUES: Record<string, Record<string, string>> = {
  // Agent conversation defaults
  agent_conversation_enhanced_v2: {
    agentName: "Alice",
    userHandle: "@alice_dev",
    narrative:
      "I'm a full-stack developer with 8 years of experience building scalable web applications. I specialize in React, Node.js, and cloud architecture. Currently leading a team of 5 engineers at a fintech startup.",
    currentFocus:
      "Building a real-time payment processing system, Exploring AI integration in financial services",
    seekingConnections:
      "AI/ML engineers, Payment system experts, Fintech founders",
    offeringExpertise:
      "React best practices, Node.js optimization, Team leadership, Startup scaling",
    otherUserHandle: "@bob_ai",
    turnNumber: "3",
    contextPrompt:
      "Focus on exploring potential collaboration opportunities around AI in fintech.",
    conversationHistory:
      "Bob: Hi Alice! I heard you're working on some interesting fintech projects.\nAlice: Yes! We're building a real-time payment system. I saw you specialize in AI - that's fascinating.\nBob: Indeed! I've been working on fraud detection models for financial transactions.",
  },

  generate_test_users: {
    generation_mode: "random",
    input_data: "no guidance, random generation",
  },

  // Omniscient analysis defaults
  omniscient_opportunity_analysis_v2: {
    handleA: "@sarah_designer",
    narrativeA:
      "UX designer with a passion for creating intuitive financial interfaces. 10 years experience in enterprise software.",
    currentFocusA:
      "Redesigning banking apps for accessibility, Creating design systems for fintech",
    seekingA: "Frontend developers, Fintech product managers, User researchers",
    offeringA:
      "UX/UI design, Design systems, User research, Accessibility expertise",
    handleB: "@mike_frontend",
    narrativeB:
      "Frontend engineer specializing in React and TypeScript. Building beautiful, performant web applications.",
    currentFocusB:
      "Component libraries, Web performance optimization, Accessibility implementation",
    seekingB: "UX designers, Product designers, Performance engineers",
    offeringB:
      "React expertise, TypeScript, Performance optimization, Component architecture",
  },

  // Agent interview defaults
  agent_interview_onboarding_v2: {
    agentName: "Midnight",
    communicationStyle: "friendly, curious, and professional",
  },

  // Morning report defaults
  morning_report_insights: {
    conversationSummary:
      "Had 3 conversations last night: 1) With a React developer interested in your component library work 2) With a startup founder needing technical advisors 3) With a designer looking for frontend collaboration",
    userFocusAreas:
      "Open source projects, Technical mentoring, Frontend architecture",
    userSeeking:
      "Open source contributors, Junior developers to mentor, Interesting technical challenges",
  },

  // Conversation summary defaults
  conversation_summary_analysis: {
    userAHandle: "@emma_product",
    userBHandle: "@raj_engineer",
    conversationContent:
      "Emma: Hi Raj! I'm working on a new productivity app and looking for a technical co-founder.\nRaj: That sounds interesting! Tell me more about your vision.\nEmma: It's an AI-powered task manager that learns from user behavior. We have 500 beta users already.\nRaj: Impressive traction! I've been looking to join an early-stage startup. What's your tech stack?\nEmma: Currently using Next.js and Supabase. We need someone to own the technical architecture.\nRaj: Perfect, those are my specialties! Let's schedule a call to discuss further.",
  },
};

export const PromptEditor = () => {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(
    null
  );
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [previewVariables, setPreviewVariables] = useState<
    Record<string, string>
  >({});
  const [changeNotes, setChangeNotes] = useState("");
  const [runResult, setRunResult] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [previewModel, setPreviewModel] = useState<string | null>(null);
  const [previewTemperature, setPreviewTemperature] = useState<number | null>(
    null
  );
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<PromptTemplate>>({
    name: "",
    description: "",
    template_text: "",
    is_json_response: false,
    json_schema: "",
    llm_model: "anthropic/claude-3-5-sonnet-20241022",
    default_temperature: 0.2,
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [conflictStrategy, setConflictStrategy] = useState<
    "skip" | "overwrite" | "rename"
  >("skip");
  const [additionalMessages, setAdditionalMessages] = useState<
    AdditionalMessage[]
  >([]);

  // Fetch templates using React Query
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["prompt-templates"],
    queryFn: () => adminAPIService.getPromptTemplates(),
  });

  // Fetch available models
  const { data: availableModels = [] } = useQuery({
    queryKey: ["available-models"],
    queryFn: () => adminAPIService.getAvailableModels(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch versions for selected template
  const fetchVersions = async (templateId: string) => {
    try {
      const versions = await adminAPIService.getPromptVersions(templateId);
      setVersions(versions);
    } catch (error) {
      console.error("Error fetching versions:", error);
      toast.error("Failed to load version history");
    }
  };

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: string;
      data: any;
    }) => {
      return adminAPIService.updatePromptTemplate(templateId, data);
    },
    onSuccess: (updatedTemplate) => {
      toast.success("Prompt template updated successfully");
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });

      // Update the selected template with the new values
      if (selectedTemplate && updatedTemplate) {
        setSelectedTemplate(updatedTemplate);
      }

      setEditingTemplate(null);
      setChangeNotes("");
    },
    onError: (error) => {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    },
  });

  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: async ({
      templateId,
      versionId,
    }: {
      templateId: string;
      versionId: string;
    }) => {
      return adminAPIService.restorePromptVersion(templateId, versionId);
    },
    onSuccess: () => {
      toast.success("Version restored successfully");
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      if (selectedTemplate) {
        fetchVersions(selectedTemplate.id);
      }
    },
    onError: (error) => {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      template_text: string;
      is_json_response?: boolean;
      json_schema?: any;
      llm_model?: string;
    }) => {
      return adminAPIService.createPromptTemplate(data);
    },
    onSuccess: (newTemplate) => {
      toast.success("Template created successfully");
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      setCreatingTemplate(false);
      setSelectedTemplate(newTemplate);
      // Reset form
      setNewTemplate({
        name: "",
        description: "",
        template_text: "",
        is_json_response: false,
        json_schema: "",
        llm_model: "anthropic/claude-3-5-sonnet-20241022",
      });
    },
    onError: (error) => {
      console.error("Failed to create template:", error);
      toast.error("Failed to create template");
    },
  });

  // Export templates mutation
  const exportTemplateMutation = useMutation({
    mutationFn: async (templateIds?: string[]) => {
      return adminAPIService.exportPromptTemplates(templateIds);
    },
    onSuccess: (exportData) => {
      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `prompt-templates-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportData.templates.length} templates`);
    },
    onError: (error) => {
      console.error("Failed to export templates:", error);
      toast.error("Failed to export templates");
    },
  });

  // Import templates mutation
  const importTemplateMutation = useMutation({
    mutationFn: async ({
      importData,
      conflictStrategy,
    }: {
      importData: any;
      conflictStrategy: "skip" | "overwrite" | "rename";
    }) => {
      return adminAPIService.importPromptTemplates(
        importData,
        conflictStrategy
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      setShowImportDialog(false);
      setImportFile(null);

      let message = `Import complete: ${result.imported} imported`;
      if (result.skipped > 0) message += `, ${result.skipped} skipped`;
      if (result.errors.length > 0) {
        message += `, ${result.errors.length} errors`;
        console.error("Import errors:", result.errors);
        result.errors.forEach((error, index) => {
          console.error(`Error ${index + 1}:`, error);
          toast.error(error);
        });
      }
      toast.success(message);

      // Log full result for debugging
      console.log("Import result:", result);
    },
    onError: (error) => {
      console.error("Failed to import templates:", error);
      toast.error("Failed to import templates");
    },
  });

  const handleSelectTemplate = async (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setEditingTemplate(null);
    setRunResult(null); // Clear run result when switching templates
    setPreviewModel(null); // Reset preview model to use template default
    setPreviewTemperature(null); // Reset preview temperature to use template default
    setAdditionalMessages([]); // Clear additional messages
    await fetchVersions(template.id);

    // Load default values automatically
    loadDefaultValuesForTemplate(template);
  };

  const handleEdit = () => {
    if (selectedTemplate) {
      setEditingTemplate({ ...selectedTemplate });
      setChangeNotes("");
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    // Validate temperature
    if (
      editingTemplate.default_temperature !== undefined &&
      (editingTemplate.default_temperature < 0 ||
        editingTemplate.default_temperature > 2)
    ) {
      toast.error("Temperature must be between 0.0 and 2.0");
      return;
    }

    // Validate JSON schema if needed
    if (editingTemplate.is_json_response && editingTemplate.json_schema) {
      try {
        // Ensure it's valid JSON
        if (typeof editingTemplate.json_schema === "string") {
          JSON.parse(editingTemplate.json_schema);
        }
      } catch (error) {
        toast.error("Invalid JSON schema format");
        return;
      }
    }

    updateTemplateMutation.mutate({
      templateId: editingTemplate.id,
      data: {
        template_text: editingTemplate.template_text,
        description: editingTemplate.description,
        changeNotes: changeNotes,
        is_json_response: editingTemplate.is_json_response,
        json_schema: editingTemplate.json_schema,
        llm_model: editingTemplate.llm_model,
        default_temperature: editingTemplate.default_temperature,
      },
    });
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setChangeNotes("");
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.template_text) {
      toast.error("Name and template text are required");
      return;
    }

    // Validate temperature
    if (
      newTemplate.default_temperature !== undefined &&
      (newTemplate.default_temperature < 0 ||
        newTemplate.default_temperature > 2)
    ) {
      toast.error("Temperature must be between 0.0 and 2.0");
      return;
    }

    // Validate JSON schema if needed
    if (newTemplate.is_json_response && newTemplate.json_schema) {
      try {
        // Ensure it's valid JSON
        if (typeof newTemplate.json_schema === "string") {
          JSON.parse(newTemplate.json_schema);
        }
      } catch (error) {
        toast.error("Invalid JSON schema format");
        return;
      }
    }

    createTemplateMutation.mutate({
      name: newTemplate.name,
      description: newTemplate.description || undefined,
      template_text: newTemplate.template_text,
      is_json_response: newTemplate.is_json_response,
      json_schema: newTemplate.json_schema || undefined,
      llm_model: newTemplate.llm_model,
      default_temperature: newTemplate.default_temperature,
    });
  };

  const handleExportAll = () => {
    exportTemplateMutation.mutate();
  };

  const handleImport = () => {
    setShowImportDialog(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    try {
      const fileContent = await importFile.text();
      const importData = JSON.parse(fileContent);

      // Basic validation
      if (!importData.templates || !Array.isArray(importData.templates)) {
        toast.error("Invalid file format: templates array is required");
        return;
      }

      importTemplateMutation.mutate({ importData, conflictStrategy });
    } catch (error) {
      toast.error("Failed to parse JSON file");
    }
  };

  const renderPreview = () => {
    if (!selectedTemplate) return null;

    let preview =
      editingTemplate?.template_text || selectedTemplate.template_text;
    Object.entries(previewVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      preview = preview.replace(regex, value);
    });

    return preview;
  };

  const handleRestoreVersion = async (version: PromptVersion) => {
    if (!selectedTemplate) return;

    const confirm = window.confirm(
      `Restore version ${version.version}? This will create a new version.`
    );
    if (!confirm) return;

    restoreVersionMutation.mutate({
      templateId: selectedTemplate.id,
      versionId: version.id,
    });
  };

  const handleRunPrompt = async () => {
    if (!selectedTemplate) return;

    setIsRunning(true);
    setRunResult(null);

    try {
      const response = await adminAPIService.runPrompt({
        templateName: selectedTemplate.name,
        variables: previewVariables,
        // Use preview model if set, otherwise falls back to template model
        model: previewModel || undefined,
        // Use preview temperature if set, otherwise falls back to template default
        temperature:
          previewTemperature ??
          selectedTemplate.default_temperature ??
          undefined,
        // Include additional messages if any
        additionalMessages:
          additionalMessages.length > 0 ? additionalMessages : undefined,
      });

      setRunResult(response.response);

      // Add the response as an assistant message
      const assistantMessage: AdditionalMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.response,
      };
      setAdditionalMessages((prev) => [...prev, assistantMessage]);

      toast.success("Prompt executed successfully");

      // Show model info if different from template
      if (previewModel && previewModel !== selectedTemplate.llm_model) {
        toast.info(`Used model: ${previewModel}`);
      }

      // Show temperature info if different from template
      if (
        previewTemperature !== null &&
        previewTemperature !== selectedTemplate.default_temperature
      ) {
        toast.info(
          `Used temperature: ${previewTemperature} (template default: ${
            selectedTemplate.default_temperature ?? 0.2
          })`
        );
      }

      // Show info about additional messages
      if (additionalMessages.length > 0) {
        toast.info(
          `Included ${additionalMessages.length} additional message(s)`
        );
      }

      // Show a warning if editing
      if (editingTemplate) {
        toast.info(
          "Note: Running saved version. Save changes to test edited template."
        );
      }
    } catch (error) {
      console.error("Error running prompt:", error);
      toast.error(
        "Failed to run prompt: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      setRunResult(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsRunning(false);
    }
  };

  const loadDefaultValuesForTemplate = (template: PromptTemplate) => {
    // Find matching defaults based on prompt name
    let defaults: Record<string, string> | undefined;

    // Try to match by exact template name
    defaults = DEFAULT_VALUES[template.name];

    // If not found, try to match by template name pattern
    if (!defaults) {
      for (const [key, values] of Object.entries(DEFAULT_VALUES)) {
        if (
          template.name.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(template.name.toLowerCase())
        ) {
          defaults = values;
          break;
        }
      }
    }

    const templateVars = Array.isArray(template.variables)
      ? template.variables
      : [];
    const newValues: Record<string, string> = {};

    if (defaults) {
      // Load default values for variables that exist in the template
      templateVars.forEach((varName: string) => {
        if (defaults[varName]) {
          newValues[varName] = defaults[varName];
        } else {
          // Use placeholder if no default found
          newValues[varName] = `{{${varName}}}`;
        }
      });
    } else {
      // No defaults available, use placeholders
      templateVars.forEach((v: string) => {
        newValues[v] = `{{${v}}}`;
      });
    }

    setPreviewVariables(newValues);
  };

  const clearAllValues = () => {
    if (!selectedTemplate) return;

    const vars: Record<string, string> = {};
    const templateVars = Array.isArray(selectedTemplate.variables)
      ? selectedTemplate.variables
      : [];
    templateVars.forEach((v: string) => {
      vars[v] = "";
    });
    setPreviewVariables(vars);
    setAdditionalMessages([]);
    toast.success("All values and messages cleared");
  };

  const addAdditionalMessage = () => {
    const newMessage: AdditionalMessage = {
      id: Date.now().toString(),
      role: "user",
      content: "",
    };
    setAdditionalMessages((prev) => [...prev, newMessage]);
  };

  const removeAdditionalMessage = (id: string) => {
    setAdditionalMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const updateAdditionalMessage = (
    id: string,
    field: keyof AdditionalMessage,
    value: string
  ) => {
    setAdditionalMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, [field]: value } : msg))
    );
  };

  const resetToInitialState = () => {
    if (!selectedTemplate) return;

    // Reset to default values
    loadDefaultValuesForTemplate(selectedTemplate);

    // Clear additional messages
    setAdditionalMessages([]);

    // Clear run result
    setRunResult(null);

    // Reset preview overrides
    setPreviewModel(null);
    setPreviewTemperature(null);

    toast.success("Reset to initial state");
  };

  if (isLoading) {
    return (
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardContent className="p-6 text-center">
          <p className="text-terminal-text">Loading prompt templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-terminal-cyan font-mono flex items-center gap-2">
              <Code className="w-5 h-5" />
              Prompt Template Editor
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportAll}
                disabled={exportTemplateMutation.isPending}
                className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
              >
                <Download className="w-4 h-4 mr-1" />
                {exportTemplateMutation.isPending
                  ? "Exporting..."
                  : "Export All"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleImport}
                className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
              >
                <Upload className="w-4 h-4 mr-1" />
                Import
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-terminal-green font-mono text-sm">
                  Templates
                </h3>
                <Button
                  size="sm"
                  onClick={() => setCreatingTemplate(true)}
                  className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </div>
              <div className="space-y-3 overflow-y-auto pr-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-4 rounded border cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? "border-terminal-cyan bg-terminal-cyan/10"
                        : "border-terminal-cyan/30 hover:border-terminal-cyan/50"
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Template name */}
                      <p className="text-terminal-text text-sm font-mono break-words">
                        {template.name}
                      </p>

                      {/* Description */}
                      {template.description && (
                        <p className="text-terminal-text-muted text-xs leading-relaxed">
                          {template.description}
                        </p>
                      )}

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className="text-xs bg-terminal-green/20 text-terminal-green border-terminal-green/30">
                          v{template.version}
                        </Badge>

                        {template.is_json_response && (
                          <Badge className="text-xs bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/30">
                            JSON
                          </Badge>
                        )}
                        {template.llm_model && (
                          <Badge variant="outline" className="text-xs">
                            {template.llm_model.split("/")[1]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="lg:col-span-2 space-y-4">
              {creatingTemplate ? (
                // Creation Form
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-terminal-green font-mono text-sm">
                      Create New Template
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCreatingTemplate(false);
                        setNewTemplate({
                          name: "",
                          description: "",
                          template_text: "",
                          is_json_response: false,
                          json_schema: "",
                          llm_model: "anthropic/claude-3-5-sonnet-20241022",
                          default_temperature: 0.2,
                        });
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Template Name *</Label>
                      <Input
                        value={newTemplate.name || ""}
                        onChange={(e) =>
                          setNewTemplate((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="bg-terminal-bg border-terminal-cyan/30"
                        placeholder="e.g., my_new_prompt_template"
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        value={newTemplate.description || ""}
                        onChange={(e) =>
                          setNewTemplate((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="bg-terminal-bg border-terminal-cyan/30"
                        placeholder="Brief description of this prompt template"
                      />
                    </div>

                    <div>
                      <Label>Template Content *</Label>
                      <Textarea
                        value={newTemplate.template_text || ""}
                        onChange={(e) =>
                          setNewTemplate((prev) => ({
                            ...prev,
                            template_text: e.target.value,
                          }))
                        }
                        rows={15}
                        className="bg-terminal-bg border-terminal-cyan/30 font-mono text-sm"
                        placeholder="Enter your prompt template with {{variables}}"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>LLM Model</Label>
                        <SearchableSelect
                          value={
                            newTemplate.llm_model ||
                            "anthropic/claude-3-5-sonnet-20241022"
                          }
                          onValueChange={(value) =>
                            setNewTemplate((prev) => ({
                              ...prev,
                              llm_model: value,
                            }))
                          }
                          options={
                            availableModels.length > 0
                              ? availableModels.map((model) => ({
                                  value: model.id,
                                  label: model.name,
                                }))
                              : [
                                  {
                                    value:
                                      "anthropic/claude-3-5-sonnet-20241022",
                                    label: "Claude 3.5 Sonnet",
                                  },
                                  {
                                    value: "google/gemini-2.0-flash-exp:free",
                                    label: "Gemini 2.0 Flash (Free)",
                                  },
                                  {
                                    value: "openai/gpt-4o-mini",
                                    label: "GPT-4o Mini",
                                  },
                                  {
                                    value: "openai/gpt-4-turbo",
                                    label: "GPT-4 Turbo",
                                  },
                                ]
                          }
                          placeholder="Select a model"
                          className="bg-terminal-bg border-terminal-cyan/30"
                        />
                      </div>

                      <div>
                        <Label>Default Temperature</Label>
                        <Input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={newTemplate.default_temperature || 0.2}
                          onChange={(e) =>
                            setNewTemplate((prev) => ({
                              ...prev,
                              default_temperature:
                                parseFloat(e.target.value) || 0.2,
                            }))
                          }
                          className="bg-terminal-bg border-terminal-cyan/30"
                          placeholder="0.2"
                        />
                      </div>

                      <div className="flex items-center space-x-2 mt-6">
                        <Checkbox
                          id="json-response-new"
                          checked={newTemplate.is_json_response || false}
                          onCheckedChange={(checked) =>
                            setNewTemplate((prev) => ({
                              ...prev,
                              is_json_response: !!checked,
                            }))
                          }
                        />
                        <Label
                          htmlFor="json-response-new"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          JSON Response Expected
                        </Label>
                      </div>
                    </div>

                    {newTemplate.is_json_response && (
                      <div>
                        <Label>JSON Schema</Label>
                        <Textarea
                          value={newTemplate.json_schema || ""}
                          onChange={(e) =>
                            setNewTemplate((prev) => ({
                              ...prev,
                              json_schema: e.target.value,
                            }))
                          }
                          rows={10}
                          className="bg-terminal-bg border-terminal-cyan/30 font-mono text-xs"
                          placeholder='{"type": "object", "properties": {...}}'
                        />
                      </div>
                    )}

                    <div>
                      <Label>Variables Detected</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(() => {
                          const templateText = newTemplate.template_text || "";
                          const variableMatches =
                            templateText.match(/{{(\w+)}}/g) || [];
                          const detectedVars = [
                            ...new Set(
                              variableMatches.map((m: string) => m.slice(2, -2))
                            ),
                          ];
                          return detectedVars.map((variable: string) => (
                            <Badge
                              key={variable}
                              variant="outline"
                              className="font-mono"
                            >
                              {variable}
                            </Badge>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateTemplate}
                        disabled={
                          !newTemplate.name ||
                          !newTemplate.template_text ||
                          createTemplateMutation.isPending
                        }
                        className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {createTemplateMutation.isPending
                          ? "Creating..."
                          : "Create Template"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : selectedTemplate ? (
                <Tabs defaultValue="editor" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="editor">Editor</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-terminal-green font-mono text-sm">
                        {editingTemplate ? "Editing" : "Viewing"}:{" "}
                        {selectedTemplate.name}
                      </h3>
                      <div className="flex gap-2">
                        {editingTemplate ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={updateTemplateMutation.isPending}
                              className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan"
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              disabled={updateTemplateMutation.isPending}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={handleEdit}
                            className="bg-terminal-cyan text-terminal-bg hover:bg-terminal-green"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Description</Label>
                        <Input
                          value={
                            editingTemplate?.description ||
                            selectedTemplate.description ||
                            ""
                          }
                          onChange={(e) =>
                            setEditingTemplate((prev) =>
                              prev
                                ? { ...prev, description: e.target.value }
                                : null
                            )
                          }
                          disabled={!editingTemplate}
                          className="bg-terminal-bg border-terminal-cyan/30"
                          placeholder="Brief description of this prompt template"
                        />
                      </div>

                      <div>
                        <Label>Template</Label>
                        <Textarea
                          value={
                            editingTemplate?.template_text ||
                            selectedTemplate.template_text
                          }
                          onChange={(e) =>
                            setEditingTemplate((prev) =>
                              prev
                                ? { ...prev, template_text: e.target.value }
                                : null
                            )
                          }
                          disabled={!editingTemplate}
                          rows={15}
                          className="bg-terminal-bg border-terminal-cyan/30 font-mono text-sm"
                          placeholder="Enter your prompt template with {{variables}}"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>LLM Model</Label>
                          {editingTemplate ? (
                            <SearchableSelect
                              value={
                                editingTemplate.llm_model ||
                                selectedTemplate.llm_model ||
                                "anthropic/claude-3-5-sonnet-20241022"
                              }
                              onValueChange={(value) => {
                                setEditingTemplate((prev) =>
                                  prev ? { ...prev, llm_model: value } : null
                                );
                              }}
                              options={
                                availableModels.length > 0
                                  ? availableModels.map((model) => ({
                                      value: model.id,
                                      label: model.name,
                                    }))
                                  : [
                                      {
                                        value:
                                          "anthropic/claude-3-5-sonnet-20241022",
                                        label: "Claude 3.5 Sonnet",
                                      },
                                      {
                                        value:
                                          "google/gemini-2.0-flash-exp:free",
                                        label: "Gemini 2.0 Flash (Free)",
                                      },
                                      {
                                        value: "openai/gpt-4o-mini",
                                        label: "GPT-4o Mini",
                                      },
                                      {
                                        value: "openai/gpt-4-turbo",
                                        label: "GPT-4 Turbo",
                                      },
                                    ]
                              }
                              placeholder="Select a model"
                              className="bg-terminal-bg border-terminal-cyan/30"
                            />
                          ) : (
                            <div className="bg-terminal-bg border border-terminal-cyan/30 rounded-md px-3 py-2 text-sm">
                              {selectedTemplate.llm_model ||
                                "anthropic/claude-3-5-sonnet-20241022"}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label>Default Temperature</Label>
                          {editingTemplate ? (
                            <Input
                              type="number"
                              min="0"
                              max="2"
                              step="0.1"
                              value={
                                editingTemplate.default_temperature ??
                                selectedTemplate.default_temperature ??
                                0.2
                              }
                              onChange={(e) =>
                                setEditingTemplate((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        default_temperature:
                                          parseFloat(e.target.value) || 0.2,
                                      }
                                    : null
                                )
                              }
                              className="bg-terminal-bg border-terminal-cyan/30"
                              placeholder="0.2"
                            />
                          ) : (
                            <div className="bg-terminal-bg border border-terminal-cyan/30 rounded-md px-3 py-2 text-sm">
                              {selectedTemplate.default_temperature ?? 0.2}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 mt-6">
                          <Checkbox
                            id="json-response"
                            checked={
                              editingTemplate?.is_json_response ||
                              selectedTemplate.is_json_response ||
                              false
                            }
                            onCheckedChange={(checked) =>
                              setEditingTemplate((prev) =>
                                prev
                                  ? { ...prev, is_json_response: !!checked }
                                  : null
                              )
                            }
                            disabled={!editingTemplate}
                          />
                          <Label
                            htmlFor="json-response"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            JSON Response Expected
                          </Label>
                        </div>
                      </div>

                      {(editingTemplate?.is_json_response ||
                        selectedTemplate.is_json_response) && (
                        <div>
                          <Label>JSON Schema</Label>
                          <Textarea
                            value={
                              editingTemplate?.json_schema
                                ? typeof editingTemplate.json_schema ===
                                  "string"
                                  ? editingTemplate.json_schema
                                  : JSON.stringify(
                                      editingTemplate.json_schema,
                                      null,
                                      2
                                    )
                                : selectedTemplate.json_schema
                                ? typeof selectedTemplate.json_schema ===
                                  "string"
                                  ? selectedTemplate.json_schema
                                  : JSON.stringify(
                                      selectedTemplate.json_schema,
                                      null,
                                      2
                                    )
                                : ""
                            }
                            onChange={(e) =>
                              setEditingTemplate((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      json_schema: e.target.value,
                                    }
                                  : null
                              )
                            }
                            disabled={!editingTemplate}
                            rows={10}
                            className="bg-terminal-bg border-terminal-cyan/30 font-mono text-xs"
                            placeholder='{"type": "object", "properties": {...}}'
                          />
                        </div>
                      )}

                      {editingTemplate && (
                        <div>
                          <Label>Change Notes (Optional)</Label>
                          <Input
                            value={changeNotes}
                            onChange={(e) => setChangeNotes(e.target.value)}
                            className="bg-terminal-bg border-terminal-cyan/30"
                            placeholder="What changed in this version?"
                          />
                        </div>
                      )}

                      <div>
                        <Label>Variables Detected</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(() => {
                            const templateText =
                              editingTemplate?.template_text ||
                              selectedTemplate.template_text;
                            const variableMatches =
                              templateText.match(/{{(\w+)}}/g) || [];
                            const detectedVars = [
                              ...new Set(
                                variableMatches.map((m: string) =>
                                  m.slice(2, -2)
                                )
                              ),
                            ];
                            return detectedVars.map((variable: string) => (
                              <Badge
                                key={variable}
                                variant="outline"
                                className="font-mono"
                              >
                                {variable}
                              </Badge>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-terminal-green font-mono text-sm">
                        Preview with Test Data
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={resetToInitialState}
                          variant="outline"
                          className="border-terminal-yellow text-terminal-yellow hover:bg-terminal-yellow hover:text-terminal-bg"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          <span>Reset</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={clearAllValues}
                          variant="outline"
                          className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
                        >
                          <X className="w-4 h-4 mr-1" />
                          <span>Clear All</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleRunPrompt}
                          variant="outline"
                          disabled={isRunning}
                          className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          <span>{isRunning ? "Running..." : "Run Prompt"}</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Model Override (for testing)</Label>
                        <SearchableSelect
                          value={previewModel || "template-default"}
                          onValueChange={(value) =>
                            setPreviewModel(
                              value === "template-default" ? null : value
                            )
                          }
                          options={
                            availableModels.length > 0
                              ? availableModels.map((model) => ({
                                  value: model.id,
                                  label: model.name,
                                }))
                              : []
                          }
                          defaultOption={{
                            value: "template-default",
                            label: `Use template default (${
                              selectedTemplate.llm_model || "system default"
                            })`,
                          }}
                          placeholder="Select a model"
                          className="bg-terminal-bg border-terminal-cyan/30"
                        />
                      </div>

                      <div>
                        <Label>Temperature Override (for testing)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={previewTemperature ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPreviewTemperature(
                              value === "" ? null : parseFloat(value) || 0.2
                            );
                          }}
                          className="bg-terminal-bg border-terminal-cyan/30"
                          placeholder={`Template default: ${
                            selectedTemplate.default_temperature ?? 0.2
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(Array.isArray(selectedTemplate.variables)
                        ? selectedTemplate.variables
                        : []
                      ).map((variable: string) => (
                        <div key={variable} className="text-left">
                          <Label className="text-terminal-text-muted text-xs">
                            {variable}
                          </Label>
                          <Input
                            value={previewVariables[variable] || ""}
                            onChange={(e) =>
                              setPreviewVariables((prev) => ({
                                ...prev,
                                [variable]: e.target.value,
                              }))
                            }
                            className="bg-terminal-bg border-terminal-cyan/30"
                            placeholder={`Enter value for ${variable}`}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Additional Messages Section */}
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between">
                        <Label className="text-terminal-green font-mono text-sm">
                          Additional Messages
                          {additionalMessages.length > 0 && (
                            <span className="text-terminal-text-muted text-xs ml-2">
                              ({additionalMessages.length} message
                              {additionalMessages.length !== 1 ? "s" : ""})
                            </span>
                          )}
                        </Label>
                        <Button
                          type="button"
                          size="sm"
                          onClick={addAdditionalMessage}
                          variant="outline"
                          className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Message
                        </Button>
                      </div>

                      {additionalMessages.length > 0 && (
                        <div className="space-y-3">
                          {additionalMessages.map((message, index) => (
                            <div
                              key={message.id}
                              className="p-4 border border-terminal-cyan/30 rounded space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Label className="text-terminal-text-muted text-xs">
                                    Message {index + 1}
                                  </Label>
                                  <Select
                                    value={message.role}
                                    onValueChange={(
                                      value: "user" | "assistant"
                                    ) =>
                                      updateAdditionalMessage(
                                        message.id,
                                        "role",
                                        value
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-32 h-8 bg-terminal-bg border-terminal-cyan/30">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-terminal-bg border-terminal-cyan/30">
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="assistant">
                                        Assistant
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    removeAdditionalMessage(message.id)
                                  }
                                  className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <Textarea
                                value={message.content}
                                onChange={(e) =>
                                  updateAdditionalMessage(
                                    message.id,
                                    "content",
                                    e.target.value
                                  )
                                }
                                placeholder={`Enter ${message.role} message content...`}
                                className="bg-terminal-bg border-terminal-cyan/30 min-h-[80px] resize-y"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {additionalMessages.length === 0 && (
                        <div className="text-terminal-text-muted text-sm text-center py-4 border border-dashed border-terminal-cyan/30 rounded">
                          No additional messages. Click "Add Message" to include
                          extra context, or run a prompt to automatically add
                          the response.
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Rendered Preview</Label>
                        <div className="bg-terminal-bg p-4 rounded border border-terminal-cyan/30 mt-2">
                          <div className="space-y-4">
                            <div>
                              <div className="text-terminal-yellow text-xs mb-2 font-mono">
                                SYSTEM MESSAGE:
                              </div>
                              <pre className="text-terminal-text text-sm whitespace-pre-wrap font-mono text-left">
                                {renderPreview()}
                              </pre>
                            </div>

                            {additionalMessages.length > 0 && (
                              <div className="space-y-3">
                                <div className="text-terminal-yellow text-xs font-mono border-t border-terminal-cyan/30 pt-3">
                                  ADDITIONAL MESSAGES:
                                </div>
                                {additionalMessages.map((message, index) => (
                                  <div
                                    key={message.id}
                                    className="border-l-2 border-terminal-cyan/50 pl-3"
                                  >
                                    <div className="text-terminal-green text-xs mb-1 font-mono uppercase">
                                      {message.role}:
                                    </div>
                                    <pre className="text-terminal-text text-sm whitespace-pre-wrap font-mono text-left">
                                      {message.content ||
                                        `[Empty ${message.role} message]`}
                                    </pre>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {runResult !== null && (
                        <div>
                          <Label>Run Result</Label>
                          <div
                            className={`p-4 rounded border mt-2 ${
                              runResult.startsWith("Error:")
                                ? "bg-red-950/20 border-red-500/30"
                                : "bg-terminal-green/10 border-terminal-green/30"
                            }`}
                          >
                            <pre className="text-terminal-text text-sm whitespace-pre-wrap font-mono text-left">
                              {runResult}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    <h3 className="text-terminal-green font-mono text-sm">
                      Version History
                    </h3>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {versions.map((version) => (
                        <div
                          key={version.id}
                          className="p-3 rounded border border-terminal-cyan/30 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge variant="outline">
                                Version {version.version}
                              </Badge>
                              <span className="text-terminal-text-muted text-xs ml-2">
                                {new Date(version.created_at).toLocaleString()}
                              </span>
                            </div>
                            {version.version !== selectedTemplate.version && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreVersion(version)}
                                disabled={restoreVersionMutation.isPending}
                              >
                                <History className="w-4 h-4 mr-1" />
                                Restore
                              </Button>
                            )}
                          </div>
                          {version.change_notes && (
                            <p className="text-terminal-text text-sm">
                              {version.change_notes}
                            </p>
                          )}
                          <details className="cursor-pointer">
                            <summary className="text-terminal-yellow text-xs">
                              View template
                            </summary>
                            <pre className="text-terminal-text-muted text-xs mt-2 p-2 bg-terminal-bg rounded overflow-x-auto">
                              {version.template_text}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-terminal-text-muted">
                  Select a template to edit
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-terminal-bg border-terminal-cyan/30">
          <DialogHeader>
            <DialogTitle className="text-terminal-cyan font-mono">
              Import Prompt Templates
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-file">Select JSON File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="bg-terminal-bg border-terminal-cyan/30"
              />
              {importFile && (
                <p className="text-sm text-terminal-text-muted mt-1">
                  Selected: {importFile.name} (
                  {Math.round(importFile.size / 1024)}KB)
                </p>
              )}
            </div>

            <div>
              <Label>Conflict Resolution Strategy</Label>
              <SearchableSelect
                value={conflictStrategy}
                onValueChange={(value) =>
                  setConflictStrategy(value as "skip" | "overwrite" | "rename")
                }
                options={[
                  {
                    value: "skip",
                    label: "Skip - Ignore templates that already exist",
                  },
                  {
                    value: "rename",
                    label: "Rename - Add suffix to imported templates",
                  },
                  {
                    value: "overwrite",
                    label: "Overwrite - Replace existing templates",
                  },
                ]}
                className="bg-terminal-bg border-terminal-cyan/30"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(false)}
                className="border-terminal-cyan/30"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportSubmit}
                disabled={!importFile || importTemplateMutation.isPending}
                className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan"
              >
                {importTemplateMutation.isPending ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
