import {
  ActionRowBuilder,
  ModalBuilder,
  MessageFlags,
  TextInputBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction
} from "discord.js";
import { buildBoardView } from "../services/board.js";
import { scheduleReplyDelete, buildNoticeEmbed, normalizeProjectTag, findProjectByTag, getNextTicketNumber } from "../services/helpers.js";
import { COLORS } from "../services/colors.js";
import { getGuild, loadStore, saveStore } from "../services/storage.js";

function buildProjectSetupModal() {
  const modal = new ModalBuilder()
    .setCustomId("modal:project-setup")
    .setTitle("Project Setup");

  const nameInput = new TextInputBuilder()
    .setCustomId("name")
    .setLabel("Project name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const tagInput = new TextInputBuilder()
    .setCustomId("tag")
    .setLabel("Project tag (A-Z/0-9, no spaces)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(tagInput)
  );

  return modal;
}

function buildProjectDeleteModal(tag: string) {
  const modal = new ModalBuilder()
    .setCustomId(`modal:project-delete:${tag}`)
    .setTitle("Delete Project");

  const confirmInput = new TextInputBuilder()
    .setCustomId("confirm")
    .setLabel("Type DELETE to confirm")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(confirmInput));
  return modal;
}

export async function handleProjectSetupCommand(
  interaction: ChatInputCommandInteraction
) {
  await interaction.showModal(buildProjectSetupModal());
}

export async function handleProjectDeleteCommand(
  interaction: ChatInputCommandInteraction
) {
  const tag = interaction.options.getString("project", true).trim().toUpperCase();
  await interaction.showModal(buildProjectDeleteModal(tag));
}

export async function handleProjectModal(interaction: ModalSubmitInteraction) {
  if (interaction.customId === "modal:project-setup") {
    const store = await loadStore();
    const guildData = getGuild(store, interaction.guildId!);

    const name = interaction.fields.getTextInputValue("name").trim();
    const tagInput = interaction.fields.getTextInputValue("tag");
    const tag = normalizeProjectTag(tagInput);
    if (!tag) {
      await interaction.reply({
        embeds: [
          buildNoticeEmbed(
            "Invalid Tag",
            "Project tag must be A-Z/0-9 with no spaces.",
            COLORS.warning
          )
        ],
        flags: MessageFlags.Ephemeral
      });
      scheduleReplyDelete(interaction);
      return;
    }

    const tagInUse = Object.values(guildData.projects).some(
      (project) => project.tag === tag
    );

    let project = findProjectByTag(guildData, tag);
    if (!project && tagInUse) {
      await interaction.reply({
        embeds: [
          buildNoticeEmbed("Tag In Use", `Tag ${tag} is already in use.`, COLORS.warning)
        ],
        flags: MessageFlags.Ephemeral
      });
      scheduleReplyDelete(interaction);
      return;
    }

    if (!project) {
      const projectId = `${interaction.guildId}:${tag}`;
      project = {
        id: projectId,
        name,
        tag,
        nextTicketNumber: getNextTicketNumber(guildData, projectId),
        board: null
      };
      guildData.projects[projectId] = project;
    } else {
      project.name = name;
    }

    const { embed, components } = buildBoardView(
      interaction.guild!.name,
      project,
      guildData,
      0,
      6
    );
    if (project.board) {
      try {
        const channel = await interaction.guild!.channels.fetch(project.board.channelId);
        if (channel?.isTextBased()) {
          const existing = await channel.messages.fetch(project.board.messageId);
          await existing.edit({ embeds: [embed], components });
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          await interaction.deleteReply().catch(() => {});
          return;
        }
      } catch {
        // Fall through to create a new board message.
      }
    }

    const response = await interaction.reply({
      embeds: [embed],
      components,
      withResponse: true
    });
    const message = response.resource!.message!;

    project.board = {
      channelId: message.channel.id,
      messageId: message.id
    };
    await saveStore(store);
    return;
  }

  if (interaction.customId.startsWith("modal:project-delete:")) {
    const store = await loadStore();
    const guildData = getGuild(store, interaction.guildId!);
    const tag = interaction.customId.split(":").pop()?.toUpperCase();
    const project = tag ? findProjectByTag(guildData, tag) : undefined;
    if (!project) {
      await interaction.reply({
        embeds: [buildNoticeEmbed("Not Found", "Project not found.", COLORS.error)],
        flags: MessageFlags.Ephemeral
      });
      scheduleReplyDelete(interaction);
      return;
    }

    const confirm = interaction.fields.getTextInputValue("confirm").trim();
    if (confirm !== "DELETE") {
      await interaction.reply({
        embeds: [buildNoticeEmbed("Cancelled", "Project delete cancelled.", COLORS.warning)],
        flags: MessageFlags.Ephemeral
      });
      scheduleReplyDelete(interaction);
      return;
    }

    if (project.board) {
      try {
        const channel = await interaction.guild!.channels.fetch(project.board.channelId);
        if (channel?.isTextBased()) {
          const existing = await channel.messages.fetch(project.board.messageId);
          await existing.delete();
        }
      } catch {
        // Ignore missing permissions or deleted messages.
      }
    }

    delete guildData.projects[project.id];
    for (const [ticketId, ticket] of Object.entries(guildData.tickets)) {
      if (ticket.projectId === project.id) {
        delete guildData.tickets[ticketId];
      }
    }
    await saveStore(store);

    await interaction.reply({
      embeds: [
        buildNoticeEmbed(
          "Project Deleted",
          `Project ${project.tag} deleted and all tickets cleared.`,
          COLORS.success
        )
      ],
      flags: MessageFlags.Ephemeral
    });
    scheduleReplyDelete(interaction);
  }
}
