import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { AdminUser } from '../../_shared/types.ts'

export async function getSystemConfigs(
  supabase: SupabaseClient,
  params?: { category?: string },
  user?: AdminUser
) {
  let query = supabase
    .from('system_config')
    .select('*')
    .order('category', { ascending: true })
    .order('config_key', { ascending: true })

  if (params?.category) {
    query = query.eq('category', params.category)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get system configs: ${error.message}`)
  }

  // Group by category
  const grouped = data?.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = []
    }
    acc[config.category].push(config)
    return acc
  }, {} as Record<string, any[]>)

  return grouped || {}
}

export async function updateSystemConfig(
  supabase: SupabaseClient,
  params: { configId: string; value: any },
  user?: AdminUser
) {
  const { configId, value } = params

  // Get the current config
  const { data: currentConfig, error: fetchError } = await supabase
    .from('system_config')
    .select('*')
    .eq('id', configId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch config: ${fetchError.message}`)
  }

  // Update the config
  const { data, error } = await supabase
    .from('system_config')
    .update({ 
      config_value: value.toString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', configId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update config: ${error.message}`)
  }

  // Log the change
  await supabase.from('admin_activity_logs').insert({
    admin_user_id: user?.id,
    action: 'updateSystemConfig',
    target_type: 'config',
    target_id: configId,
    details: {
      config_key: currentConfig.config_key,
      old_value: currentConfig.config_value,
      new_value: value.toString()
    }
  })

  // Clear relevant caches
  if (currentConfig.category === 'matching' || currentConfig.category === 'processing') {
    await supabase
      .from('admin_metrics_cache')
      .delete()
      .in('metric_key', ['system_health', 'matching_stats'])
  }

  return data
}

export async function getConfigHistory(
  supabase: SupabaseClient,
  params: { configKey?: string; limit?: number },
  user?: AdminUser
) {
  let query = supabase
    .from('admin_activity_logs')
    .select(`
      *,
      admin_user:users!admin_activity_logs_admin_user_id_fkey(handle)
    `)
    .eq('action', 'updateSystemConfig')
    .order('created_at', { ascending: false })
    .limit(params?.limit || 50)

  if (params?.configKey) {
    query = query.eq('details->>config_key', params.configKey)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get config history: ${error.message}`)
  }

  return data || []
}