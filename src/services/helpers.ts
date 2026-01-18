import { EmbedBuilder } from "discord.js";
import { COLORS } from "./colors.js";
import type { GuildData, Project } from "../types.js";

export function normalizeProjectTag(raw: string) {
  const tag = raw.trim().toUpperCase();
  if (!tag || !/^[A-Z0-9]+$/.test(tag)) return null;
  return tag;
}

export function findProjectByTag(guildData: GuildData, tag: string): Project | undefined {
  return Object.values(guildData.projects).find((project) => project.tag === tag);
}

export function getNextTicketNumber(guildData: GuildData, projectId: string) {
  const project = guildData.projects[projectId];
  if (project?.nextTicketNumber) {
    return project.nextTicketNumber;
  }
  let maxNumber = 0;
  for (const ticket of Object.values(guildData.tickets)) {
    if (ticket.projectId !== projectId) continue;
    if (ticket.ticketNumber > maxNumber) maxNumber = ticket.ticketNumber;
  }
  return maxNumber + 1;
}

type AssigneeOptions = {
  getUser(name: string, required?: boolean): { id: string } | null;
};

export function parseAssigneesFromOptions(options: AssigneeOptions) {
  const ids = new Set<string>();
  const assignees = [
    options.getUser("assignee1", false),
    options.getUser("assignee2", false),
    options.getUser("assignee3", false)
  ];
  for (const user of assignees) {
    if (user) ids.add(user.id);
  }
  return [...ids];
}

export function buildNoticeEmbed(
  title: string,
  description: string,
  color: number = COLORS.info
) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);
}

export function scheduleReplyDelete(interaction: { deleteReply: () => Promise<unknown> }) {
  setTimeout(() => {
    interaction.deleteReply().catch(() => {});
  }, 5000);
}

export function getDisplayTicketId(project: Project, ticketNumber: number) {
  return `${project.tag}-${ticketNumber}`;
}

export function findTicketByDisplayId(guildData: GuildData, input: string) {
  const trimmed = input.trim();
  const [tag, numberRaw] = trimmed.split("-", 2);
  if (!tag || !numberRaw) return null;
  const ticketNumber = Number.parseInt(numberRaw, 10);
  if (!Number.isFinite(ticketNumber)) return null;
  const project = findProjectByTag(guildData, tag.toUpperCase());
  if (!project) return null;
  const ticket = Object.values(guildData.tickets).find(
    (item) => item.projectId === project.id && item.ticketNumber === ticketNumber
  );
  return ticket || null;
}

export function findTicketByNumber(
  guildData: GuildData,
  projectId: string,
  ticketNumber: number
) {
  return (
    Object.values(guildData.tickets).find(
      (item) => item.projectId === projectId && item.ticketNumber === ticketNumber
    ) || null
  );
}

type SendableChannel = {
  send: (...args: unknown[]) => Promise<{ id: string; channel: { id: string } }>;
};

export function isSendableChannel(channel: unknown): channel is SendableChannel {
  return Boolean(channel && typeof (channel as SendableChannel).send === "function");
}
