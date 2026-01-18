export type TicketStatus = "backlog" | "open" | "in_progress" | "completed" | "cancelled";

export type BoardRef = {
  channelId: string;
  messageId: string;
};

export type Project = {
  id: string;
  name: string;
  tag: string;
  nextTicketNumber: number;
  board: BoardRef | null;
};

export type Ticket = {
  id: string;
  projectId: string;
  ticketNumber: number;
  title: string;
  assignees: string[];
  externalAssignees: string[];
  targetDate: string | null;
  timeSpentHours: number | null;
  status: TicketStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuildData = {
  projects: Record<string, Project>;
  tickets: Record<string, Ticket>;
};

export type Store = {
  guilds: Record<string, GuildData>;
};
