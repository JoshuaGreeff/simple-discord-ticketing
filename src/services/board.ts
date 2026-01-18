import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { GuildData, Project, Ticket } from "../types.js";
import { COLORS } from "./colors.js";
import { getDisplayTicketId } from "./helpers.js";

function formatAssignees(assignees: string[]) {
  if (!assignees || assignees.length === 0) return "Unassigned";
  return assignees.map((id) => `<@${id}>`).join(", ");
}

function formatStatus(status: Ticket["status"]) {
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "in_progress") return "In Progress";
  if (status === "backlog") return "Backlog";
  return "Open";
}

function formatTimestamp(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function formatHours(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  const rounded = Math.round(value * 100) / 100;
  const text = rounded
    .toFixed(2)
    .replace(/\\.00$/, "")
    .replace(/(\\.\\d)0$/, "$1");
  return `${text}h`;
}

function buildStatusLine(ticket: Ticket, mode: "board" | "history") {
  if (mode === "history") {
    return `*${formatStatus(ticket.status)} | Started: ${formatTimestamp(ticket.startedAt)} | Completed: ${formatTimestamp(ticket.completedAt)}*`;
  }
  const target = ticket.targetDate ? ` | ${ticket.targetDate}` : "";
  return `*${formatStatus(ticket.status)}*${target}`;
}

function ticketLine(ticket: Ticket, project: Project, mode: "board" | "history") {
  const title = ticket.title.length > 60 ? `${ticket.title.slice(0, 57)}...` : ticket.title;
  const assignees = formatAssignees(ticket.assignees);
  const displayId = getDisplayTicketId(project, ticket.ticketNumber);
  const lines = [
    `**${displayId}: ${title}**`,
    buildStatusLine(ticket, mode),
    `Assignees: ${assignees}`
  ];
  if (mode === "history") {
    lines.push(`Time spent: ${formatHours(ticket.timeSpentHours)}`);
  }
  return lines.join("\n");
}

export function buildBoardView(
  guildName: string,
  project: Project,
  guildData: GuildData,
  page = 0,
  pageSize = 6
) {
  const projectLabel = `${project.name} (${project.tag})`;
  const allTickets = Object.values(guildData.tickets).filter(
    (ticket) => ticket.projectId === project.id
  );
  const openTickets = allTickets.filter(
    (ticket) => ticket.status !== "completed" && ticket.status !== "cancelled"
  );
  const totalPages = Math.max(1, Math.ceil(openTickets.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  const pageTickets = openTickets.slice(start, start + pageSize);

  const embed = new EmbedBuilder()
    .setTitle(`Ticket Board - ${projectLabel}`)
    .setColor(COLORS.board)
    .setFooter({ text: `Page ${safePage + 1}/${totalPages}` });

  const lines = pageTickets.map((ticket) => ticketLine(ticket, project, "board"));
  embed.setDescription(lines.length ? lines.join("\n") : "No tickets.");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`board|${project.id}|${safePage - 1}`)
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage <= 0),
    new ButtonBuilder()
      .setCustomId(`board|${project.id}|${safePage + 1}`)
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`board-close|${project.id}`)
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row], page: safePage, totalPages };
}

export function buildHistoryEmbed(
  guildName: string,
  project: Project,
  tickets: Ticket[],
  page: number,
  pageSize: number
) {
  const projectLabel = `${project.name} (${project.tag})`;
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  const pageTickets = tickets.slice(start, start + pageSize);

  const embed = new EmbedBuilder()
    .setTitle(`Ticket History - ${projectLabel}`)
    .setColor(COLORS.history)
    .setFooter({ text: `Page ${safePage + 1}/${totalPages}` });

  const lines = pageTickets.map((ticket) => ticketLine(ticket, project, "history"));
  embed.setDescription(lines.length ? lines.join("\n") : "No tickets.");

  return embed;
}
