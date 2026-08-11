import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgentExecutionLogs1783440000000 implements MigrationInterface {
  name = 'CreateAgentExecutionLogs1783440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "agent_execution_logs" (
        "id"             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "agent_name"     VARCHAR(30)   NOT NULL,
        "application_id" UUID,
        "started_at"     TIMESTAMPTZ   NOT NULL,
        "duration_ms"    INTEGER       NOT NULL,
        "success"        BOOLEAN       NOT NULL,
        "error_message"  TEXT,
        "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT "fk_agent_execution_logs_application_id"
          FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL,

        CONSTRAINT "chk_agent_execution_logs_agent_name"
          CHECK (agent_name IN (
            'agent1_resume_parser',
            'agent2_matching',
            'agent3_interview',
            'agent4_scheduling',
            'agent5_reporting'
          ))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_agent_execution_logs_agent_name" ON "agent_execution_logs"("agent_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_agent_execution_logs_application_id" ON "agent_execution_logs"("application_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_agent_execution_logs_created_at" ON "agent_execution_logs"("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "agent_execution_logs" CASCADE`,
    );
  }
}
