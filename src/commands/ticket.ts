import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Client,
  type ButtonInteraction
} from "discord.js";
import { buildHistoryEmbed } from "../services/board.js";
import { buildNoticeEmbed, findProjectByTag, findTicketByDisplayId, findTicketByNumber, getDisplayTicketId, scheduleReplyDelete } from "../services/helpers.js";
import { COLORS } from "../services/colors.js";
import { getGuild, loadStore, saveStore } from "../services/storage.js";
import { updateBoard } from "../services/boardUpdate.js";

export async function handleTicketCreate(
  interaction: ChatInputCommandInteraction,
  client: Client
) {
  const store = await loadStore();
  const guildData = getGuild(store, interaction.guildId!);
  const tag = interaction.options.getString("project", true).trim().toUpperCase();
  const project = findProjectByTag(guildData, tag);
  if (!project) {
    await interaction.reply({
      embeds: [
        buildNoticeEmbed("Unknown Project", `Unknown project tag: ${tag}.`, COLORS.error)
      ],
      flags: MessageFlags.Ephemeral
    });
    scheduleReplyDelete(interaction);
    return;
  }

  const title = interaction.options.getString("title", true).trim();
  const targetDate = interaction.options.getString("due_date", false);
  const assignees: string[] = [];

  const ticketNumber = project.nextTicketNumber;
  const id = `${project.id}:${ticketNumber}`;
  project.nextTicketNumber += 1;
  guildData.tickets[id] = {
    id,
    projectId: project.id,
    ticketNumber,
    title,
    assignees,
    externalAssignees: [],
    targetDate: targetDate || null,
    timeSpentHours: null,
    status: "open",
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveStore(store);
  const displayId = getDisplayTicketId(project, ticketNumber);
  await interaction.reply({
    embeds: [buildNoticeEmbed("Ticket Created", `#${displayId} is ready.`, COLORS.success)],
    flags: MessageFlags.Ephemeral
  });
  scheduleReplyDelete(interaction);
  await updateBoard(client, interaction.guildId!, project.id);
}

export async function handleTicketModify(
  interaction: ChatInputCommandInteraction,
  client: Client
) {
  const store = await loadStore();
  const guildData = getGuild(store, interaction.guildId!);

  const tag = interaction.options.getString("project", true).trim().toUpperCase();
  const project = findProjectByTag(guildData, tag);
  if (!project) {
    await interaction.reply({
      embeds: [
        buildNoticeEmbed("Unknown Project", `Unknown project tag: ${tag}.`, COLORS.error)
      ],
      flags: MessageFlags.Ephemeral
    });
    scheduleReplyDelete(interaction);
    return;
  }

  const ticketNumber = Number.parseInt(
    interaction.options.getString("ticket", true).trim(),
    10
  );
  const ticket = Number.isFinite(ticketNumber)
    ? findTicketByNumber(guildData, project.id, ticketNumber)
    : null;
  if (!ticket) {
    await interaction.reply({
      embeds: [buildNoticeEmbed("Not Found", "Ticket not found.", COLORS.error)],
      flags: MessageFlags.Ephemeral
    });
    scheduleReplyDelete(interaction);
    return;
  }

  const timeSpent = interaction.options.getNumber("time_spent", true);
  if (!Number.isFinite(timeSpent) || Math.round(timeSpent * 100) !== timeSpent * 100) {
    await interaction.reply({
      embeds: [
        buildNoticeEmbed(
          "Invalid Time",
          "Time spent must be hours like 2 or 1.5 (up to 2 decimals).",
          COLORS.warning
        )
      ],
      flags: MessageFlags.Ephemeral
    });
    scheduleReplyDelete(interaction);
    return;
  }

  const targetDate = interaction.options.getString("due_date", false);
  const title = interaction.options.getString("title", false);
  const status = interaction.options.getString("status", false) as
    | "backlog"
    | "open"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "deleted"
    | null;

  if (targetDate) {
    ticket.targetDate = targetDate.trim();
  }
  if (title) {
    ticket.title = title.trim();
  }

  ticket.timeSpentHours = timeSpent;

  if (status === "deleted") {
    delete guildData.tickets[ticket.id];
    await saveStore(store);

    const project = guildData.projects[ticket.projectId];
    const displayId = project
      ? getDisplayTicketId(project, ticket.ticketNumber)
      : ticket.id;

    await interaction.reply({
      embeds: [
        buildNoticeEmbed("Ticket Deleted", `#${displayId} deleted.`, COLORS.warning)
      ],
      flags: MessageFlags.Ephemeral
    });
    scheduleReplyDelete(interaction);
    await updateBoard(client, interaction.guildId!, ticket.projectId);
    return;
  }

  if (status) {
    ticket.status = status;
    if (status === "in_progress" && !ticket.startedAt) {
      ticket.startedAt = new Date().toISOString();
    }
    if (status === "completed") {
      if (!ticket.startedAt) {
        ticket.startedAt = ticket.createdAt;
      }
      if (!ticket.completedAt) {
        ticket.completedAt = new Date().toISOString();
      }
    }
  }

  ticket.updatedAt = new Date().toISOString();
  await saveStore(store);

  const displayId = getDisplayTicketId(
    guildData.projects[ticket.projectId],
    ticket.ticketNumber
  );
  await interaction.reply({
    embeds: [buildNoticeEmbed("Ticket Updated", `#${displayId} saved.`, COLORS.info)],
    flags: MessageFlags.Ephemeral
  });
  scheduleReplyDelete(interaction);
  await updateBoard(client, interaction.guildId!, ticket.projectId);
}

export async function handleProjectHistory(interaction: ChatInputCommandInteraction) {
  const pageSize = 6;
  const store = await loadStore();
  const guildData = getGuild(store, interaction.guildId!);
  const tag = interaction.options.getString("project", true).trim().toUpperCase();
  const project = findProjectByTag(guildData, tag);
  if (!project) {
    await interaction.reply({
      embeds: [
        buildNoticeEmbed("Unknown Project", `Unknown project tag: ${tag}.`, COLORS.error)
      ],
      flags: MessageFlags.Ephemeral
    });
    scheduleReplyDelete(interaction);
    return;
  }
  const tickets = Object.values(guildData.tickets).filter(
    (ticket) => ticket.status === "completed" && ticket.projectId === project.id
  );
  const embed = buildHistoryEmbed(interaction.guild!.name, project, tickets, 0, pageSize);
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`history|${project.id}|0`)
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`history|${project.id}|1`)
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(totalPages <= 1),
    new ButtonBuilder()
      .setCustomId(`history-close|${project.id}`)
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}

export async function handleTicketHistoryPage(interaction: ButtonInteraction) {
  if (!interaction.inGuild() || !interaction.guild) return;
  const pageSize = 6;
  const parts = interaction.customId.split("|");
  if (parts.length !== 3) return;
  const [, projectId, pageRaw] = parts;
  const page = Number.parseInt(pageRaw, 10);
  if (!Number.isFinite(page)) return;

  const store = await loadStore();
  const guildData = getGuild(store, interaction.guildId);
  const project = guildData.projects[projectId];
  if (!project) return;

  const tickets = Object.values(guildData.tickets).filter(
    (ticket) => ticket.status === "completed" && ticket.projectId === project.id
  );
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const embed = buildHistoryEmbed(
    interaction.guild.name,
    project,
    tickets,
    safePage,
    pageSize
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`history|${project.id}|${safePage - 1}`)
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage <= 0),
    new ButtonBuilder()
      .setCustomId(`history|${project.id}|${safePage + 1}`)
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`history-close|${project.id}`)
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleTicketHistoryClose(interaction: ButtonInteraction) {
  if (!interaction.inGuild()) return;
  await interaction.deleteReply().catch(() => {});
}
