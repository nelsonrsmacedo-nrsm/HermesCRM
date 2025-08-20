import {
  users,
  clients,
  campaigns,
  campaignAttachments,
  campaignSends,
  emailConfigurations,
  type User,
  type InsertUser,
  type InsertAdminUser,
  type Client,
  type InsertClient,
  type Campaign,
  type InsertCampaign,
  type CampaignAttachment,
  type CampaignSend,
  type EmailConfiguration,
  type InsertEmailConfiguration
} from "@shared/schema";
import { db } from "./db";
import { eq, or, ilike, desc, and, ne } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  // User management methods
  getAllUsers(excludeUserId?: number): Promise<User[]>;
  createUserByAdmin(userData: InsertAdminUser & { password: string }): Promise<User>;
  updateUserByAdmin(id: number, userData: Partial<InsertAdminUser>): Promise<User | null>;
  deleteUserById(id: number): Promise<boolean>;
  deleteAllUsersExceptAdmin(adminId: number): Promise<number>;

  createUser(user: InsertUser): Promise<User>;
  getClients(userId: number, search?: string): Promise<Client[]>;
  getClient(id: number, userId: number): Promise<Client | undefined>;
  createClient(client: InsertClient & { userId: number }): Promise<Client>;
  updateClient(id: number, userId: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number, userId: number): Promise<boolean>;

  // Campanhas de Mala Direta
  getCampaigns(userId: number): Promise<Campaign[]>;
  getCampaign(id: number, userId: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign & { userId: number }): Promise<Campaign>;
  updateCampaign(id: number, userId: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number, userId: number): Promise<boolean>;

  // Email Configuration methods
  getEmailConfiguration(userId: number): Promise<EmailConfiguration | null>;
  createEmailConfiguration(config: InsertEmailConfiguration & { userId: number }): Promise<EmailConfiguration>;
  updateEmailConfiguration(id: number, userId: number, config: Partial<InsertEmailConfiguration>): Promise<EmailConfiguration | null>;
  deleteEmailConfiguration(id: number, userId: number): Promise<boolean>;

  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  setPasswordResetToken(userId: number, token: string, expiry: Date): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: number): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private db = db; // Alias for easier access to db client

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  // User management methods
  async getAllUsers(excludeUserId?: number): Promise<User[]> {
    const query = this.db.select().from(users);
    if (excludeUserId) {
      return query.where(ne(users.id, excludeUserId));
    }
    return query;
  }

  async createUserByAdmin(userData: InsertAdminUser & { password: string }): Promise<User> {
    const [user] = await this.db.insert(users).values({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return user;
  }

  async updateUserByAdmin(id: number, userData: Partial<InsertAdminUser>): Promise<User | null> {
    const [user] = await this.db.update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  async deleteUserById(id: number): Promise<boolean> {
    // First, delete all related data
    await this.db.delete(clients).where(eq(clients.userId, id));
    await this.db.delete(campaigns).where(eq(campaigns.userId, id));
    await this.db.delete(emailConfigurations).where(eq(emailConfigurations.userId, id));

    // Then delete the user
    const result = await this.db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteAllUsersExceptAdmin(adminId: number): Promise<number> {
    // Get all users except the admin
    const usersToDelete = await this.db.select({ id: users.id }).from(users).where(ne(users.id, adminId));
    
    if (usersToDelete.length === 0) {
      return 0;
    }

    const userIds = usersToDelete.map(user => user.id);

    // Delete all related data for these users
    await this.db.delete(clients).where(eq(clients.userId, userIds[0]) || (userIds.length > 1 ? or(...userIds.slice(1).map(id => eq(clients.userId, id))) : undefined));
    await this.db.delete(campaigns).where(eq(campaigns.userId, userIds[0]) || (userIds.length > 1 ? or(...userIds.slice(1).map(id => eq(campaigns.userId, id))) : undefined));
    await this.db.delete(emailConfigurations).where(eq(emailConfigurations.userId, userIds[0]) || (userIds.length > 1 ? or(...userIds.slice(1).map(id => eq(emailConfigurations.userId, id))) : undefined));

    // Delete all users except admin
    const result = await this.db.delete(users).where(ne(users.id, adminId));
    return result.rowCount || 0;
  }

  // User methods
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getClients(userId: number, search?: string): Promise<Client[]> {
    let baseQuery = this.db.select().from(clients).where(eq(clients.userId, userId));

    if (search) {
      const searchConditions = or(
        ilike(clients.name, `%${search}%`),
        ilike(clients.email, `%${search}%`),
        ilike(clients.cpfCnpj, `%${search}%`),
        ilike(clients.mobilePhone, `%${search}%`),
        ilike(clients.landlinePhone, `%${search}%`),
        ilike(clients.city, `%${search}%`),
        ilike(clients.businessArea, `%${search}%`)
      );
      baseQuery = this.db.select().from(clients).where(and(eq(clients.userId, userId), searchConditions));
    }

    return baseQuery.orderBy(desc(clients.createdAt));
  }

  async getClient(id: number, userId: number): Promise<Client | undefined> {
    const [client] = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return client || undefined;
  }

  async createClient(client: InsertClient & { userId: number }): Promise<Client> {
    const [newClient] = await this.db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
  }

  async updateClient(id: number, userId: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await this.db
      .update(clients)
      .set(clientData)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)))
      .returning();
    return updatedClient || undefined;
  }

  async deleteClient(id: number, userId: number): Promise<boolean> {
    const result = await this.db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Campanhas de Mala Direta
  async getCampaigns(userId: number): Promise<Campaign[]> {
    return this.db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number, userId: number): Promise<Campaign | undefined> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
    return campaign || undefined;
  }

  async createCampaign(campaign: InsertCampaign & { userId: number }): Promise<Campaign> {
    const [newCampaign] = await this.db
      .insert(campaigns)
      .values({
        ...campaign,
        updatedAt: new Date()
      })
      .returning();
    return newCampaign;
  }

  async updateCampaign(id: number, userId: number, campaignData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [updatedCampaign] = await this.db
      .update(campaigns)
      .set({
        ...campaignData,
        updatedAt: new Date()
      })
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
      .returning();
    return updatedCampaign || undefined;
  }

  async deleteCampaign(id: number, userId: number): Promise<boolean> {
    const result = await this.db
      .delete(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Email Configuration methods
  async getEmailConfiguration(userId: number): Promise<EmailConfiguration | null> {
    const result = await this.db
      .select()
      .from(emailConfigurations)
      .where(and(eq(emailConfigurations.userId, userId), eq(emailConfigurations.isActive, true)))
      .limit(1);

    return result[0] || null;
  }

  async createEmailConfiguration(config: InsertEmailConfiguration & { userId: number }): Promise<EmailConfiguration> {
    // Desativar configurações anteriores
    await this.db
      .update(emailConfigurations)
      .set({ isActive: false })
      .where(eq(emailConfigurations.userId, config.userId));

    const result = await this.db.insert(emailConfigurations).values(config).returning();
    return result[0];
  }

  async updateEmailConfiguration(id: number, userId: number, config: Partial<InsertEmailConfiguration>): Promise<EmailConfiguration | null> {
    const result = await this.db
      .update(emailConfigurations)
      .set({ ...config, updatedAt: new Date() })
      .where(and(eq(emailConfigurations.id, id), eq(emailConfigurations.userId, userId)))
      .returning();

    return result[0] || null;
  }

  async deleteEmailConfiguration(id: number, userId: number): Promise<boolean> {
    const result = await this.db
      .delete(emailConfigurations)
      .where(and(eq(emailConfigurations.id, id), eq(emailConfigurations.userId, userId)));

    return result.rowCount !== null && result.rowCount > 0;
  }


  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await this.db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async setPasswordResetToken(userId: number, token: string, expiry: Date) {
    const [user] = await this.db
      .update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserByResetToken(token: string) {
    const [user] = await this.db.select().from(users)
      .where(eq(users.resetToken, token));
    return user;
  }

  async clearPasswordResetToken(userId: number) {
    const [user] = await this.db
      .update(users)
      .set({ resetToken: null, resetTokenExpiry: null })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();