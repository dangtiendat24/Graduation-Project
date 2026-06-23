import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCompanies1782144000000 implements MigrationInterface {
  name = 'CreateCompanies1782144000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "recruiter_id"   UUID         NOT NULL,
        "name"           VARCHAR(255) NOT NULL,
        "short_name"     VARCHAR(100),
        "tagline"        VARCHAR(255),
        "logo_url"       VARCHAR(500),
        "cover_url"      VARCHAR(500),
        "industry"       VARCHAR(100),
        "company_type"   VARCHAR(20),
        "size_range"     VARCHAR(20),
        "founded_year"   SMALLINT,
        "short_desc"     VARCHAR(500),
        "full_desc"      TEXT,
        "work_model"     VARCHAR(10),
        "work_language"  VARCHAR(50),
        "tech_stack"     JSONB,
        "perks"          JSONB,
        "address"        TEXT,
        "city"           VARCHAR(100),
        "website"        VARCHAR(500),
        "linkedin_url"   VARCHAR(500),
        "facebook_url"   VARCHAR(500),
        "is_published"   BOOLEAN      NOT NULL DEFAULT FALSE,
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

        CONSTRAINT "uq_companies_recruiter_id"
          UNIQUE ("recruiter_id"),

        CONSTRAINT "fk_companies_recruiter_id"
          FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE,

        CONSTRAINT "chk_companies_company_type"
          CHECK (company_type IS NULL OR company_type IN ('startup','tnhh','co_phan','fdi','tap_doan')),

        CONSTRAINT "chk_companies_size_range"
          CHECK (size_range IS NULL OR size_range IN ('1-10','11-50','51-200','201-500','501-1000','1000+')),

        CONSTRAINT "chk_companies_work_model"
          CHECK (work_model IS NULL OR work_model IN ('onsite','hybrid','remote')),

        CONSTRAINT "chk_companies_founded_year"
          CHECK (founded_year IS NULL OR (founded_year >= 1900 AND founded_year <= 2100))
      )
    `)

    await queryRunner.query(`CREATE INDEX "idx_companies_industry"  ON "companies"("industry")`)
    await queryRunner.query(`CREATE INDEX "idx_companies_city"       ON "companies"("city")`)
    await queryRunner.query(
      `CREATE INDEX "idx_companies_published" ON "companies"("recruiter_id") WHERE is_published = TRUE`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "companies" CASCADE`)
  }
}
