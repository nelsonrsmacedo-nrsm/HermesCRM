import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  
  // Dados Básicos
  name: text("name").notNull(),
  clientType: text("client_type").notNull().default("PF"), // PF ou PJ
  cpfCnpj: text("cpf_cnpj"),
  rgIe: text("rg_ie"),
  birthDate: text("birth_date"),
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

// Removido - será redefinido abaixo com campanhas incluídas

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

// Tabelas para Sistema de Mala Direta
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'email' ou 'whatsapp'
  subject: text("subject"), // Assunto para email
  message: text("message").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaignAttachments = pgTable("campaign_attachments", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const campaignSends = pgTable("campaign_sends", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  recipient: text("recipient").notNull(), // email ou telefone
  status: text("status").notNull().default("pending"), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relações completas do sistema
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  campaigns: many(campaigns),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, { fields: [campaigns.userId], references: [users.id] }),
  attachments: many(campaignAttachments),
  sends: many(campaignSends),
}));

export const campaignAttachmentsRelations = relations(campaignAttachments, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignAttachments.campaignId], references: [campaigns.id] }),
}));

export const campaignSendsRelations = relations(campaignSends, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignSends.campaignId], references: [campaigns.id] }),
  client: one(clients, { fields: [campaignSends.clientId], references: [clients.id] }),
}));

// Tabela para configurações de email
export const emailConfigurations = pgTable("email_configurations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpSecure: boolean("smtp_secure").default(false),
  smtpUser: text("smtp_user").notNull(),
  smtpPass: text("smtp_pass").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailConfigurationsRelations = relations(emailConfigurations, ({ one }) => ({
  user: one(users, { fields: [emailConfigurations.userId], references: [users.id] }),
}));

// Schemas para validação de campanhas
export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Nome da campanha é obrigatório"),
  type: z.enum(["email", "whatsapp"], { required_error: "Tipo de campanha é obrigatório" }),
  subject: z.string().optional(),
  message: z.string().min(1, "Mensagem é obrigatória"),
});

// Schema para configuração de email
export const insertEmailConfigurationSchema = createInsertSchema(emailConfigurations).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  smtpHost: z.string().min(1, "Host SMTP é obrigatório"),
  smtpPort: z.number().min(1).max(65535, "Porta deve estar entre 1 e 65535"),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().min(1, "Usuário SMTP é obrigatório"),
  smtpPass: z.string().min(1, "Senha SMTP é obrigatória"),
  fromEmail: z.string().email("Email válido é obrigatório"),
  fromName: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type CampaignAttachment = typeof campaignAttachments.$inferSelect;
export type CampaignSend = typeof campaignSends.$inferSelect;
export type EmailConfiguration = typeof emailConfigurations.$inferSelect;
export type InsertEmailConfiguration = z.infer<typeof insertEmailConfigurationSchema>;
