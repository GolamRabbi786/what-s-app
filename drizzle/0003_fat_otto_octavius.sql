CREATE TABLE "call_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text,
	"caller_id" text NOT NULL,
	"callee_id" text NOT NULL,
	"caller_name" text NOT NULL,
	"caller_avatar" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'calling' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"connected_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer
);
--> statement-breakpoint
CREATE TABLE "typing_states" (
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"mode" text DEFAULT 'typing' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "typing_states_chat_id_user_id_pk" PRIMARY KEY("chat_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_caller_id_user_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_callee_id_user_id_fk" FOREIGN KEY ("callee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_states" ADD CONSTRAINT "typing_states_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_states" ADD CONSTRAINT "typing_states_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_sessions_callee_status_idx" ON "call_sessions" USING btree ("callee_id","status");--> statement-breakpoint
CREATE INDEX "call_sessions_caller_status_idx" ON "call_sessions" USING btree ("caller_id","status");--> statement-breakpoint
CREATE INDEX "typing_states_updated_idx" ON "typing_states" USING btree ("updated_at");