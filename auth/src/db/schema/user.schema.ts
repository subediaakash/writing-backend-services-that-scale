
import { pgTable, serial, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    // currently this is only for email and password auth , later oauth will be added 
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    name: text("name").notNull(),
    email: text("email").unique().notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
