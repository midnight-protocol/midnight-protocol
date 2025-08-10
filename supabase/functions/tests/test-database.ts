import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { createServiceRoleClient } from "../_shared/supabase-client.ts";
import { validateInput, ValidationSchema, sanitizeSqlIdentifier, formatSqlParams, withTimeout } from "./test-utils.ts";

export interface DatabaseSnapshot {
  tables: string[];
  counts: Record<string, number>;
  timestamp: string;
}

export class TestDatabase {
  private serviceRoleClient: SupabaseClient | null = null;
  private testDataIds: Map<string, string[]> = new Map();
  
  constructor() {
    // Lazy initialization to allow environment variables to be set
  }
  
  private getClient(): SupabaseClient {
    if (!this.serviceRoleClient) {
      this.serviceRoleClient = createServiceRoleClient();
    }
    return this.serviceRoleClient;
  }

  /**
   * Create a snapshot of current database state
   */
  async createSnapshot(tables?: string[]): Promise<DatabaseSnapshot> {
    const targetTables = tables || [
      'users', 'conversations', 'matches', 'personal_stories', 
      'system_configs', 'activity_logs', 'email_interests', 
      'email_templates', 'prompt_templates', 'llm_logs'
    ];

    const counts: Record<string, number> = {};
    
    for (const table of targetTables) {
      try {
        const { count, error } = await this.getClient()
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.warn(`Could not count table ${table}:`, error.message);
          counts[table] = 0;
        } else {
          counts[table] = count || 0;
        }
      } catch (error) {
        console.warn(`Error accessing table ${table}:`, error);
        counts[table] = 0;
      }
    }

