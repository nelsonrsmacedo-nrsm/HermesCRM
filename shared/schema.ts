import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  
  // Dados Básicos
  name: text("name").notNull(),
  clientType: text("client_type").notNull().default("PF"), // PF ou PJ
  cpfCnpj: text("cpf_cnpj"),
  rgIe: text("rg_ie"),
  birthDate: date("birth_date"),
  gender: text("gender"),
  
  // Contato
  email: text("email").notNull(),
  landlinePhone: text("landline_phone"),
  mobilePhone: text("mobile_phone"),
  website: text("website"),
  
  // Endereço
  zipCode: text("zip_code"),
  street: text("street"),
  number: text("number"),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("Brasil"),
  
  // Representante/Contato Principal
  contactName: text("contact_name"),
  contactPosition: text("contact_position"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  
  // Dados Comerciais
  businessArea: text("business_area"),
  classification: text("classification").default("potencial"), // potencial, ativo, inativo
  clientOrigin: text("client_origin"),
  status: text("status").notNull().default("ativo"), // ativo, inativo
  
  // Observações
  notes: text("notes"),
  preferences: text("preferences"),
  serviceHistory: text("service_history"),
  
  // Sistema
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Dados Básicos
  name: z.string().min(1, "Nome completo é obrigatório"),
  clientType: z.enum(["PF", "PJ"], { required_error: "Tipo de cliente é obrigatório" }),
  cpfCnpj: z.string().optional(),
  rgIe: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(["M", "F", "Outro", "Prefiro não informar"]).optional(),
  
  // Contato
  email: z.string().email("E-mail válido é obrigatório"),
  landlinePhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  website: z.string().url("URL inválida").optional(),
  
  // Endereço
  zipCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  
  // Representante/Contato Principal
  contactName: z.string().optional(),
  contactPosition: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("E-mail do contato inválido").optional(),
  
  // Dados Comerciais
  businessArea: z.string().optional(),
  classification: z.enum(["potencial", "ativo", "inativo"]).optional(),
  clientOrigin: z.string().optional(),
  status: z.enum(["ativo", "inativo"]).optional(),
  
  // Observações
  notes: z.string().optional(),
  preferences: z.string().optional(),
  serviceHistory: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
