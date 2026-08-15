CREATE TYPE "public"."account_type" AS ENUM('customer', 'principal', 'partner', 'other');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('amount', 'percent');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('ordered', 'delivered', 'invoiced');--> statement-breakpoint
CREATE TYPE "public"."picklist_kind" AS ENUM('incoterm', 'unit', 'country', 'document_type', 'task_type', 'lead_source', 'lost_reason');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('consumable', 'equipment', 'part', 'service');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'issued', 'superseded');--> statement-breakpoint
CREATE TABLE "account" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "account_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"type" "account_type" DEFAULT 'customer' NOT NULL,
	"address" text,
	"tax_id" text,
	"tax_branch" text,
	"default_currency" text DEFAULT 'THB' NOT NULL,
	"lead_source" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name_th" text NOT NULL,
	"name_en" text NOT NULL,
	"address_th" text NOT NULL,
	"address_en" text NOT NULL,
	"tel" text NOT NULL,
	"tax_id" text,
	"logo_path" text,
	"thank_you_text_th" text,
	"thank_you_text_en" text
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "document_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer,
	"account_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"file_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "expense_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer,
	"incurred_by_user_id" text NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"category" text,
	"note" text,
	"receipt_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_project" (
	"meeting_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	CONSTRAINT "meeting_project_meeting_id_project_id_pk" PRIMARY KEY("meeting_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "meeting" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "meeting_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"account_id" integer NOT NULL,
	"date" date NOT NULL,
	"duration_minutes" integer,
	"notes" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_snippet" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "note_snippet_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"body" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"po_number" text NOT NULL,
	"po_date" date NOT NULL,
	"source_quotation_id" integer,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"status" "order_status" DEFAULT 'ordered' NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "person_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"account_id" integer NOT NULL,
	"name" text NOT NULL,
	"position" text,
	"email" text,
	"tel" text,
	"mobile" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "picklist" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "picklist_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kind" "picklist_kind" NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text NOT NULL,
	"changed_by_id" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"account_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" "project_type" NOT NULL,
	"progress" smallint DEFAULT 10 NOT NULL,
	"status" "project_status" DEFAULT 'open' NOT NULL,
	"lost_reason" text,
	"expected_amount" numeric(15, 2),
	"currency" text DEFAULT 'THB' NOT NULL,
	"owner_id" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_cc" (
	"quotation_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	CONSTRAINT "quotation_cc_quotation_id_person_id_pk" PRIMARY KEY("quotation_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "quotation_counter" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"last_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_line_component" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quotation_line_component_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"line_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"quantity" numeric(15, 3) DEFAULT '1' NOT NULL,
	"code" text,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_line" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quotation_line_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"quotation_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"item_code" text,
	"item_name" text NOT NULL,
	"description" text,
	"quantity" numeric(15, 3) NOT NULL,
	"unit" text DEFAULT 'ea' NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"discount_type" "discount_type",
	"discount_value" numeric(15, 4),
	"unit_cost" numeric(15, 2),
	"amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"image_path" text
);
--> statement-breakpoint
CREATE TABLE "quotation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quotation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"number" text NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"date" date NOT NULL,
	"validity_text" text,
	"delivery_date_text" text,
	"payment_term_text" text,
	"lead_time_text" text,
	"regulatory_note" text,
	"currency" text DEFAULT 'THB' NOT NULL,
	"incoterm" text,
	"country_of_origin" text,
	"vat_applied" boolean DEFAULT true NOT NULL,
	"cost_currency" text,
	"fx_rate" numeric(15, 6),
	"bill_to_name" text,
	"bill_to_address" text,
	"bill_to_tax_id" text,
	"bill_to_tax_branch" text,
	"attention_person_id" integer,
	"attention_name" text,
	"attention_email" text,
	"attention_tel" text,
	"salesperson_name" text,
	"salesperson_phone" text,
	"total_amount" numeric(15, 2),
	"vat_amount" numeric(15, 2),
	"grand_total" numeric(15, 2),
	"issued_at" timestamp,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "task_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"type" text,
	"project_id" integer,
	"account_id" integer,
	"person_id" integer,
	"assigned_to_id" text NOT NULL,
	"due_date" date,
	"done" boolean DEFAULT false NOT NULL,
	"done_at" timestamp,
	"auto" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'sales' NOT NULL,
	"phone_mobile" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_incurred_by_user_id_user_id_fk" FOREIGN KEY ("incurred_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_project" ADD CONSTRAINT "meeting_project_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_project" ADD CONSTRAINT "meeting_project_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_source_quotation_id_quotation_id_fk" FOREIGN KEY ("source_quotation_id") REFERENCES "public"."quotation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_history" ADD CONSTRAINT "project_history_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_history" ADD CONSTRAINT "project_history_changed_by_id_user_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_cc" ADD CONSTRAINT "quotation_cc_quotation_id_quotation_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_cc" ADD CONSTRAINT "quotation_cc_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_line_component" ADD CONSTRAINT "quotation_line_component_line_id_quotation_line_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."quotation_line"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_line" ADD CONSTRAINT "quotation_line_quotation_id_quotation_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_attention_person_id_person_id_fk" FOREIGN KEY ("attention_person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assigned_to_id_user_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_project_idx" ON "document" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "expense_user_idx" ON "expense" USING btree ("incurred_by_user_id");--> statement-breakpoint
CREATE INDEX "meeting_account_idx" ON "meeting" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "order_project_idx" ON "order" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "person_account_idx" ON "person" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "picklist_kind_value_uq" ON "picklist" USING btree ("kind","value");--> statement-breakpoint
CREATE INDEX "project_history_project_idx" ON "project_history" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_account_idx" ON "project" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "project_owner_idx" ON "project" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "qlc_line_idx" ON "quotation_line_component" USING btree ("line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_line_seq_uq" ON "quotation_line" USING btree ("quotation_id","sequence");--> statement-breakpoint
CREATE INDEX "quotation_project_idx" ON "quotation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "task_assigned_idx" ON "task" USING btree ("assigned_to_id","done");--> statement-breakpoint
CREATE INDEX "task_project_idx" ON "task" USING btree ("project_id");