    return {
      tables: targetTables,
      counts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clean up test data by IDs
   */
  async cleanupTestData(): Promise<void> {
    console.log("Cleaning up test data...");

    for (const [table, ids] of this.testDataIds.entries()) {
      if (ids.length === 0) continue;

      try {
        const { error } = await this.getClient()
          .from(table)
          .delete()
          .in('id', ids);

        if (error) {
          console.error(`Error cleaning up ${table}:`, error.message);
        } else {
          console.log(`Cleaned up ${ids.length} records from ${table}`);
        }
      } catch (error) {
        console.error(`Error during cleanup of ${table}:`, error);
      }
    }

    // Clear the registry
    this.testDataIds.clear();

    // Also clean up test users by handle pattern
    await this.cleanupTestUsers();
  }

  /**
   * Clean up test users specifically
   */
  async cleanupTestUsers(): Promise<void> {
    try {
      // Delete test users from database
      const { error: dbError } = await this.getClient()
        .from('users')
        .delete()
        .like('handle', 'test-%');

      if (dbError) {
        console.error("Error cleaning up test users from database:", dbError.message);
      }

      // Get all auth users and delete test ones
      const { data: authUsers, error: listError } = await this.getClient().auth.admin.listUsers();
      
      if (listError) {
        console.error("Error listing auth users:", listError.message);
        return;
      }

      for (const user of authUsers.users) {
        if (user.email?.includes('test-') || user.user_metadata?.handle?.startsWith('test-')) {
          await this.getClient().auth.admin.deleteUser(user.id);
        }
      }

      console.log("Test users cleanup completed");
    } catch (error) {
      console.error("Error during test users cleanup:", error);
    }
  }

  /**
   * Register test data for cleanup
   */
  registerTestData(table: string, ids: string[]): void {
    const existing = this.testDataIds.get(table) || [];
    this.testDataIds.set(table, [...existing, ...ids]);
  }

  /**
   * Register single test data record
   */
  registerTestRecord(table: string, id: string): void {
    this.registerTestData(table, [id]);
  }

  /**
   * Create test data helper functions
   */
  async createTestData(table: string, data: any[]): Promise<any[]> {
    // Input validation
    const schema: ValidationSchema = {
      table: { type: 'string', required: true, minLength: 1 },
      data: { type: 'array', required: true, minItems: 1 }
    };
    
    validateInput({ table, data }, schema);
    
    const sanitizedTable = sanitizeSqlIdentifier(table);
    const { data: inserted, error } = await withTimeout(
      this.getClient()
        .from(sanitizedTable)
        .insert(data)
        .select(),
      10000,
      `Create test data in ${table}`
    );

    if (error) {
      throw new Error(`Failed to create test data in ${table}: ${error.message}`);
    }

    // Register for cleanup
    const ids = inserted.map(record => record.id);
    this.registerTestData(table, ids);

    return inserted;
  }

  /**
   * Create a single test record
   */
  async createTestRecord(table: string, data: any): Promise<any> {
    const [record] = await this.createTestData(table, [data]);
    return record;
  }

  /**
   * Get test data by criteria
   */
  async getTestData(table: string, criteria: Record<string, any>): Promise<any[]> {
    // Input validation
    const schema: ValidationSchema = {
      table: { type: 'string', required: true, minLength: 1 },
      criteria: { type: 'object', required: true }
    };
    
    validateInput({ table, criteria }, schema);
    
    const sanitizedTable = sanitizeSqlIdentifier(table);
    let query = this.getClient().from(sanitizedTable).select();
    
    for (const [key, value] of Object.entries(criteria)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to get test data from ${table}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Execute raw SQL for complex test setups
   * WARNING: This function should only be used in test environments
   * @deprecated Use specific database methods instead of raw SQL
   */
  async executeSql(sql: string, params?: any[]): Promise<any> {
    // Security check - only allow in test environment
    const isTestEnv = Deno.env.get('TEST_MODE') === 'true' || 
                      Deno.env.get('NODE_ENV') === 'test' ||
                      (Deno.env.get('SUPABASE_URL') || '').includes('localhost');
    
    if (!isTestEnv) {
      throw new Error('executeSql can only be used in test environments');
    }

    console.warn('⚠️  Using raw SQL execution - consider using specific database methods instead');
    
    try {
      // Note: This assumes you have an 'exec_sql' RPC function
      // If not, this will fail gracefully
      const { data, error } = await withTimeout(
        this.getClient().rpc('exec_sql', {
          sql_query: sql,
          sql_params: formatSqlParams(params || [])
        }),
        15000,
        'SQL execution'
      );

      if (error) {
        throw new Error(`SQL execution failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("SQL execution error:", error);
      throw error;
    }
  }

  /**
   * Reset sequences for test isolation
   */
  async resetSequences(tables: string[]): Promise<void> {
    for (const table of tables) {
      try {
        await this.executeSql(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table};`);
      } catch (error) {
        console.warn(`Could not reset sequence for ${table}:`, error);
      }
    }
  }

  /**
   * Check database connectivity
   */
  async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await withTimeout(
        this.getClient()
          .from('users')
          .select('count', { count: 'exact', head: true }),
        3000,
        'Database connection check'
      );
        
      return !error;
    } catch (error) {
      console.warn('Database connection check failed:', error);
      return false;
    }
  }

  /**
   * Wait for database to be ready
   */
  async waitForReady(maxAttempts: number = 10, delayMs: number = 1000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.checkConnection()) {
        return true;
      }
      console.log(`Database not ready, attempt ${i + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return false;
  }

  /**
   * Truncate tables for testing (use with caution!)
   */
  async truncateTables(tables: string[]): Promise<void> {
    console.warn("TRUNCATING TABLES - This should only be used in test environments!");
    
    for (const table of tables) {
      try {
        await this.executeSql(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
        console.log(`Truncated table: ${table}`);
      } catch (error) {
        console.error(`Error truncating ${table}:`, error);
      }
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (error) {
      throw new Error(`Failed to get schema for ${tableName}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create test system config
   */
  async createTestSystemConfig(key: string, value: any): Promise<any> {
    return this.createTestRecord('system_config', {
      category: 'test',
      config_key: key,
      config_value: typeof value === 'object' ? value : { value },
      description: 'Test configuration',
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Create test conversation
   */
  async createTestConversation(userIds: string[], matchId?: string): Promise<any> {
    return this.createTestRecord('conversations', {
      participants: userIds,
      match_id: matchId,
      status: 'active',
      created_at: new Date().toISOString()
    });
  }

  /**
   * Create test match
   */
  async createTestMatch(userIds: string[]): Promise<any> {
    return this.createTestRecord('matches', {
      user_ids: userIds,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  }
}