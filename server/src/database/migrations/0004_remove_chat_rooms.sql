ALTER TABLE "messages" DROP CONSTRAINT "messages_room_id_chat_rooms_id_fk";
--> statement-breakpoint
DROP INDEX "messages_room_created_at_idx";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "room_id";--> statement-breakpoint
DROP TABLE "chat_rooms";--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");
