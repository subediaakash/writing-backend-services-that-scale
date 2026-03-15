import { pgTable, text, timestamp, boolean, uuid, serial } from "drizzle-orm/pg-core";
import { users } from "./user.schema";

export const sessions = pgTable("sessions", {
    // basic session info
    id: serial("id").primaryKey().notNull(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    isActive: boolean("is_active").default(true),
    refreshToken: text("refresh_token").notNull(),
    revokedAt: timestamp("revoked_at"), // here i dont have not null because  as it is only set when revoked
   // for more detailed info
    userAgent: text("user_agent").notNull(),
    ipAddress: text("ip_address").notNull(),
    lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
});
