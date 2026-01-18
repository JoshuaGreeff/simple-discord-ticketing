import path from "path";
import Database from "better-sqlite3";
import type { GuildData, Store } from "../types.js";

const DATA_DIR = process.env.DATA_DIR || "data";
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "store.db");

type SqliteRow = Record<string, unknown>;

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      guild_id TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      tag TEXT NOT NULL,
      next_ticket_number INTEGER NOT NULL,
      board_channel_id TEXT,
      board_message_id TEXT,
      UNIQUE(guild_id, tag)
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      ticket_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      target_date TEXT,
      time_spent REAL,
      assignees TEXT NOT NULL,
      external_assignees TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, ticket_number)
    );
  `);

  const ticketColumns = new Set(
    (db.prepare("PRAGMA table_info(tickets);").all() as SqliteRow[]).map(
      (row) => row.name
    )
  );
  if (!ticketColumns.has("time_spent")) {
    db.exec("ALTER TABLE tickets ADD COLUMN time_spent REAL;");
  }
  if (!ticketColumns.has("started_at")) {
    db.exec("ALTER TABLE tickets ADD COLUMN started_at TEXT;");
  }
  if (!ticketColumns.has("completed_at")) {
    db.exec("ALTER TABLE tickets ADD COLUMN completed_at TEXT;");
  }
  if (!ticketColumns.has("external_assignees")) {
    db.exec("ALTER TABLE tickets ADD COLUMN external_assignees TEXT NOT NULL DEFAULT '[]';");
  }

  return db;
}

export function getGuild(store: Store, guildId: string): GuildData {
  if (!store.guilds[guildId]) {
    store.guilds[guildId] = {
      projects: {},
      tickets: {}
    };
  }
  return store.guilds[guildId];
}

export async function loadStore(): Promise<Store> {
  const db = getDb();
  const store: Store = { guilds: {} };

  const guildRows = db.prepare("SELECT * FROM guilds").all() as SqliteRow[];
  for (const row of guildRows) {
    const guildId = row.guild_id as string;
    store.guilds[guildId] = {
      projects: {},
      tickets: {}
    };
  }

  const projectRows = db.prepare("SELECT * FROM projects").all() as SqliteRow[];
  for (const row of projectRows) {
    const guild = getGuild(store, row.guild_id as string);
    guild.projects[row.id as string] = {
      id: row.id as string,
      name: row.name as string,
      tag: row.tag as string,
      nextTicketNumber: row.next_ticket_number as number,
      board: row.board_channel_id
        ? {
            channelId: row.board_channel_id as string,
            messageId: row.board_message_id as string
          }
        : null
    };
  }

  const ticketRows = db.prepare("SELECT * FROM tickets").all() as SqliteRow[];
  for (const row of ticketRows) {
    const projectId = row.project_id as string;
    const guildId = projectId.split(":", 1)[0];
    const guild = getGuild(store, guildId);
    guild.tickets[row.id as string] = {
      id: row.id as string,
      projectId,
      ticketNumber: row.ticket_number as number,
      title: row.title as string,
      assignees: row.assignees ? (JSON.parse(row.assignees as string) as string[]) : [],
      externalAssignees: row.external_assignees
        ? (JSON.parse(row.external_assignees as string) as string[])
        : [],
      targetDate: (row.target_date as string) || null,
      timeSpentHours:
        row.time_spent !== null && row.time_spent !== undefined
          ? Number(row.time_spent)
          : null,
      status: row.status as
        | "backlog"
        | "open"
        | "in_progress"
        | "completed"
        | "cancelled",
      startedAt: (row.started_at as string) || null,
      completedAt: (row.completed_at as string) || null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    };
  }

  db.close();
  return store;
}

export async function saveStore(store: Store): Promise<void> {
  const db = getDb();
  const insertGuild = db.prepare("INSERT INTO guilds (guild_id) VALUES (?)");
  const insertProject = db.prepare(
    "INSERT INTO projects (id, guild_id, name, tag, next_ticket_number, board_channel_id, board_message_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertTicket = db.prepare(
    "INSERT INTO tickets (id, project_id, ticket_number, title, status, target_date, time_spent, assignees, external_assignees, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const clear = db.transaction(() => {
    db.exec("DELETE FROM guilds; DELETE FROM projects; DELETE FROM tickets;");

    for (const [guildId, guildData] of Object.entries(store.guilds)) {
      insertGuild.run(guildId);

      for (const project of Object.values(guildData.projects)) {
        insertProject.run(
          project.id,
          guildId,
          project.name,
          project.tag,
          project.nextTicketNumber,
          project.board?.channelId || null,
          project.board?.messageId || null
        );
      }

      for (const ticket of Object.values(guildData.tickets)) {
        insertTicket.run(
          ticket.id,
          ticket.projectId,
          ticket.ticketNumber,
          ticket.title,
          ticket.status,
          ticket.targetDate || null,
          ticket.timeSpentHours,
          JSON.stringify(ticket.assignees || []),
          JSON.stringify(ticket.externalAssignees || []),
          ticket.startedAt || null,
          ticket.completedAt || null,
          ticket.createdAt,
          ticket.updatedAt
        );
      }
    }
  });

  clear();
  db.close();
}
