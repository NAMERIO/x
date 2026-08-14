ALTER TABLE "roles" ADD COLUMN "color" varchar(7);--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "roles_is_system_idx" ON "roles" USING btree ("is_system");--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_color_format_check" CHECK ("roles"."color" IS NULL OR "roles"."color" ~ '^#[0-9A-Fa-f]{6}$');--> statement-breakpoint
INSERT INTO "permissions" ("identifier", "description") VALUES
	('MANAGE_APP', 'Manage application-wide administrative settings.'),
	('MANAGE_MEMBERS', 'Manage community members and their role assignments.'),
	('MANAGE_ROLES', 'Create, edit, delete, and configure roles.'),
	('MANAGE_MESSAGES', 'Moderate messages created by community members.'),
	('MANAGE_ANNOUNCEMENTS', 'Create, edit, and remove announcements.'),
	('MANAGE_CALLS', 'Moderate and manage community calls.'),
	('CHANGE_BRANDING', 'Change the application name, logo, and branding.'),
	('SEND_MESSAGES', 'Send messages in community conversations.'),
	('MENTION_EVERYONE', 'Notify every member in a conversation.'),
	('JOIN_CALLS', 'Join community voice and video calls.'),
	('START_CALLS', 'Start new community voice and video calls.')
ON CONFLICT ("identifier") DO UPDATE SET "description" = EXCLUDED."description";--> statement-breakpoint
UPDATE "roles" SET "is_system" = true WHERE "name" IN ('Owner', 'Member');--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permissions"."id"
FROM "roles"
CROSS JOIN "permissions"
WHERE "roles"."name" = 'Member'
	AND "permissions"."identifier" IN ('SEND_MESSAGES', 'JOIN_CALLS', 'START_CALLS')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
