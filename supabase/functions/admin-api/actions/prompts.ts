import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { AdminUser, RunPromptRequest } from "../../_shared/types.ts";
import { PromptService } from "../../_shared/prompt-service.ts";

export async function getPromptTemplates(
  supabase: SupabaseClient,
  params?: any,
  user?: AdminUser
) {
  const { data, error } = await supabase
    .from("prompt_templates")
    .select(
      `
      id,
      name,
      description,
      created_at,
      updated_at,
      prompt_template_versions!inner (
        id,
        version,
        template_text,
        variables,
        is_json_response,
        json_schema,
        llm_model,
        created_at,
        change_notes
      )
    `
    )
    .eq("prompt_template_versions.is_current", true)
    .order("name");

  if (error) throw error;

  // Flatten the structure for backward compatibility
  const flattenedData = (data || []).map((template) => {
    const version = template.prompt_template_versions[0];
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      template_text: version.template_text,
      variables: version.variables,
      version: version.version,
      is_json_response: version.is_json_response,
      json_schema: version.json_schema,
      llm_model: version.llm_model,
      created_at: template.created_at,
      updated_at: template.updated_at,
    };
  });

  return flattenedData;
}

export async function getPromptTemplate(
  supabase: SupabaseClient,
  params: { templateId: string },
  user?: AdminUser
) {
  const { templateId } = params;

  const [templateResult, versionsResult] = await Promise.all([
    supabase.from("prompt_templates").select("*").eq("id", templateId).single(),
    supabase
      .from("prompt_template_versions")
      .select("*")
      .eq("prompt_template_id", templateId)
      .order("version", { ascending: false }),
  ]);

  if (templateResult.error) throw templateResult.error;

  return {
    template: templateResult.data,
    versions: versionsResult.data || [],
  };
}

