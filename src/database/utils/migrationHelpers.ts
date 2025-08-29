import { Knex } from 'knex';

/**
 * Migration helper functions to standardize common migration patterns
 * and ensure consistency across all migration files.
 */

// Common column configurations
export const commonColumns = {
  id: (table: Knex.CreateTableBuilder, trx?: Knex | Knex.Transaction) => {
    if (trx) {
      return table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
    }
    return table.uuid('id').primary();
  },
  
  timestamps: (table: Knex.CreateTableBuilder) => {
    table.timestamp('created_at', { useTz: true });
    table.timestamp('updated_at', { useTz: true });
  },
  
  userReference: (table: Knex.CreateTableBuilder, nullable = false) => {
    const column = table.uuid('user_id');
    if (!nullable) column.notNullable();
    return column.references('id').inTable('users').onDelete('CASCADE');
  },
  
  auditColumns: (table: Knex.CreateTableBuilder) => {
    table.uuid('created_by').nullable().references('id').inTable('users');
    table.uuid('updated_by').nullable().references('id').inTable('users');
    table.boolean('is_deleted').defaultTo(false);
    table.timestamp('deleted_at', { useTz: true }).nullable();
  },
};

// Enum creation helper
export const createEnumIfNotExists = async (
  knex: Knex,
  enumName: string,
  values: string[]
): Promise<void> => {
  await knex.raw(`
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumName}') THEN
            CREATE TYPE ${enumName} AS ENUM (${values.map(v => `'${v}'`).join(', ')});
        END IF;
    END $$;
  `);
};

// Enum deletion helper
export const dropEnumIfNotUsed = async (
  knex: Knex,
  enumName: string,
  excludeTable?: string
): Promise<void> => {
  const excludeClause = excludeTable ? `AND table_name != '${excludeTable}'` : '';
  
  await knex.raw(`
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE data_type = 'USER-DEFINED' 
            AND udt_name = '${enumName}' 
            ${excludeClause}
        ) THEN
            DROP TYPE IF EXISTS ${enumName};
        END IF;
    END $$;
  `);
};

// Index creation helpers
export const createIndexes = async (
  knex: Knex,
  tableName: string,
  indexes: Array<{
    name: string;
    columns: string | string[];
    unique?: boolean;
    partial?: string;
  }>
): Promise<void> => {
  for (const index of indexes) {
    const indexName = `idx_${tableName}_${index.name}`;
    const columnsStr = Array.isArray(index.columns) 
      ? index.columns.join(', ') 
      : index.columns;
    
    const uniqueClause = index.unique ? 'UNIQUE' : '';
    const partialClause = index.partial ? `WHERE ${index.partial}` : '';
    
    await knex.raw(`
      CREATE ${uniqueClause} INDEX IF NOT EXISTS ${indexName} 
      ON ${tableName}(${columnsStr}) 
      ${partialClause}
    `);
  }
};

// Trigger creation for updated_at
export const createUpdatedAtTrigger = async (
  knex: Knex,
  tableName: string
): Promise<void> => {
  // First ensure the trigger function exists
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);
  
  // Create the trigger
  await knex.raw(`
    CREATE TRIGGER update_${tableName}_updated_at 
    BEFORE UPDATE ON ${tableName}
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
};

// Drop trigger helper
export const dropUpdatedAtTrigger = async (
  knex: Knex,
  tableName: string
): Promise<void> => {
  await knex.raw(`DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON ${tableName}`);
};

// Extension creation helper
export const createExtensions = async (knex: Knex): Promise<void> => {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "citext"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "btree_gin"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
};

// Constraint creation helpers
export const addConstraints = async (
  knex: Knex,
  tableName: string,
  constraints: Array<{
    name: string;
    check: string;
  }>
): Promise<void> => {
  for (const constraint of constraints) {
    await knex.raw(`
      ALTER TABLE ${tableName} 
      ADD CONSTRAINT ${constraint.name} 
      CHECK (${constraint.check})
    `);
  }
};

// Foreign key helpers
export const addForeignKey = async (
  knex: Knex,
  tableName: string,
  columnName: string,
  referencedTable: string,
  referencedColumn = 'id',
  onDelete = 'CASCADE',
  onUpdate = 'CASCADE'
): Promise<void> => {
  const constraintName = `fk_${tableName}_${columnName}`;
  
  await knex.raw(`
    ALTER TABLE ${tableName}
    ADD CONSTRAINT ${constraintName}
    FOREIGN KEY (${columnName})
    REFERENCES ${referencedTable}(${referencedColumn})
    ON DELETE ${onDelete}
    ON UPDATE ${onUpdate}
  `);
};

// Transaction wrapper for migrations
export const withTransaction = async <T>(
  knex: Knex,
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> => {
  return await knex.transaction(callback);
};

// Check if table exists
export const tableExists = async (knex: Knex, tableName: string): Promise<boolean> => {
  const result = await knex.raw(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ?
    )
  `, [tableName]);
  
  return result.rows[0].exists;
};

