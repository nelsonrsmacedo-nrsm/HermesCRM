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
import MemoryStore from "memorystore";

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

export class MemStorage implements IStorage {
  private users = new Map<number, User>();
  private clients = new Map<number, Client>();
  private campaigns = new Map<number, Campaign>();
  private emailConfigurations = new Map<number, EmailConfiguration>();
  private nextUserId = 1;
  private nextClientId = 1;
  private nextCampaignId = 1;
  private nextEmailConfigId = 1;
  
  sessionStore: session.Store;

  constructor() {
    // Use memory store for sessions instead of PostgreSQL
    const MemoryStoreSession = MemoryStore(session);
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) return user;
    }
    return undefined;
  }

  async getAllUsers(excludeUserId?: number): Promise<User[]> {
    const allUsers = Array.from(this.users.values());
    if (excludeUserId) {
      return allUsers.filter(user => user.id !== excludeUserId);
    }
    return allUsers;
  }

  async createUserByAdmin(userData: InsertAdminUser & { password: string }): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      ...userData,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserByAdmin(id: number, userData: Partial<InsertAdminUser>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = { ...user, ...userData, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUserById(id: number): Promise<boolean> {
    // Delete related data first
    for (const [clientId, client] of Array.from(this.clients.entries())) {
      if (client.userId === id) {
        this.clients.delete(clientId);
      }
    }
    for (const [campaignId, campaign] of Array.from(this.campaigns.entries())) {
      if (campaign.userId === id) {
        this.campaigns.delete(campaignId);
      }
    }
    for (const [configId, config] of Array.from(this.emailConfigurations.entries())) {
      if (config.userId === id) {
        this.emailConfigurations.delete(configId);
      }
    }
    
    return this.users.delete(id);
  }

  async deleteAllUsersExceptAdmin(adminId: number): Promise<number> {
    const usersToDelete = Array.from(this.users.keys()).filter(id => id !== adminId);
    
    for (const userId of usersToDelete) {
      await this.deleteUserById(userId);
    }
    
    return usersToDelete.length;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      ...userData,
      role: "user",
      status: "active",
      canAccessMaladireta: true,
      canAccessEmailConfig: true,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getClients(userId: number, search?: string): Promise<Client[]> {
    let userClients = Array.from(this.clients.values()).filter(client => client.userId === userId);
    
    if (search) {
      const searchTerm = search.toLowerCase();
      userClients = userClients.filter(client => 
        client.name.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm) ||
        (client.cpfCnpj && client.cpfCnpj.toLowerCase().includes(searchTerm)) ||
        (client.mobilePhone && client.mobilePhone.includes(searchTerm)) ||
        (client.landlinePhone && client.landlinePhone.includes(searchTerm)) ||
        (client.city && client.city.toLowerCase().includes(searchTerm)) ||
        (client.businessArea && client.businessArea.toLowerCase().includes(searchTerm))
      );
    }
    
    return userClients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getClient(id: number, userId: number): Promise<Client | undefined> {
    const client = this.clients.get(id);
    return client && client.userId === userId ? client : undefined;
  }

  async createClient(clientData: InsertClient & { userId: number }): Promise<Client> {
    const client: Client = {
      id: this.nextClientId++,
      ...clientData,
      // Convert undefined to null for required schema compatibility
      number: clientData.number ?? null,
      cpfCnpj: clientData.cpfCnpj ?? null,
      rgIe: clientData.rgIe ?? null,
      birthDate: clientData.birthDate ?? null,
      gender: clientData.gender ?? null,
      landlinePhone: clientData.landlinePhone ?? null,
      mobilePhone: clientData.mobilePhone ?? null,
      website: clientData.website ?? null,
      zipCode: clientData.zipCode ?? null,
      street: clientData.street ?? null,
      complement: clientData.complement ?? null,
      neighborhood: clientData.neighborhood ?? null,
      city: clientData.city ?? null,
      state: clientData.state ?? null,
      country: clientData.country ?? "Brasil",
      contactName: clientData.contactName ?? null,
      contactPosition: clientData.contactPosition ?? null,
      contactPhone: clientData.contactPhone ?? null,
      contactEmail: clientData.contactEmail ?? null,
      businessArea: clientData.businessArea ?? null,
      classification: clientData.classification ?? "potencial",
      clientOrigin: clientData.clientOrigin ?? null,
      status: clientData.status ?? "ativo",
      notes: clientData.notes ?? null,
      preferences: clientData.preferences ?? null,
      serviceHistory: clientData.serviceHistory ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clients.set(client.id, client);
    return client;
  }

  async updateClient(id: number, userId: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client || client.userId !== userId) return undefined;
    
    const updatedClient = { ...client, ...clientData, updatedAt: new Date() };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number, userId: number): Promise<boolean> {
    const client = this.clients.get(id);
    if (!client || client.userId !== userId) return false;
    
    return this.clients.delete(id);
  }

  async getCampaigns(userId: number): Promise<Campaign[]> {
    return Array.from(this.campaigns.values())
      .filter(campaign => campaign.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCampaign(id: number, userId: number): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    return campaign && campaign.userId === userId ? campaign : undefined;
  }

  async createCampaign(campaignData: InsertCampaign & { userId: number }): Promise<Campaign> {
    const campaign: Campaign = {
      id: this.nextCampaignId++,
      ...campaignData,
      subject: campaignData.subject ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async updateCampaign(id: number, userId: number, campaignData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign || campaign.userId !== userId) return undefined;
    
    const updatedCampaign = { ...campaign, ...campaignData, updatedAt: new Date() };
    this.campaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }

  async deleteCampaign(id: number, userId: number): Promise<boolean> {
    const campaign = this.campaigns.get(id);
    if (!campaign || campaign.userId !== userId) return false;
    
    return this.campaigns.delete(id);
  }

  async getEmailConfiguration(userId: number): Promise<EmailConfiguration | null> {
    for (const config of Array.from(this.emailConfigurations.values())) {
      if (config.userId === userId && config.isActive) {
        return config;
      }
    }
    return null;
  }

  async createEmailConfiguration(configData: InsertEmailConfiguration & { userId: number }): Promise<EmailConfiguration> {
    // Deactivate previous configurations
    for (const [id, config] of Array.from(this.emailConfigurations.entries())) {
      if (config.userId === configData.userId) {
        this.emailConfigurations.set(id, { ...config, isActive: false });
      }
    }
    
    const config: EmailConfiguration = {
      id: this.nextEmailConfigId++,
      ...configData,
      smtpSecure: configData.smtpSecure ?? false,
      fromName: configData.fromName ?? null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.emailConfigurations.set(config.id, config);
    return config;
  }

  async updateEmailConfiguration(id: number, userId: number, configData: Partial<InsertEmailConfiguration>): Promise<EmailConfiguration | null> {
    const config = this.emailConfigurations.get(id);
    if (!config || config.userId !== userId) return null;
    
    const updatedConfig = { ...config, ...configData, updatedAt: new Date() };
    this.emailConfigurations.set(id, updatedConfig);
    return updatedConfig;
  }

  async deleteEmailConfiguration(id: number, userId: number): Promise<boolean> {
    const config = this.emailConfigurations.get(id);
    if (!config || config.userId !== userId) return false;
    
    return this.emailConfigurations.delete(id);
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async setPasswordResetToken(userId: number, token: string, expiry: Date): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, resetToken: token, resetTokenExpiry: expiry, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.resetToken === token) return user;
    }
    return undefined;
  }

  async clearPasswordResetToken(userId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, resetToken: null, resetTokenExpiry: null, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
}

// Use in-memory storage instead of database storage
export const storage = new MemStorage();

// Bootstrap admin user for development
export async function bootstrapAdminUser() {
  if (process.env.NODE_ENV !== "development") return;
  
  // Check if any admin users exist
  const allUsers = await storage.getAllUsers();
  const adminUsers = allUsers.filter(user => user.role === "admin");
  
  if (adminUsers.length === 0) {
    console.log("No admin user found. Creating default admin user...");
    
    // Create default admin user (use a more secure password in real development)
    const { hashPassword } = await import("./auth");
    const hashedPassword = await hashPassword("admin123");
    
    const adminUser = await storage.createUserByAdmin({
      username: "admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin",
      status: "active",
      canAccessMaladireta: true,
      canAccessEmailConfig: true,
    });
    
    console.log(`Admin user created: ${adminUser.username} (ID: ${adminUser.id})`);
    console.log("Login credentials: admin / admin123");
  }
}