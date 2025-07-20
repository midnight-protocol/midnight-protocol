import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { AdminUser } from "../../_shared/types.ts";
import { EmailService } from "../../_shared/email-service.ts";

export async function getEmailTemplates(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) {
  const { data, error } = await supabase
    .from("email_templates")
    .select(
      `
      id,
      name,
      description,
      category,
      created_at,
      updated_at,
      email_template_versions!inner (
        id,
        version,
        subject_template,
        html_template,
        text_template,
        variables,
        default_from_address,
        email_type,
        category,
        created_at,
        change_notes
      )
    `
    )
    .eq("email_template_versions.is_current", true)
    .order("name");

  if (error) throw error;

  // Flatten the structure for backward compatibility
  const flattenedData = (data || []).map((template) => {
    const version = template.email_template_versions[0];
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      subject_template: version.subject_template,
      html_template: version.html_template,
      text_template: version.text_template,
      variables: version.variables,
      version: version.version,
      default_from_address: version.default_from_address,
      email_type: version.email_type,
      template_category: version.category,
      created_at: template.created_at,
      updated_at: template.updated_at,
      change_notes: version.change_notes,
    };
  });

  return flattenedData;
}

export async function getEmailTemplate(
  supabase: SupabaseClient,
  params: { templateId: string },
  user?: AdminUser
) {
  const { templateId } = params;

  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (templateError) throw templateError;

  const { data: versions, error: versionsError } = await supabase
    .from("email_template_versions")
    .select("*")
    .eq("email_template_id", templateId)
    .order("version", { ascending: false });

  if (versionsError) throw versionsError;

  const currentVersion = versions.find((v) => v.is_current);
  if (!currentVersion) {
    throw new Error("No current version found for template");
  }

  return {
    ...template,
    ...currentVersion,
    versions: versions || [],
  };
}

export async function createEmailTemplate(
  supabase: SupabaseClient,
  params: {
    name: string;
    description?: string;
    category?: string;
    subject_template: string;
    html_template: string;
    text_template?: string;
    default_from_address?: string;
    email_type?: string;
    template_category?: string;
    change_notes?: string;
  },
  user?: AdminUser
) {
  const {
    name,
    description,
    category = "general",
    subject_template,
    html_template,
    text_template,
    default_from_address,
    email_type = "transactional",
    template_category = "general",
    change_notes = "Initial version",
  } = params;

  // Extract variables from templates
  const subjectVariables = extractVariables(subject_template);
  const htmlVariables = extractVariables(html_template);
  const textVariables = text_template ? extractVariables(text_template) : [];
  
  // Combine and deduplicate variables
  const allVariables = [
    ...new Set([...subjectVariables, ...htmlVariables, ...textVariables])
  ];

  // Start a transaction
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .insert({
      name,
      description,
      category,
      created_by: user?.id,
    })
    .select()
    .single();

  if (templateError) throw templateError;

  // Create the initial version
  const { data: version, error: versionError } = await supabase
    .from("email_template_versions")
    .insert({
      email_template_id: template.id,
      version: 1,
      subject_template,
      html_template,
      text_template,
      variables: allVariables,
      default_from_address,
      email_type,
      category: template_category,
      change_notes,
      created_by: user?.id,
      is_current: true,
    })
    .select()
    .single();

  if (versionError) throw versionError;

  // Return flattened structure
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    subject_template: version.subject_template,
    html_template: version.html_template,
    text_template: version.text_template,
    variables: version.variables,
    version: version.version,
    default_from_address: version.default_from_address,
    email_type: version.email_type,
    template_category: version.category,
    created_at: template.created_at,
    updated_at: template.updated_at,
    change_notes: version.change_notes,
  };
}

