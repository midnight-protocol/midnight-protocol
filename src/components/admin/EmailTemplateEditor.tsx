import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Send,
  Plus,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Mail,
  Eye,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subject_template: string;
  html_template: string;
  text_template: string | null;
  variables: any; // Will be cast to string[] when used
  version: number;
  default_from_address: string | null;
  email_type: string;
  template_category: string;
  created_at: string;
  updated_at: string;
  change_notes: string | null;
}

interface EmailVersion {
  id: string;
  version: number;
  subject_template: string;
  html_template: string;
  text_template: string | null;
  variables: string[];
  default_from_address: string | null;
  email_type: string;
  category: string;
  change_notes: string | null;
  created_at: string;
  is_current: boolean;
}

interface TestEmailFormData {
  testEmail: string;
  variables: Record<string, string>;
}

const EmailTemplateEditor = () => {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] =
    useState<Partial<EmailTemplate> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<EmailVersion | null>(
    null
  );
  const [testEmailData, setTestEmailData] = useState<TestEmailFormData>({
    testEmail: "",
    variables: {},
  });
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState("");
  const [importStrategy, setImportStrategy] = useState<
    "skip" | "overwrite" | "create_new"
  >("skip");
  const [previewMode, setPreviewMode] = useState<"subject" | "html" | "text">(
    "html"
  );
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewVariables, setPreviewVariables] = useState<
    Record<string, string>
  >({});

  // Queries
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["emailTemplates"],
    queryFn: () => adminAPIService.getEmailTemplates(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["emailCategories"],
    queryFn: () => adminAPIService.getEmailCategories(),
  });

  const { data: templateDetails } = useQuery({
    queryKey: ["emailTemplate", selectedTemplate?.id],
    queryFn: () => adminAPIService.getEmailTemplate(selectedTemplate!.id),
    enabled: !!selectedTemplate?.id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => adminAPIService.createEmailTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      setIsCreating(false);
      setEditingTemplate(null);
      toast.success("Email template created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create email template");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminAPIService.updateEmailTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      queryClient.invalidateQueries({
        queryKey: ["emailTemplate", selectedTemplate?.id],
      });
      setEditingTemplate(null);
      toast.success("Email template updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update email template");
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: ({
      templateId,
      testEmail,
      variables,
    }: {
      templateId: string;
      testEmail: string;
      variables: Record<string, any>;
    }) => adminAPIService.sendTestEmail(templateId, testEmail, variables),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          `Test email sent successfully! Message ID: ${result.messageId}`
        );
      } else {
        toast.error(`Failed to send test email: ${result.error}`);
      }
      setShowTestDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send test email");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({
      templateId,
      versionId,
      changeNotes,
    }: {
      templateId: string;
      versionId: string;
      changeNotes: string;
    }) =>
      adminAPIService.restoreEmailVersion(templateId, versionId, changeNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      queryClient.invalidateQueries({
        queryKey: ["emailTemplate", selectedTemplate?.id],
      });
      toast.success("Version restored successfully");
      setSelectedVersion(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to restore version");
    },
  });

  const exportMutation = useMutation({
    mutationFn: (templateIds?: string[]) =>
      adminAPIService.exportEmailTemplates(templateIds),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `email-templates-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Email templates exported successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to export email templates");
    },
  });

  const importMutation = useMutation({
    mutationFn: ({
      data,
      strategy,
    }: {
      data: any;
      strategy: "skip" | "overwrite" | "create_new";
    }) => adminAPIService.importEmailTemplates(data, strategy),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      toast.success(
        `Import completed: ${result.imported} imported, ${
          result.skipped
        } skipped${
          result.errors.length > 0 ? `, ${result.errors.length} errors` : ""
        }`
      );
      if (result.errors.length > 0) {
        console.error("Import errors:", result.errors);
      }
      setShowImportDialog(false);
      setImportData("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to import email templates");
    },
  });

  // Helper functions
  const extractVariables = (text: string): string[] => {
    const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  };

  const getAllVariables = (template: Partial<EmailTemplate>): string[] => {
    const subjectVars = template.subject_template
      ? extractVariables(template.subject_template)
      : [];
    const htmlVars = template.html_template
      ? extractVariables(template.html_template)
      : [];
    const textVars = template.text_template
      ? extractVariables(template.text_template)
      : [];
    return [...new Set([...subjectVars, ...htmlVars, ...textVars])];
  };

  const processPreview = (
    template: string,
    variables: Record<string, string>
  ): string => {
    let processed = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      processed = processed.replace(regex, value || `{{${key}}}`);
    });
    return processed;
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingTemplate({
      name: "",
      description: "",
      category: "general",
      subject_template: "",
      html_template: "",
      text_template: "",
      default_from_address: "",
      email_type: "transactional",
      template_category: "general",
      change_notes: "Initial version",
    });
    setSelectedTemplate(null);
    setShowHistory(false);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate({ ...template });
    setIsCreating(false);
  };

  const handleSave = () => {
    if (
      !editingTemplate ||
      !editingTemplate.name ||
      !editingTemplate.subject_template ||
      !editingTemplate.html_template
    ) {
      toast.error(
        "Please fill in required fields: name, subject template, and HTML template"
      );
      return;
    }

    if (isCreating) {
      createMutation.mutate(editingTemplate);
    } else if (selectedTemplate) {
      updateMutation.mutate({
        id: selectedTemplate.id,
        data: editingTemplate,
      });
    }
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditingTemplate(null);
    setIsCreating(false);
    setShowHistory(false);
  };

  const handleTestEmail = () => {
    if (!selectedTemplate) return;

    const allVariables = getAllVariables(selectedTemplate);
    const variables: Record<string, string> = {};
    allVariables.forEach((variable) => {
      variables[variable] =
        testEmailData.variables[variable] || `[${variable}]`;
    });

    setTestEmailData({ ...testEmailData, variables });
    setShowTestDialog(true);
  };

  const handleSendTestEmail = () => {
    if (!selectedTemplate || !testEmailData.testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    testEmailMutation.mutate({
      templateId: selectedTemplate.id,
      testEmail: testEmailData.testEmail,
      variables: testEmailData.variables,
    });
  };

  const handleRestoreVersion = (version: EmailVersion) => {
    if (!selectedTemplate) return;

    const changeNotes = prompt("Enter change notes for this restoration:");
    if (changeNotes === null) return;

    restoreMutation.mutate({
      templateId: selectedTemplate.id,
      versionId: version.id,
      changeNotes: changeNotes || `Restored from version ${version.version}`,
    });
  };

  const handleExport = (templateIds?: string[]) => {
    exportMutation.mutate(templateIds);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importData);
      importMutation.mutate({ data, strategy: importStrategy });
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  };

  const handlePreview = () => {
    if (!selectedTemplate) return;

    // Initialize preview variables with defaults
    const allVariables = getAllVariables(selectedTemplate);
    const defaultVariables: Record<string, string> = {};
    allVariables.forEach((variable) => {
      defaultVariables[variable] = `[${variable}]`;
    });

    setPreviewVariables(defaultVariables);
    setShowPreviewDialog(true);
  };

  const emailTypes = [
    "transactional",
    "marketing",
    "notification",
    "system",
    "welcome",
    "reminder",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-terminal-green">
          Email Templates
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={handleCreateNew}
            className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
          <Button
            onClick={() => handleExport()}
            variant="outline"
            className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <Card className="bg-terminal-bg border-terminal-green/30">
          <CardHeader>
            <CardTitle className="text-terminal-green flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Templates ({templates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {templatesLoading ? (
              <div className="text-terminal-text-muted">
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-terminal-text-muted">
                No email templates found
              </div>
            ) : (
              templates.map((template: EmailTemplate) => (
                <div
                  key={template.id}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? "border-terminal-green bg-terminal-green/10"
                      : "border-terminal-green/20 hover:border-terminal-green/40"
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="font-mono text-sm text-terminal-green">
                    {template.name}
                  </div>
                  <div className="text-xs text-terminal-text-muted mt-1">
                    {template.description || "No description"}
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">
                      v{template.version}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {template.email_type}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Editor/Preview */}
        <Card className="lg:col-span-2 bg-terminal-bg border-terminal-green/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-terminal-green">
                {isCreating
                  ? "Create New Template"
                  : editingTemplate
                  ? `Edit: ${editingTemplate.name}`
                  : selectedTemplate
                  ? `Template: ${selectedTemplate.name}`
                  : "Select a template"}
              </CardTitle>
              <div className="flex gap-2">
                {selectedTemplate && !editingTemplate && (
                  <>
                    <Button
                      onClick={() => handleEdit(selectedTemplate)}
                      size="sm"
                      variant="outline"
                      className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={handleTestEmail}
                      size="sm"
                      variant="outline"
                      className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      onClick={() => setShowHistory(!showHistory)}
                      size="sm"
                      variant="outline"
                      className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
                    >
                      <History className="w-4 h-4 mr-1" />
                      History
                    </Button>
                    <Button
                      onClick={() => handleExport([selectedTemplate.id])}
                      size="sm"
                      variant="outline"
                      className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {editingTemplate && (
                  <>
                    <Button
                      onClick={handleSave}
                      size="sm"
                      className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
                      disabled={
                        createMutation.isPending || updateMutation.isPending
                      }
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      onClick={handleCancel}
                      size="sm"
                      variant="outline"
                      className="border-red-400 text-red-400 hover:bg-red-400/10"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editingTemplate ? (
              <div className="space-y-4">
                {/* Template Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={editingTemplate.name || ""}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          name: e.target.value,
                        })
                      }
                      className="bg-terminal-bg border-terminal-green/30 text-terminal-text"
                      placeholder="e.g., Welcome Email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <SearchableSelect
                      value={editingTemplate.category || ""}
                      onValueChange={(value) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          category: value,
                        })
                      }
                      options={categories.map((cat: string) => ({
                        value: cat,
                        label: cat,
                      }))}
                      placeholder="Select category"
                      className="bg-terminal-bg border-terminal-green/30"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={editingTemplate.description || ""}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        description: e.target.value,
                      })
                    }
                    className="bg-terminal-bg border-terminal-green/30 text-terminal-text"
                    placeholder="Template description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email_type">Email Type</Label>
                    <Select
                      value={editingTemplate.email_type || "transactional"}
                      onValueChange={(value) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          email_type: value,
                        })
                      }
                    >
                      <SelectTrigger className="bg-terminal-bg border-terminal-green/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="default_from_address">
                      Default From Address
                    </Label>
                    <Input
                      id="default_from_address"
                      value={editingTemplate.default_from_address || ""}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          default_from_address: e.target.value,
                        })
                      }
                      className="bg-terminal-bg border-terminal-green/30 text-terminal-text"
                      placeholder="noreply@midnightprotocol.org"
                    />
                  </div>
                </div>

                {/* Template Content */}
                <Tabs defaultValue="subject" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="subject">Subject</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="text">Text (Optional)</TabsTrigger>
                  </TabsList>

                  <TabsContent value="subject" className="space-y-2">
                    <Label htmlFor="subject_template">Subject Template *</Label>
                    <Input
                      id="subject_template"
                      value={editingTemplate.subject_template || ""}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          subject_template: e.target.value,
                        })
                      }
                      className="bg-terminal-bg border-terminal-green/30 text-terminal-text text-left"
                      placeholder="Welcome to {{company_name}}, {{name}}!"
                    />
                  </TabsContent>

                  <TabsContent value="html" className="space-y-2">
                    <Label htmlFor="html_template">HTML Template *</Label>
                    <Textarea
                      id="html_template"
                      value={editingTemplate.html_template || ""}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          html_template: e.target.value,
                        })
                      }
                      className="bg-terminal-bg border-terminal-green/30 text-terminal-text font-mono text-sm min-h-[300px]"
                      placeholder="<h1>Hello {{name}}!</h1><p>Welcome to our platform.</p>"
                    />
                  </TabsContent>

                  <TabsContent value="text" className="space-y-2">
                    <Label htmlFor="text_template">
                      Plain Text Template (Optional)
                    </Label>
                    <Textarea
                      id="text_template"
                      value={editingTemplate.text_template || ""}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          text_template: e.target.value,
                        })
                      }
                      className="bg-terminal-bg border-terminal-green/30 text-terminal-text font-mono text-sm min-h-[200px]"
                      placeholder="Hello {{name}}! Welcome to our platform."
                    />
                  </TabsContent>
                </Tabs>

                {/* Variables Preview */}
                {editingTemplate && (
                  <div>
                    <Label>Detected Variables</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getAllVariables(editingTemplate).map((variable) => (
                        <Badge
                          key={variable}
                          variant="outline"
                          className="text-xs"
                        >
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="change_notes">Change Notes</Label>
                  <Input
                    id="change_notes"
                    value={editingTemplate.change_notes || ""}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        change_notes: e.target.value,
                      })
                    }
                    className="bg-terminal-bg border-terminal-green/30 text-terminal-text"
                    placeholder="Describe your changes..."
                  />
                </div>
              </div>
            ) : selectedTemplate ? (
              <div className="space-y-4">
                {/* Template Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-terminal-green/5 rounded">
                  <div>
                    <strong>Category:</strong> {selectedTemplate.category}
                  </div>
                  <div>
                    <strong>Email Type:</strong> {selectedTemplate.email_type}
                  </div>
                  <div>
                    <strong>Version:</strong> {selectedTemplate.version}
                  </div>
                  <div>
                    <strong>From:</strong>{" "}
                    {selectedTemplate.default_from_address || "Default"}
                  </div>
                </div>

                {/* Template Preview */}
                <Tabs
                  value={previewMode}
                  onValueChange={(value: any) => setPreviewMode(value)}
                >
                  <div className="flex items-center justify-between">
                    <TabsList>
                      <TabsTrigger value="subject">Subject</TabsTrigger>
                      <TabsTrigger value="html">HTML</TabsTrigger>
                      {selectedTemplate.text_template && (
                        <TabsTrigger value="text">Text</TabsTrigger>
                      )}
                    </TabsList>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePreview}
                      className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </div>

                  <TabsContent value="subject">
                    <div className="p-3 bg-terminal-green/5 rounded font-mono text-sm text-left">
                      {selectedTemplate.subject_template}
                    </div>
                  </TabsContent>

                  <TabsContent value="html">
                    <div className="p-3 bg-terminal-green/5 rounded font-mono text-sm max-h-96 overflow-y-auto text-left">
                      <pre className="whitespace-pre-wrap">
                        {selectedTemplate.html_template}
                      </pre>
                    </div>
                  </TabsContent>

                  {selectedTemplate.text_template && (
                    <TabsContent value="text">
                      <div className="p-3 bg-terminal-green/5 rounded font-mono text-sm max-h-96 overflow-y-auto text-left">
                        <pre className="whitespace-pre-wrap">
                          {selectedTemplate.text_template}
                        </pre>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>

                {/* Variables */}
                <div>
                  <Label>Template Variables</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(selectedTemplate.variables as string[])?.map(
                      (variable) => (
                        <Badge
                          key={variable}
                          variant="outline"
                          className="text-xs"
                        >
                          {`{{${variable}}}`}
                        </Badge>
                      )
                    ) || []}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-terminal-text-muted py-12">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a template to view or edit, or create a new one</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Version History */}
        {showHistory && selectedTemplate && templateDetails && (
          <Card className="lg:col-span-3 bg-terminal-bg border-terminal-green/30">
            <CardHeader>
              <CardTitle className="text-terminal-green flex items-center">
                <History className="w-5 h-5 mr-2" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templateDetails.versions?.map((version: EmailVersion) => (
                  <div
                    key={version.id}
                    className={`p-3 rounded border ${
                      version.is_current
                        ? "border-terminal-green bg-terminal-green/10"
                        : "border-terminal-green/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={version.is_current ? "default" : "outline"}
                          >
                            Version {version.version}
                          </Badge>
                          {version.is_current && (
                            <Badge className="bg-terminal-green text-terminal-bg">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-terminal-text-muted mt-1">
                          {version.change_notes || "No change notes"}
                        </div>
                        <div className="text-xs text-terminal-text-muted">
                          {new Date(version.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!version.is_current && (
                        <Button
                          onClick={() => handleRestoreVersion(version)}
                          size="sm"
                          variant="outline"
                          className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
                          disabled={restoreMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Test Email Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="bg-terminal-bg border-terminal-green/30">
          <DialogHeader>
            <DialogTitle className="text-terminal-green">
              Send Test Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmailData.testEmail}
                onChange={(e) =>
                  setTestEmailData({
                    ...testEmailData,
                    testEmail: e.target.value,
                  })
                }
                className="bg-terminal-bg border-terminal-green/30 text-terminal-text"
                placeholder="test@example.com"
              />
            </div>

            {/* Variable Inputs */}
            {selectedTemplate &&
              getAllVariables(selectedTemplate).length > 0 && (
                <div>
                  <Label>Template Variables</Label>
                  <div className="space-y-2 mt-2">
                    {getAllVariables(selectedTemplate).map((variable) => (
                      <div key={variable}>
                        <Label htmlFor={`var-${variable}`} className="text-sm">
                          {variable}
                        </Label>
                        <Input
                          id={`var-${variable}`}
                          value={testEmailData.variables[variable] || ""}
                          onChange={(e) =>
                            setTestEmailData({
                              ...testEmailData,
                              variables: {
                                ...testEmailData.variables,
                                [variable]: e.target.value,
                              },
                            })
                          }
                          className="bg-terminal-bg border-terminal-green/30 text-terminal-text text-sm"
                          placeholder={`Value for {{${variable}}}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex gap-2 justify-end">
              <DialogClose asChild>
                <Button variant="outline" className="border-terminal-green/30">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleSendTestEmail}
                className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
                disabled={
                  testEmailMutation.isPending || !testEmailData.testEmail
                }
              >
                <Send className="w-4 h-4 mr-2" />
                Send Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="bg-terminal-bg border-terminal-green/30 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-terminal-green">
              Email Preview: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Variable Inputs */}
              {getAllVariables(selectedTemplate).length > 0 && (
                <div>
                  <Label className="text-terminal-green font-mono text-sm">
                    Template Variables
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {getAllVariables(selectedTemplate).map((variable) => (
                      <div key={variable}>
                        <Label
                          htmlFor={`preview-${variable}`}
                          className="text-sm"
                        >
                          {variable}
                        </Label>
                        <Input
                          id={`preview-${variable}`}
                          value={previewVariables[variable] || ""}
                          onChange={(e) =>
                            setPreviewVariables({
                              ...previewVariables,
                              [variable]: e.target.value,
                            })
                          }
                          className="bg-terminal-bg border-terminal-green/30 text-terminal-text"
                          placeholder={`Value for {{${variable}}}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Tabs */}
              <Tabs defaultValue="subject" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="subject">Subject Preview</TabsTrigger>
                  <TabsTrigger value="html">HTML Preview</TabsTrigger>
                  {selectedTemplate.text_template && (
                    <TabsTrigger value="text">Text Preview</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="subject" className="space-y-4">
                  <div>
                    <Label>Raw Subject Template</Label>
                    <div className="p-3 bg-terminal-green/5 rounded font-mono text-sm border border-terminal-green/20">
                      {selectedTemplate.subject_template}
                    </div>
                  </div>
                  <div>
                    <Label>Processed Subject</Label>
                    <div className="p-3 bg-terminal-bg border border-terminal-green/30 rounded font-mono text-sm">
                      {processPreview(
                        selectedTemplate.subject_template,
                        previewVariables
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="html" className="space-y-4">
                  <div>
                    <Label>Raw HTML Template</Label>
                    <div className="p-3 bg-terminal-green/5 rounded font-mono text-sm border border-terminal-green/20 max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">
                        {selectedTemplate.html_template}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <Label>Processed HTML</Label>
                    <div className="p-3 bg-terminal-bg border border-terminal-green/30 rounded max-h-64 overflow-y-auto">
                      <div
                        className="prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: processPreview(
                            selectedTemplate.html_template,
                            previewVariables
                          ),
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>HTML Source (Processed)</Label>
                    <div className="p-3 bg-terminal-green/5 rounded font-mono text-xs border border-terminal-green/20 max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">
                        {processPreview(
                          selectedTemplate.html_template,
                          previewVariables
                        )}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                {selectedTemplate.text_template && (
                  <TabsContent value="text" className="space-y-4">
                    <div>
                      <Label>Raw Text Template</Label>
                      <div className="p-3 bg-terminal-green/5 rounded font-mono text-sm border border-terminal-green/20 max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">
                          {selectedTemplate.text_template}
                        </pre>
                      </div>
                    </div>
                    <div>
                      <Label>Processed Text</Label>
                      <div className="p-3 bg-terminal-bg border border-terminal-green/30 rounded font-mono text-sm max-h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">
                          {processPreview(
                            selectedTemplate.text_template,
                            previewVariables
                          )}
                        </pre>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>

              {/* Template Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-terminal-green/5 rounded border border-terminal-green/20">
                <div>
                  <strong className="text-terminal-green">From:</strong>{" "}
                  {selectedTemplate.default_from_address ||
                    "Default system address"}
                </div>
                <div>
                  <strong className="text-terminal-green">Type:</strong>{" "}
                  {selectedTemplate.email_type}
                </div>
                <div>
                  <strong className="text-terminal-green">Category:</strong>{" "}
                  {selectedTemplate.category}
                </div>
                <div>
                  <strong className="text-terminal-green">Version:</strong> v
                  {selectedTemplate.version}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    className="border-terminal-green/30"
                  >
                    Close
                  </Button>
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-terminal-bg border-terminal-green/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-terminal-green">
              Import Email Templates
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="importStrategy">Import Strategy</Label>
              <Select
                value={importStrategy}
                onValueChange={(value: any) => setImportStrategy(value)}
              >
                <SelectTrigger className="bg-terminal-bg border-terminal-green/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip existing templates</SelectItem>
                  <SelectItem value="overwrite">
                    Overwrite existing templates
                  </SelectItem>
                  <SelectItem value="create_new">
                    Create new templates with modified names
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="importData">Template Data (JSON)</Label>
              <Textarea
                id="importData"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="bg-terminal-bg border-terminal-green/30 text-terminal-text font-mono text-sm min-h-[300px]"
                placeholder="Paste exported email template JSON here..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <DialogClose asChild>
                <Button variant="outline" className="border-terminal-green/30">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleImport}
                className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
                disabled={importMutation.isPending || !importData.trim()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplateEditor;
