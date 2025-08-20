import { 
  users, 
  clients, 
  campaigns,
  campaignAttachments,
  campaignSends,
  type User, 
  type InsertUser, 
  type Client, 
  type InsertClient,
  type Campaign,
  type InsertCampaign,
  type CampaignAttachment,
  type CampaignSend
} from "@shared/schema";
import { db } from "./db";
import { eq, or, ilike, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getClients(userId: number, search?: string): Promise<Client[]> {
    let query = db.select().from(clients).where(eq(clients.userId, userId));

    if (search) {
      query = query.where(
        or(
          ilike(clients.name, `%${search}%`),
          ilike(clients.email, `%${search}%`),
          ilike(clients.cpfCnpj, `%${search}%`),
          ilike(clients.mobilePhone, `%${search}%`),
          ilike(clients.landlinePhone, `%${search}%`),
          ilike(clients.city, `%${search}%`),
          ilike(clients.businessArea, `%${search}%`)
        )
      );
    }

    return query.orderBy(desc(clients.createdAt));
  }

  async getClient(id: number, userId: number): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return client || undefined;
  }

  async createClient(client: InsertClient & { userId: number }): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
  }

  async updateClient(id: number, userId: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set(clientData)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)))
      .returning();
    return updatedClient || undefined;
  }

  async deleteClient(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Campanhas de Mala Direta
  async getCampaigns(userId: number): Promise<Campaign[]> {
    return db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number, userId: number): Promise<Campaign | undefined> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
    return campaign || undefined;
  }

  async createCampaign(campaign: InsertCampaign & { userId: number }): Promise<Campaign> {
    const [newCampaign] = await db
      .insert(campaigns)
      .values({
        ...campaign,
        updatedAt: new Date()
      })
      .returning();
    return newCampaign;
  }

  async updateCampaign(id: number, userId: number, campaignData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [updatedCampaign] = await db
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
    const result = await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateUser(id: number, updates: Partial<InsertUser>) {
    return db.update(users).set(updates).where(eq(users.id, id)).returning().then(rows => rows[0]);
  }

  async getUserByEmail(email: string) {
    return db.select().from(users).where(eq(users.email, email)).then(rows => rows[0]);
  }

  async setPasswordResetToken(userId: number, token: string, expiry: Date) {
    return db.update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(users.id, userId))
      .returning()
      .then(rows => rows[0]);
  }

  async getUserByResetToken(token: string) {
    return db.select().from(users)
      .where(eq(users.resetToken, token))
      .then(rows => rows[0]);
  }

  async clearPasswordResetToken(userId: number) {
    return db.update(users)
      .set({ resetToken: null, resetTokenExpiry: null })
      .where(eq(users.id, userId))
      .returning()
      .then(rows => rows[0]);
  }
}

export const storage = new DatabaseStorage();