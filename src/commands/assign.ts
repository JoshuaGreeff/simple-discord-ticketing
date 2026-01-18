import type { ChatInputCommandInteraction, Client } from "discord.js";
import { MessageFlags } from "discord.js";
import { buildNoticeEmbed, findProjectByTag, findTicketByNumber, getDisplayTicketId, scheduleReplyDelete } from "../services/helpers.js";
import { COLORS } from "../services/colors.js";
import { getGuild, loadStore, saveStore } from "../services/storage.js";
import { updateBoard } from "../services/boardUpdate.js";

export async function handleAssign(
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

  const assignee = interaction.options.getUser("assignee", false) || interaction.user;
  if (!ticket.assignees.includes(assignee.id)) {
    ticket.assignees.push(assignee.id);
  }
  if (ticket.status !== "completed" && ticket.status !== "cancelled") {
    ticket.status = "in_progress";
    if (!ticket.startedAt) {
      ticket.startedAt = new Date().toISOString();
    }
  }
  ticket.updatedAt = new Date().toISOString();
  await saveStore(store);

  const displayId = getDisplayTicketId(project, ticket.ticketNumber);
  await interaction.reply({
    embeds: [
      buildNoticeEmbed(
        "Assigned",
        `#${displayId} assigned to <@${assignee.id}>.`,
        COLORS.success
      )
    ],
    flags: MessageFlags.Ephemeral
  });
  scheduleReplyDelete(interaction);
  await updateBoard(client, interaction.guildId!, ticket.projectId);
}

export async function handleAssignExternal(
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

  const assignee = interaction.options.getString("assignee", true).trim();
  if (!ticket.externalAssignees.includes(assignee)) {
    ticket.externalAssignees.push(assignee);
  }
  if (ticket.status !== "completed" && ticket.status !== "cancelled") {
    ticket.status = "in_progress";
    if (!ticket.startedAt) {
      ticket.startedAt = new Date().toISOString();
    }
  }
  ticket.updatedAt = new Date().toISOString();
  await saveStore(store);

  const displayId = getDisplayTicketId(project, ticket.ticketNumber);
  await interaction.reply({
    embeds: [
      buildNoticeEmbed(
        "Assigned",
        `#${displayId} assigned to ${assignee}.`,
        COLORS.success
      )
    ],
    flags: MessageFlags.Ephemeral
  });
  scheduleReplyDelete(interaction);
  await updateBoard(client, interaction.guildId!, ticket.projectId);
}

export async function handleUnassign(
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

  const assignee = interaction.options.getUser("assignee", false);
  if (assignee) {
    ticket.assignees = ticket.assignees.filter((id) => id !== assignee.id);
  } else {
    ticket.assignees = [];
    ticket.externalAssignees = [];
  }
  ticket.updatedAt = new Date().toISOString();
  await saveStore(store);

  const projectForDisplay = guildData.projects[ticket.projectId];
  const displayId = projectForDisplay
    ? getDisplayTicketId(projectForDisplay, ticket.ticketNumber)
    : ticket.id;
  await interaction.reply({
    embeds: [
      buildNoticeEmbed(
        "Unassigned",
        assignee
          ? `Removed <@${assignee.id}> from #${displayId}.`
          : `Cleared assignees for #${displayId}.`,
        COLORS.info
      )
    ],
    flags: MessageFlags.Ephemeral
  });
  scheduleReplyDelete(interaction);
  await updateBoard(client, interaction.guildId!, ticket.projectId);
}
