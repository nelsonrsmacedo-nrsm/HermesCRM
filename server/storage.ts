import { users, clients, type User, type InsertUser, type Client, type InsertClient } from "@shared/schema";
import { db } from "./db";
import { eq, or, ilike, desc } from "drizzle-orm";
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
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

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
          ilike(clients.email, `%${search}%`)
        )
      );
    }
    
    return query.orderBy(desc(clients.createdAt));
  }

  async getClient(id: number, userId: number): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .where(eq(clients.userId, userId));
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
      .where(eq(clients.id, id))
      .where(eq(clients.userId, userId))
      .returning();
    return updatedClient || undefined;
  }

  async deleteClient(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(eq(clients.id, id))
      .where(eq(clients.userId, userId));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