export async function updateEmailTemplate(
  supabase: SupabaseClient,
  params: {
    templateId: string;
    name?: string;
    description?: string;
    category?: string;
    subject_template?: string;
    html_template?: string;
    text_template?: string;
    default_from_address?: string;
    email_type?: string;
    template_category?: string;
    change_notes?: string;
  },
  user?: AdminUser
) {
  const { templateId, change_notes = "Updated template", ...updates } = params;

  // Get current version to increment version number
  const { data: currentVersion, error: currentError } = await supabase
    .from("email_template_versions")
    .select("version, subject_template, html_template, text_template, default_from_address, email_type, category")
    .eq("email_template_id", templateId)
    .eq("is_current", true)
    .single();

  if (currentError) throw currentError;

  // Prepare the version data with current values as defaults
  const versionData = {
    subject_template: updates.subject_template || currentVersion.subject_template,
    html_template: updates.html_template || currentVersion.html_template,
    text_template: updates.text_template !== undefined ? updates.text_template : currentVersion.text_template,
    default_from_address: updates.default_from_address !== undefined ? updates.default_from_address : currentVersion.default_from_address,
    email_type: updates.email_type || currentVersion.email_type,
    template_category: updates.template_category || currentVersion.category,
  };

  // Extract variables from templates
  const subjectVariables = extractVariables(versionData.subject_template);
  const htmlVariables = extractVariables(versionData.html_template);
  const textVariables = versionData.text_template ? extractVariables(versionData.text_template) : [];
  
  // Combine and deduplicate variables
  const allVariables = [
    ...new Set([...subjectVariables, ...htmlVariables, ...textVariables])
  ];

  // Update template metadata if provided
  const templateUpdates: any = {};
  if (updates.name) templateUpdates.name = updates.name;
  if (updates.description !== undefined) templateUpdates.description = updates.description;
  if (updates.category) templateUpdates.category = updates.category;
  
  if (Object.keys(templateUpdates).length > 0) {
    templateUpdates.updated_at = new Date().toISOString();
    const { error: templateError } = await supabase
      .from("email_templates")
      .update(templateUpdates)
      .eq("id", templateId);

    if (templateError) throw templateError;
  }

  // Mark current version as not current
  const { error: markError } = await supabase
    .from("email_template_versions")
    .update({ is_current: false })
    .eq("email_template_id", templateId)
    .eq("is_current", true);

  if (markError) throw markError;

  // Create new version
  const { data: newVersion, error: versionError } = await supabase
    .from("email_template_versions")
    .insert({
      email_template_id: templateId,
      version: currentVersion.version + 1,
      subject_template: versionData.subject_template,
      html_template: versionData.html_template,
      text_template: versionData.text_template,
      variables: allVariables,
      default_from_address: versionData.default_from_address,
      email_type: versionData.email_type,
      category: versionData.template_category,
      change_notes,
      created_by: user?.id,
      is_current: true,
    })
    .select()
    .single();

  if (versionError) throw versionError;

  // Get updated template metadata
  const { data: updatedTemplate, error: getError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (getError) throw getError;

  // Return flattened structure
  return {
    id: updatedTemplate.id,
    name: updatedTemplate.name,
    description: updatedTemplate.description,
    category: updatedTemplate.category,
    subject_template: newVersion.subject_template,
    html_template: newVersion.html_template,
    text_template: newVersion.text_template,
    variables: newVersion.variables,
    version: newVersion.version,
    default_from_address: newVersion.default_from_address,
    email_type: newVersion.email_type,
    template_category: newVersion.category,
    created_at: updatedTemplate.created_at,
    updated_at: updatedTemplate.updated_at,
    change_notes: newVersion.change_notes,
  };
}

export async function getEmailVersions(
  supabase: SupabaseClient,
  params: { templateId: string },
  user?: AdminUser
) {
  const { templateId } = params;

  const { data, error } = await supabase
    .from("email_template_versions")
    .select("*")
    .eq("email_template_id", templateId)
    .order("version", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function restoreEmailVersion(
  supabase: SupabaseClient,
  params: { templateId: string; versionId: string; change_notes?: string },
  user?: AdminUser
) {
  const { templateId, versionId, change_notes = "Restored from previous version" } = params;

  // Get the version to restore
  const { data: versionToRestore, error: restoreError } = await supabase
    .from("email_template_versions")
    .select("*")
    .eq("id", versionId)
    .eq("email_template_id", templateId)
    .single();

  if (restoreError) throw restoreError;

  // Get current version number
  const { data: currentVersion, error: currentError } = await supabase
    .from("email_template_versions")
    .select("version")
    .eq("email_template_id", templateId)
    .eq("is_current", true)
    .single();

  if (currentError) throw currentError;

  // Mark current version as not current
  const { error: markError } = await supabase
    .from("email_template_versions")
    .update({ is_current: false })
    .eq("email_template_id", templateId)
    .eq("is_current", true);

  if (markError) throw markError;

  // Create new version with restored content
  const { data: newVersion, error: newError } = await supabase
    .from("email_template_versions")
    .insert({
      email_template_id: templateId,
      version: currentVersion.version + 1,
      subject_template: versionToRestore.subject_template,
      html_template: versionToRestore.html_template,
      text_template: versionToRestore.text_template,
      variables: versionToRestore.variables,
      default_from_address: versionToRestore.default_from_address,
      email_type: versionToRestore.email_type,
      category: versionToRestore.category,
      change_notes,
      created_by: user?.id,
      is_current: true,
    })
    .select()
    .single();

  if (newError) throw newError;

  // Update template timestamp
  const { error: updateError } = await supabase
    .from("email_templates")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", templateId);

  if (updateError) throw updateError;

  return newVersion;
}

export async function exportEmailTemplates(
  supabase: SupabaseClient,
  params: { templateIds?: string[] },
  user?: AdminUser
) {
  const { templateIds } = params;

  let query = supabase
    .from("email_templates")
    .select(`
      *,
      email_template_versions (*)
    `);

  if (templateIds && templateIds.length > 0) {
    query = query.in("id", templateIds);
  }

  const { data, error } = await query.order("name");

  if (error) throw error;

  // Format for export
  const exportData = {
    version: "1.0",
    exported_at: new Date().toISOString(),
    exported_by: user?.id,
    templates: data?.map((template) => ({
      name: template.name,
      description: template.description,
      category: template.category,
      metadata: template.metadata,
      versions: template.email_template_versions?.map((version: any) => ({
        version: version.version,
        subject_template: version.subject_template,
        html_template: version.html_template,
        text_template: version.text_template,
        variables: version.variables,
        default_from_address: version.default_from_address,
        email_type: version.email_type,
        category: version.category,
        change_notes: version.change_notes,
        is_current: version.is_current,
        created_at: version.created_at,
      })) || [],
    })) || [],
  };

  return exportData;
}

export async function importEmailTemplates(
  supabase: SupabaseClient,
  params: {
    data: any;
    strategy: "skip" | "overwrite" | "create_new";
  },
  user?: AdminUser
) {
  const { data: importData, strategy } = params;

  if (!importData.templates || !Array.isArray(importData.templates)) {
    throw new Error("Invalid import format: missing templates array");
  }

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const templateData of importData.templates) {
    try {
      // Check if template exists
      const { data: existing } = await supabase
        .from("email_templates")
        .select("id, name")
        .eq("name", templateData.name)
        .single();

      if (existing) {
        if (strategy === "skip") {
          results.skipped++;
          continue;
        } else if (strategy === "create_new") {
          templateData.name = `${templateData.name} (imported ${Date.now()})`;
        }
        // For overwrite, we'll delete and recreate
        else if (strategy === "overwrite") {
          await supabase
            .from("email_templates")
            .delete()
            .eq("id", existing.id);
        }
      }

      // Create template
      const { data: newTemplate, error: templateError } = await supabase
        .from("email_templates")
        .insert({
          name: templateData.name,
          description: templateData.description,
          category: templateData.category || "general",
          metadata: templateData.metadata || {},
          created_by: user?.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Import versions
      const versions = templateData.versions || [];
      if (versions.length === 0) {
        throw new Error(`No versions found for template: ${templateData.name}`);
      }

      // Sort versions and import them
      const sortedVersions = versions.sort((a: any, b: any) => a.version - b.version);
      
      for (const versionData of sortedVersions) {
        const { error: versionError } = await supabase
          .from("email_template_versions")
          .insert({
            email_template_id: newTemplate.id,
            version: versionData.version,
            subject_template: versionData.subject_template,
            html_template: versionData.html_template,
            text_template: versionData.text_template,
            variables: versionData.variables || [],
            default_from_address: versionData.default_from_address,
            email_type: versionData.email_type || "transactional",
            category: versionData.category || "general",
            change_notes: versionData.change_notes || "Imported version",
            is_current: versionData.is_current || false,
            created_by: user?.id,
          });

        if (versionError) throw versionError;
      }

      results.imported++;
    } catch (error: any) {
      results.errors.push(`${templateData.name}: ${error.message}`);
    }
  }

  return results;
}

export async function sendTestEmail(
  supabase: SupabaseClient,
  params: {
    templateId: string;
    testEmail: string;
    variables?: Record<string, any>;
  },
  user?: AdminUser
) {
  const { templateId, testEmail, variables = {} } = params;

  // Get current template version
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select(`
      name,
      email_template_versions!inner (
        subject_template,
        html_template,
        text_template,
        variables,
        default_from_address
      )
    `)
    .eq("id", templateId)
    .eq("email_template_versions.is_current", true)
    .single();

  if (templateError) throw templateError;

  const version = template.email_template_versions[0];
  if (!version) {
    throw new Error("No current version found for template");
  }

  // Initialize email service
  const emailService = new EmailService();

  // Send test email
  const result = await emailService.sendTemplatedEmail({
    to: testEmail,
    subject: version.subject_template,
    template: version.html_template,
    variables: {
      template_name: template.name,
      test_mode: true,
      ...variables,
    },
    from: version.default_from_address,
  });

  // Log the test email
  if (result.status === 'sent') {
    await emailService.logEmailActivity({
      userId: user?.id,
      emailType: 'test',
      recipient: testEmail,
      status: 'sent',
      externalId: result.messageId,
      metadata: {
        template_id: templateId,
        template_name: template.name,
        test_variables: variables,
      },
    });
  }

  return {
    success: result.status === 'sent',
    messageId: result.messageId,
    error: result.error,
    timestamp: result.timestamp,
  };
}

export async function getEmailCategories(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) {
  // Get categories from existing templates
  const { data: templateCategories } = await supabase
    .from("email_templates")
    .select("category")
    .not("category", "is", null);

  const { data: versionCategories } = await supabase
    .from("email_template_versions")
    .select("category")
    .not("category", "is", null);

  // Combine and deduplicate categories
  const allCategories = new Set();
  
  templateCategories?.forEach(t => allCategories.add(t.category));
  versionCategories?.forEach(v => allCategories.add(v.category));

  // Add default categories
  const defaultCategories = [
    "general",
    "transactional", 
    "notification",
    "marketing",
    "system",
    "welcome",
    "reminder",
    "bulk"
  ];

  defaultCategories.forEach(cat => allCategories.add(cat));

  return Array.from(allCategories).sort();
}

// Helper function to extract variables from template text
function extractVariables(template: string): string[] {
  const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = variableRegex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}