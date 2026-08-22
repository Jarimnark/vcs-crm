CREATE TABLE "account" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"types" text[] DEFAULT ARRAY['client']::text[] NOT NULL,
	"tax_id" varchar(20),
	"tax_branch" varchar(100),
	"address" text,
	"industry" varchar(100),
	"country_id" bigint,
	"default_currency" char(3) DEFAULT 'THB' NOT NULL,
	"default_payment_term" varchar(255),
	"owner_user_id" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_by_id" text,
	"updated_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name_th" varchar(255) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"address_th" text NOT NULL,
	"address_en" text NOT NULL,
	"phone" varchar(50) NOT NULL,
	"tax_id" varchar(20),
	"logo" varchar(255),
	"quotation_footer_text_th" text,
	"quotation_footer_text_en" text,
	"quotation_terms_text" text,
	"default_vat_rate" numeric(5, 2) DEFAULT '7.00' NOT NULL,
	"quotation_number_prefix" varchar(10) DEFAULT 'QUO' NOT NULL,
	"quotation_number_next" integer NOT NULL,
	"date_format" varchar(20) DEFAULT 'DD/MM/YYYY' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_single_row" CHECK ("company"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"doc_type_id" bigint NOT NULL,
	"file" varchar(255) NOT NULL,
	"original_filename" varchar(255),
	"version" smallint DEFAULT 1 NOT NULL,
	"issue_date" date,
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"is_generated" boolean DEFAULT false NOT NULL,
	"source_quotation_id" bigint,
	"created_by_id" text,
	"updated_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_generated_has_source" CHECK (NOT "document"."is_generated" OR "document"."source_quotation_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "expense" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"expense_date" date NOT NULL,
	"category" varchar(20) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" char(3) DEFAULT 'THB' NOT NULL,
	"receipt_image" varchar(255),
	"note" varchar(255),
	"incurred_by_user_id" text NOT NULL,
	"project_id" bigint,
	"meeting_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_amount_positive" CHECK ("expense"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "meeting_attendee" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"meeting_id" bigint NOT NULL,
	"person_id" bigint,
	"user_id" text,
	CONSTRAINT "meeting_attendee_exactly_one" CHECK (("meeting_attendee"."person_id" IS NOT NULL) <> ("meeting_attendee"."user_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "meeting_project" (
	"meeting_id" bigint NOT NULL,
	"project_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"agenda" text,
	"outcome_notes" text,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"meeting_date" date NOT NULL,
	"start_time" time,
	"duration_hours" numeric(4, 2),
	"mode" varchar(20) DEFAULT 'client_site' NOT NULL,
	"location" varchar(255),
	"account_id" bigint,
	"created_by_id" text,
	"updated_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_snippet" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(20) DEFAULT 'other' NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"position" varchar(255),
	"department" varchar(255),
	"email" varchar(254),
	"phone" varchar(50),
	"mobile" varchar(50),
	"line_id" varchar(100),
	"is_primary" boolean DEFAULT false NOT NULL,
	"decision_role" varchar(20),
	"created_by_id" text,
	"updated_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "picklist" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" varchar(30) NOT NULL,
	"code" varchar(50) NOT NULL,
	"label" varchar(255) NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"field" varchar(20) NOT NULL,
	"from_value" varchar(20),
	"to_value" varchar(20) NOT NULL,
	"changed_by_id" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_no" varchar(30),
	"name" varchar(255) NOT NULL,
	"account_id" bigint NOT NULL,
	"primary_person_id" bigint,
	"type" varchar(20) NOT NULL,
	"progress" smallint DEFAULT 10 NOT NULL,
	"status" varchar(10) DEFAULT 'open' NOT NULL,
	"lost_reason" varchar(255),
	"lost_note" text,
	"competitor" varchar(255),
	"expected_amount" numeric(15, 2),
	"quoted_value" numeric(15, 2),
	"currency" char(3) DEFAULT 'THB' NOT NULL,
	"expected_close_date" date,
	"owner_user_id" text NOT NULL,
	"lead_source_id" bigint,
	"followup_interval_days" smallint,
	"followup_paused" boolean DEFAULT false NOT NULL,
	"parent_project_id" bigint,
	"created_by_id" text,
	"updated_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_progress_steps" CHECK ("project"."progress" IN (10,20,30,40,50,60,70,80,90,100)),
	CONSTRAINT "project_lost_needs_reason" CHECK ("project"."status" <> 'lost' OR "project"."lost_reason" IS NOT NULL),
	CONSTRAINT "project_parent_part_only" CHECK ("project"."parent_project_id" IS NULL OR "project"."type" = 'part'),
	CONSTRAINT "project_no_self_parent" CHECK ("project"."parent_project_id" IS NULL OR "project"."parent_project_id" <> "project"."id"),
	CONSTRAINT "project_interval_consumable_only" CHECK ("project"."followup_interval_days" IS NULL OR "project"."type" = 'consumable')
);
--> statement-breakpoint
CREATE TABLE "purchase_order" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"po_number" varchar(100) NOT NULL,
	"po_date" date NOT NULL,
	"source_quotation_id" bigint,
	"amount" numeric(15, 2) NOT NULL,
	"currency" char(3) DEFAULT 'THB' NOT NULL,
	"status" varchar(20) DEFAULT 'ordered' NOT NULL,
	"is_void" boolean DEFAULT false NOT NULL,
	"created_by_id" text,
	"updated_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_cc" (
	"quotation_id" bigint NOT NULL,
	"person_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_component" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"quotation_line_id" bigint NOT NULL,
	"sequence" smallint NOT NULL,
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"item_code" varchar(100),
	"item_name" varchar(500) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_line" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"quotation_id" bigint NOT NULL,
	"sequence" smallint NOT NULL,
	"item_code" varchar(100),
	"item_name" varchar(500) NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_id" bigint,
	"moq_note" varchar(255),
	"unit_price" numeric(15, 2) NOT NULL,
	"discount_type" varchar(10),
	"discount_value" numeric(15, 2),
	"amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"unit_cost" numeric(15, 2),
	"line_cost" numeric(15, 2),
	"line_margin" numeric(15, 2),
	"image" varchar(255),
	"line_notes" text
);
--> statement-breakpoint
CREATE TABLE "quotation" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"quotation_no" varchar(30),
	"revision" smallint DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"quotation_date" date NOT NULL,
	"issued_at" timestamp with time zone,
	"bill_to_name" varchar(255),
	"bill_to_address" text,
	"bill_to_tax_id" varchar(20),
	"bill_to_branch" varchar(100),
	"attention_person_id" bigint,
	"currency" char(3) DEFAULT 'THB' NOT NULL,
	"cost_currency" char(3),
	"fx_rate_cost_to_selling" numeric(14, 6),
	"validity_text" varchar(255),
	"delivery_date_text" varchar(255),
	"payment_term_text" varchar(255),
	"incoterm_id" bigint,
	"country_of_origin_id" bigint,
	"lead_time_text" text,
	"remarks" text,
	"vat_applied" boolean DEFAULT true NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '7.00' NOT NULL,
	"wht_note" text,
	"subtotal" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"discount_total" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"vat_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"grand_total" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_cost" numeric(15, 2),
	"total_margin" numeric(15, 2),
	"salesperson_user_id" text NOT NULL,
	"created_by_id" text,
	"updated_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_issued_has_no" CHECK ("quotation"."status" = 'draft' OR "quotation"."quotation_no" IS NOT NULL),
	CONSTRAINT "quotation_issued_has_ts" CHECK ("quotation"."status" = 'draft' OR "quotation"."issued_at" IS NOT NULL),
	CONSTRAINT "quotation_totals_nonneg" CHECK ("quotation"."subtotal" >= 0 AND "quotation"."grand_total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type_id" bigint,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"due_date" date,
	"completed_date" date,
	"assignee_user_id" text NOT NULL,
	"project_id" bigint,
	"account_id" bigint,
	"person_id" bigint,
	"is_auto_generated" boolean DEFAULT false NOT NULL,
	"recurrence_parent_task_id" bigint,
	"created_by_id" text,
	"updated_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_done_has_date" CHECK ("task"."status" <> 'done' OR "task"."completed_date" IS NOT NULL),
	CONSTRAINT "task_no_self_recurrence" CHECK ("task"."recurrence_parent_task_id" IS NULL OR "task"."recurrence_parent_task_id" <> "task"."id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(254) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone_mobile" varchar(50),
	"role" varchar(20) DEFAULT 'sales_engineer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_country_id_picklist_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."picklist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_doc_type_id_picklist_id_fk" FOREIGN KEY ("doc_type_id") REFERENCES "public"."picklist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_source_quotation_id_quotation_id_fk" FOREIGN KEY ("source_quotation_id") REFERENCES "public"."quotation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_incurred_by_user_id_user_id_fk" FOREIGN KEY ("incurred_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendee" ADD CONSTRAINT "meeting_attendee_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendee" ADD CONSTRAINT "meeting_attendee_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendee" ADD CONSTRAINT "meeting_attendee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_project" ADD CONSTRAINT "meeting_project_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_project" ADD CONSTRAINT "meeting_project_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_history" ADD CONSTRAINT "project_history_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_history" ADD CONSTRAINT "project_history_changed_by_id_user_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_primary_person_id_person_id_fk" FOREIGN KEY ("primary_person_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_lead_source_id_picklist_id_fk" FOREIGN KEY ("lead_source_id") REFERENCES "public"."picklist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_parent_project_id_project_id_fk" FOREIGN KEY ("parent_project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_source_quotation_id_quotation_id_fk" FOREIGN KEY ("source_quotation_id") REFERENCES "public"."quotation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_cc" ADD CONSTRAINT "quotation_cc_quotation_id_quotation_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_cc" ADD CONSTRAINT "quotation_cc_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_component" ADD CONSTRAINT "quotation_component_quotation_line_id_quotation_line_id_fk" FOREIGN KEY ("quotation_line_id") REFERENCES "public"."quotation_line"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_line" ADD CONSTRAINT "quotation_line_quotation_id_quotation_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_line" ADD CONSTRAINT "quotation_line_unit_id_picklist_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."picklist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_attention_person_id_person_id_fk" FOREIGN KEY ("attention_person_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_incoterm_id_picklist_id_fk" FOREIGN KEY ("incoterm_id") REFERENCES "public"."picklist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_country_of_origin_id_picklist_id_fk" FOREIGN KEY ("country_of_origin_id") REFERENCES "public"."picklist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_salesperson_user_id_user_id_fk" FOREIGN KEY ("salesperson_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_type_id_picklist_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."picklist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_recurrence_parent_task_id_task_id_fk" FOREIGN KEY ("recurrence_parent_task_id") REFERENCES "public"."task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_types_gin" ON "account" USING gin ("types");--> statement-breakpoint
CREATE INDEX "account_status_owner_idx" ON "account" USING btree ("status","owner_user_id");--> statement-breakpoint
CREATE INDEX "document_project_type_idx" ON "document" USING btree ("project_id","doc_type_id","issue_date");--> statement-breakpoint
CREATE INDEX "document_source_quotation_idx" ON "document" USING btree ("source_quotation_id") WHERE "document"."source_quotation_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "expense_user_date_idx" ON "expense" USING btree ("incurred_by_user_id","expense_date");--> statement-breakpoint
CREATE INDEX "expense_project_idx" ON "expense" USING btree ("project_id") WHERE "expense"."project_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_attendee_person_uq" ON "meeting_attendee" USING btree ("meeting_id","person_id") WHERE "meeting_attendee"."person_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_attendee_user_uq" ON "meeting_attendee" USING btree ("meeting_id","user_id") WHERE "meeting_attendee"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_project_uq" ON "meeting_project" USING btree ("meeting_id","project_id");--> statement-breakpoint
CREATE INDEX "meeting_date_idx" ON "meeting" USING btree ("meeting_date");--> statement-breakpoint
CREATE INDEX "meeting_account_date_idx" ON "meeting" USING btree ("account_id","meeting_date");--> statement-breakpoint
CREATE INDEX "person_account_primary_idx" ON "person" USING btree ("account_id","is_primary");--> statement-breakpoint
CREATE UNIQUE INDEX "person_one_primary_per_account" ON "person" USING btree ("account_id") WHERE "person"."is_primary";--> statement-breakpoint
CREATE UNIQUE INDEX "picklist_kind_code_uq" ON "picklist" USING btree ("kind","code");--> statement-breakpoint
CREATE INDEX "picklist_kind_active_idx" ON "picklist" USING btree ("kind","is_active","sort_order");--> statement-breakpoint
CREATE INDEX "project_history_project_idx" ON "project_history" USING btree ("project_id","changed_at");--> statement-breakpoint
CREATE INDEX "project_history_lost_at_stage_idx" ON "project_history" USING btree ("field","to_value","changed_at");--> statement-breakpoint
CREATE INDEX "project_pipeline_idx" ON "project" USING btree ("status","progress");--> statement-breakpoint
CREATE INDEX "project_owner_idx" ON "project" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "project_account_idx" ON "project" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "project_reorder_cohort_idx" ON "project" USING btree ("type","status") WHERE "project"."type" = 'consumable';--> statement-breakpoint
CREATE INDEX "project_parent_idx" ON "project" USING btree ("parent_project_id") WHERE "project"."parent_project_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "project_close_date_idx" ON "project" USING btree ("expected_close_date") WHERE "project"."status" = 'open';--> statement-breakpoint
CREATE INDEX "purchase_order_project_date_idx" ON "purchase_order" USING btree ("project_id","po_date") WHERE NOT "purchase_order"."is_void";--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_cc_uq" ON "quotation_cc" USING btree ("quotation_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_component_seq_uq" ON "quotation_component" USING btree ("quotation_line_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_line_seq_uq" ON "quotation_line" USING btree ("quotation_id","sequence");--> statement-breakpoint
CREATE INDEX "quotation_line_item_code_idx" ON "quotation_line" USING btree ("item_code");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_no_revision_uq" ON "quotation" USING btree ("quotation_no","revision") WHERE "quotation"."quotation_no" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "quotation_project_status_idx" ON "quotation" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "quotation_awaiting_idx" ON "quotation" USING btree ("status","issued_at");--> statement-breakpoint
CREATE INDEX "quotation_no_idx" ON "quotation" USING btree ("quotation_no");--> statement-breakpoint
CREATE INDEX "task_my_tasks_idx" ON "task" USING btree ("assignee_user_id","status","due_date");--> statement-breakpoint
CREATE INDEX "task_project_idx" ON "task" USING btree ("project_id") WHERE "task"."project_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "task_recurrence_idx" ON "task" USING btree ("recurrence_parent_task_id") WHERE "task"."recurrence_parent_task_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "task_auto_idx" ON "task" USING btree ("is_auto_generated","status") WHERE "task"."is_auto_generated";
-- Search indexes (02 §4.1, §4.2, §6.2): trigram for name search and
-- quotation-line autocomplete. pg_trgm ships with Postgres contrib.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX "account_name_trgm" ON "account" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "person_name_trgm" ON "person" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "quotation_line_item_name_trgm" ON "quotation_line" USING gin ("item_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "quotation_line_item_code_trgm" ON "quotation_line" USING gin ("item_code" gin_trgm_ops);
