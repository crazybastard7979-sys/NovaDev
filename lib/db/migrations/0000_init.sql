CREATE TYPE "plan" AS ENUM ('free', 'pro', 'team', 'enterprise');
CREATE TYPE "project_status" AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE "file_type" AS ENUM ('file', 'directory');
CREATE TYPE "deployment_status" AS ENUM ('pending', 'building', 'running', 'failed', 'stopped');
CREATE TYPE "deployment_environment" AS ENUM ('production', 'staging', 'preview');
CREATE TYPE "message_role" AS ENUM ('user', 'assistant', 'system');

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "username" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "avatar_url" text,
  "plan" "plan" NOT NULL DEFAULT 'free',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "projects" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "description" text,
  "language" text NOT NULL DEFAULT 'javascript',
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "is_public" boolean NOT NULL DEFAULT false,
  "status" "project_status" NOT NULL DEFAULT 'active',
  "last_opened_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "files" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "path" text NOT NULL,
  "type" "file_type" NOT NULL DEFAULT 'file',
  "content" text NOT NULL DEFAULT '',
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "parent_id" integer,
  "language" text,
  "size" integer DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "deployments" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "status" "deployment_status" NOT NULL DEFAULT 'pending',
  "url" text,
  "build_log" text,
  "environment" "deployment_environment" NOT NULL DEFAULT 'production',
  "env_vars" jsonb DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" serial PRIMARY KEY,
  "role" "message_role" NOT NULL,
  "content" text NOT NULL,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "templates" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "language" text NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL DEFAULT 'General',
  "tags" text[] NOT NULL DEFAULT '{}',
  "starter_files" integer NOT NULL DEFAULT 1
);