// Check if column exists
export const columnExists = async (
  knex: Knex,
  tableName: string,
  columnName: string
): Promise<boolean> => {
  const result = await knex.raw(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = ? AND column_name = ?
    )
  `, [tableName, columnName]);
  
  return result.rows[0].exists;
};

// Safe column addition (only if it doesn't exist)
export const addColumnIfNotExists = async (
  knex: Knex,
  tableName: string,
  columnName: string,
  columnDefinition: (table: Knex.AlterTableBuilder) => void
): Promise<void> => {
  const exists = await columnExists(knex, tableName, columnName);
  if (!exists) {
    await knex.schema.alterTable(tableName, columnDefinition);
  }
};

// Safe column removal (only if it exists)
export const dropColumnIfExists = async (
  knex: Knex,
  tableName: string,
  columnName: string
): Promise<void> => {
  const exists = await columnExists(knex, tableName, columnName);
  if (exists) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn(columnName);
    });
  }
};

// Migration validation helpers
export const validateMigration = {
  // Ensure required tables exist before creating foreign keys
  requireTables: async (knex: Knex, tables: string[]): Promise<void> => {
    for (const table of tables) {
      const exists = await tableExists(knex, table);
      if (!exists) {
        throw new Error(`Required table '${table}' does not exist. Ensure migrations run in correct order.`);
      }
    }
  },
  
  // Validate enum values
  validateEnumValues: (values: string[]): void => {
    if (values.length === 0) {
      throw new Error('Enum must have at least one value');
    }
    
    const duplicates = values.filter((item, index) => values.indexOf(item) !== index);
    if (duplicates.length > 0) {
      throw new Error(`Enum has duplicate values: ${duplicates.join(', ')}`);
    }
  },
  
  // Validate table name
  validateTableName: (tableName: string): void => {
    if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name '${tableName}'. Use lowercase letters, numbers, and underscores only.`);
    }
  },
};

// Common data types for financial applications
export const financialTypes = {
  money: (table: Knex.CreateTableBuilder, columnName: string, nullable = false) => {
    const column = table.decimal(columnName, 15, 2);
    if (!nullable) column.notNullable();
    return column;
  },
  
  currency: (table: Knex.CreateTableBuilder, columnName = 'currency') => {
    return table.string(columnName, 3).defaultTo('USD');
  },
  
  percentage: (table: Knex.CreateTableBuilder, columnName: string) => {
    return table.decimal(columnName, 5, 4); // e.g., 99.9999%
  },
};

// Seed data helpers
export const seedHelpers = {
  // Clear table data safely
  clearTable: async (knex: Knex, tableName: string, condition?: Record<string, any>): Promise<void> => {
    if (condition) {
      await knex(tableName).where(condition).del();
    } else {
      await knex(tableName).del();
    }
  },
  
  // Insert data with conflict handling
  upsert: async (
    knex: Knex,
    tableName: string,
    data: any[],
    conflictColumns: string[] = ['id']
  ): Promise<void> => {
    if (data.length === 0) return;
    
    const conflictClause = conflictColumns.join(', ');
    const columns = Object.keys(data[0]);
    const updateColumns = columns
      .filter(col => !conflictColumns.includes(col))
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');
    
    // Create placeholders for each row: (?, ?, ?, ...)
    const valuePlaceholders = data.map(() => 
      `(${columns.map(() => '?').join(', ')})`
    ).join(', ');
    
    // Flatten all values
    const values = data.flatMap(row => Object.values(row));
    
    if (updateColumns) {
      await knex.raw(`
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${valuePlaceholders}
        ON CONFLICT (${conflictClause})
        DO UPDATE SET ${updateColumns}
      `, values);
    } else {
      await knex.raw(`
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${valuePlaceholders}
        ON CONFLICT (${conflictClause}) DO NOTHING
      `, values);
    }
  },
};

export default {
  commonColumns,
  createEnumIfNotExists,
  dropEnumIfNotUsed,
  createIndexes,
  createUpdatedAtTrigger,
  dropUpdatedAtTrigger,
  createExtensions,
  addConstraints,
  addForeignKey,
  withTransaction,
  tableExists,
  columnExists,
  addColumnIfNotExists,
  dropColumnIfExists,
  validateMigration,
  financialTypes,
  seedHelpers,
};