export async function updatePromptTemplate(
  supabase: SupabaseClient,
  params: {
    templateId: string;
    template_text: string;
    description?: string;
    changeNotes?: string;
    is_json_response?: boolean;
    json_schema?: any;
    llm_model?: string;
  },
  user?: AdminUser
) {
  const {
    templateId,
    template_text,
    description,
    changeNotes,
    is_json_response,
    json_schema,
    llm_model,
  } = params;

  // Extract variables from template
  const variableMatches = template_text.match(/{{(\w+)}}/g) || [];
  const variables = [...new Set(variableMatches.map((m) => m.slice(2, -2)))];

  // Get current version number
  const { data: currentVersion, error: fetchError } = await supabase
    .from("prompt_template_versions")
    .select("version")
    .eq("prompt_template_id", templateId)
    .eq("is_current", true)
    .single();

  if (fetchError) throw fetchError;

  const newVersionNumber = currentVersion.version + 1;

  // First, mark current version as not current
  const { error: updateCurrentError } = await supabase
    .from("prompt_template_versions")
    .update({ is_current: false })
    .eq("prompt_template_id", templateId)
    .eq("is_current", true);

  if (updateCurrentError) throw updateCurrentError;

  // Create new version
  const { data: newVersion, error: versionError } = await supabase
    .from("prompt_template_versions")
    .insert({
      prompt_template_id: templateId,
      version: newVersionNumber,
      template_text,
      variables,
      change_notes: changeNotes || "Updated template",
      created_by: user?.id,
      is_current: true,
      is_json_response: is_json_response,
      json_schema: json_schema,
      llm_model: llm_model,
    })
    .select()
    .single();

  if (versionError) throw versionError;

  // Update template metadata if description changed
  if (description !== undefined) {
    const { error: templateUpdateError } = await supabase
      .from("prompt_templates")
      .update({
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId);

    if (templateUpdateError) throw templateUpdateError;
  }

  // Return flattened structure for backward compatibility
  const { data: updatedTemplate, error: getError } = await supabase
    .from("prompt_templates")
    .select(
      `
      id,
      name,
      description,
      created_at,
      updated_at,
      prompt_template_versions!inner (
        id,
        version,
        template_text,
        variables,
        is_json_response,
        json_schema,
        llm_model,
        created_at
      )
    `
    )
    .eq("id", templateId)
    .eq("prompt_template_versions.is_current", true)
    .single();

  if (getError) throw getError;

  const version = updatedTemplate.prompt_template_versions[0];
  return {
    id: updatedTemplate.id,
    name: updatedTemplate.name,
    description: updatedTemplate.description,
    template_text: version.template_text,
    variables: version.variables,
    version: version.version,
    is_json_response: version.is_json_response,
    json_schema: version.json_schema,
    llm_model: version.llm_model,
    created_at: updatedTemplate.created_at,
    updated_at: updatedTemplate.updated_at,
  };
}

export async function getPromptVersions(
  supabase: SupabaseClient,
  params: { templateId: string },
  user?: AdminUser
) {
  const { data, error } = await supabase
    .from("prompt_template_versions")
    .select("*")
    .eq("prompt_template_id", params.templateId)
    .order("version", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPromptTemplate(
  supabase: SupabaseClient,
  params: {
    name: string;
    description?: string;
    template_text: string;
    is_json_response?: boolean;
    json_schema?: any;
    llm_model?: string;
  },
  user?: AdminUser
) {
  const {
    name,
    description,
    template_text,
    is_json_response,
    json_schema,
    llm_model,
  } = params;

  // Validate required fields
  if (!name || !template_text) {
    throw new Error("Name and template_text are required");
  }

  // Extract variables from template
  const variableMatches = template_text.match(/{{(\w+)}}/g) || [];
  const variables = [...new Set(variableMatches.map((m) => m.slice(2, -2)))];

  // Check if template name already exists
  const { data: existingTemplate, error: checkError } = await supabase
    .from("prompt_templates")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (checkError) throw checkError;
  if (existingTemplate) {
    throw new Error(`Template with name "${name}" already exists`);
  }

  // Create the new template
  const { data: newTemplate, error: templateError } = await supabase
    .from("prompt_templates")
    .insert({
      name,
      description,
      created_by: user?.id,
    })
    .select()
    .single();

  if (templateError) throw templateError;

  // Create the initial version
  const { data: newVersion, error: versionError } = await supabase
    .from("prompt_template_versions")
    .insert({
      prompt_template_id: newTemplate.id,
      version: 1,
      template_text,
      variables,
      change_notes: "Initial version",
      created_by: user?.id,
      is_current: true,
      is_json_response: is_json_response || false,
      json_schema: json_schema,
      llm_model: llm_model,
    })
    .select()
    .single();

  if (versionError) throw versionError;

  // Return flattened structure for backward compatibility
  return {
    id: newTemplate.id,
    name: newTemplate.name,
    description: newTemplate.description,
    template_text: newVersion.template_text,
    variables: newVersion.variables,
    version: newVersion.version,
    is_json_response: newVersion.is_json_response,
    json_schema: newVersion.json_schema,
    llm_model: newVersion.llm_model,
    created_at: newTemplate.created_at,
    updated_at: newTemplate.updated_at,
  };
}

export async function restorePromptVersion(
  supabase: SupabaseClient,
  params: {
    templateId: string;
    versionId: string;
  },
  user?: AdminUser
) {
  const { templateId, versionId } = params;

  // Get the version to restore
  const { data: version, error: versionError } = await supabase
    .from("prompt_template_versions")
    .select("*")
    .eq("id", versionId)
    .eq("prompt_template_id", templateId)
    .single();

  if (versionError) throw versionError;

  // Get current version number
  const { data: currentVersion, error: fetchError } = await supabase
    .from("prompt_template_versions")
    .select("version")
    .eq("prompt_template_id", templateId)
    .eq("is_current", true)
    .single();

  if (fetchError) throw fetchError;

  const newVersionNumber = currentVersion.version + 1;

  // First, mark current version as not current
  const { error: updateCurrentError } = await supabase
    .from("prompt_template_versions")
    .update({ is_current: false })
    .eq("prompt_template_id", templateId)
    .eq("is_current", true);

  if (updateCurrentError) throw updateCurrentError;

  // Create new version with restored content
  const { data: newVersion, error: insertError } = await supabase
    .from("prompt_template_versions")
    .insert({
      prompt_template_id: templateId,
      version: newVersionNumber,
      template_text: version.template_text,
      variables: version.variables,
      change_notes: `Restored from version ${version.version}`,
      created_by: user?.id,
      is_current: true,
      is_json_response: version.is_json_response,
      json_schema: version.json_schema,
      llm_model: version.llm_model,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Update template updated_at timestamp
  const { error: templateUpdateError } = await supabase
    .from("prompt_templates")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", templateId);

  if (templateUpdateError) throw templateUpdateError;

  // Return flattened structure for backward compatibility
  const { data: updatedTemplate, error: getError } = await supabase
    .from("prompt_templates")
    .select(
      `
      id,
      name,
      description,
      created_at,
      updated_at,
      prompt_template_versions!inner (
        id,
        version,
        template_text,
        variables,
        is_json_response,
        json_schema,
        llm_model,
        created_at
      )
    `
    )
    .eq("id", templateId)
    .eq("prompt_template_versions.is_current", true)
    .single();

  if (getError) throw getError;

  const versionData = updatedTemplate.prompt_template_versions[0];
  return {
    id: updatedTemplate.id,
    name: updatedTemplate.name,
    description: updatedTemplate.description,
    template_text: versionData.template_text,
    variables: versionData.variables,
    version: versionData.version,
    is_json_response: versionData.is_json_response,
    json_schema: versionData.json_schema,
    llm_model: versionData.llm_model,
    created_at: updatedTemplate.created_at,
    updated_at: updatedTemplate.updated_at,
  };
}

export async function exportPromptTemplates(
  supabase: SupabaseClient,
  params?: { templateIds?: string[] },
  user?: AdminUser
) {
  const { templateIds } = params || {};

  let query = supabase
    .from("prompt_templates")
    .select(
      `
      id,
      name,
      description,
      created_at,
      updated_at,
      prompt_template_versions (
        id,
        version,
        template_text,
        variables,
        change_notes,
        created_at,
        is_current,
        is_json_response,
        json_schema,
        llm_model
      )
    `
    )
    .order("name");

  // Filter by specific template IDs if provided
  if (templateIds && templateIds.length > 0) {
    query = query.in("id", templateIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Structure the export data
  const exportData = {
    export_timestamp: new Date().toISOString(),
    exported_by: user?.id,
    templates: (data || []).map((template) => ({
      name: template.name,
      description: template.description,
      created_at: template.created_at,
      updated_at: template.updated_at,
      versions: (template.prompt_template_versions || [])
        .sort((a, b) => a.version - b.version)
        .map((version) => ({
          version: version.version,
          template_text: version.template_text,
          variables: version.variables,
          change_notes: version.change_notes,
          created_at: version.created_at,
          is_current: version.is_current,
          is_json_response: version.is_json_response,
          json_schema: version.json_schema,
          llm_model: version.llm_model,
        })),
    })),
  };

  return exportData;
}

export async function importPromptTemplates(
  supabase: SupabaseClient,
  params: {
    importData: any;
    conflictStrategy?: "skip" | "overwrite" | "rename";
  },
  user?: AdminUser
) {
  const { importData, conflictStrategy = "skip" } = params;

  // Validate import data structure
  if (!importData.templates || !Array.isArray(importData.templates)) {
    throw new Error("Invalid import data: templates array is required");
  }

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
    templates: [] as any[],
  };

  for (const templateData of importData.templates) {
    try {
      // Validate template data
      if (
        !templateData.name ||
        !templateData.versions ||
        !Array.isArray(templateData.versions)
      ) {
        results.errors.push(
          `Invalid template data: name and versions required for template`
        );
        continue;
      }

      if (templateData.versions.length === 0) {
        results.errors.push(`Template "${templateData.name}" has no versions`);
        continue;
      }

      // Check if template already exists
      const { data: existingTemplate, error: checkError } = await supabase
        .from("prompt_templates")
        .select("id, name")
        .eq("name", templateData.name)
        .maybeSingle();

      if (checkError) throw checkError;

      let finalTemplateName = templateData.name;
      const shouldImport = true;

      if (existingTemplate) {
        if (conflictStrategy === "skip") {
          results.skipped++;
          continue;
        } else if (conflictStrategy === "rename") {
          // Find a unique name
          let counter = 1;
          let candidateName = `${templateData.name}_imported_${counter}`;

          while (true) {
            const { data: nameCheck, error: nameError } = await supabase
              .from("prompt_templates")
              .select("id")
              .eq("name", candidateName)
              .maybeSingle();

            if (nameError) throw nameError;
            if (!nameCheck) break;

            counter++;
            candidateName = `${templateData.name}_imported_${counter}`;
          }

          finalTemplateName = candidateName;
        } else if (conflictStrategy === "overwrite") {
          // Delete existing template and its versions
          const { error: deleteVersionsError } = await supabase
            .from("prompt_template_versions")
            .delete()
            .eq("prompt_template_id", existingTemplate.id);

          if (deleteVersionsError) throw deleteVersionsError;

          const { error: deleteTemplateError } = await supabase
            .from("prompt_templates")
            .delete()
            .eq("id", existingTemplate.id);

          if (deleteTemplateError) throw deleteTemplateError;
        }
      }

      if (shouldImport) {
        // Create the template
        const { data: newTemplate, error: templateError } = await supabase
          .from("prompt_templates")
          .insert({
            name: finalTemplateName,
            description: templateData.description,
            created_by: user?.id,
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Import versions
        const versionsToInsert = templateData.versions.map((version: any) => ({
          prompt_template_id: newTemplate.id,
          version: version.version,
          template_text: version.template_text,
          variables: version.variables,
          change_notes: version.change_notes || "Imported version",
          created_by: user?.id,
          is_current: version.is_current || false,
          is_json_response: version.is_json_response || false,
          json_schema: version.json_schema,
          llm_model: version.llm_model,
        }));

        const { data: newVersions, error: versionsError } = await supabase
          .from("prompt_template_versions")
          .insert(versionsToInsert)
          .select();

        if (versionsError) throw versionsError;

        // Ensure at least one version is marked as current
        const currentVersions = newVersions.filter((v) => v.is_current);
        if (currentVersions.length === 0) {
          // Mark the latest version as current
          const latestVersion = newVersions.sort(
            (a, b) => b.version - a.version
          )[0];
          const { error: updateCurrentError } = await supabase
            .from("prompt_template_versions")
            .update({ is_current: true })
            .eq("id", latestVersion.id);

          if (updateCurrentError) throw updateCurrentError;
        }

        results.imported++;
        results.templates.push({
          id: newTemplate.id,
          name: finalTemplateName,
          originalName: templateData.name,
          versionsImported: newVersions.length,
        });
      }
    } catch (error) {
      results.errors.push(
        `Failed to import template "${templateData.name}": ${error.message}`
      );
    }
  }

  return results;
}

export async function runPrompt(
  supabase: SupabaseClient,
  params: RunPromptRequest,
  user?: AdminUser
) {
  // Initialize prompt service and execute template
  const promptService = new PromptService(supabase);
  const result = await promptService.executePromptTemplate(params, {
    edgeFunction: "admin-api/actions/prompts",
    userId: user?.id,
  });

  return result;
}
