import type { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import { buildBoardView } from "../services/board.js";
import { buildNoticeEmbed, findProjectByTag, scheduleReplyDelete } from "../services/helpers.js";
import { COLORS } from "../services/colors.js";
import { getGuild, loadStore, saveStore } from "../services/storage.js";

export async function handleBoardCommand(interaction: ChatInputCommandInteraction) {
  const store = await loadStore();
  const guildData = getGuild(store, interaction.guildId!);
  if (Object.keys(guildData.projects).length === 0) {
    await interaction.reply({
      embeds: [
        buildNoticeEmbed(
          "No Projects",
          "Use /project setup to create a project.",
          COLORS.info
        )
      ],
      flags: MessageFlags.Ephemeral
    });
    scheduleReplyDelete(interaction);
    return;
  }

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

  const { embed, components } = buildBoardView(
    interaction.guild!.name,
    project,
    guildData,
    0,
    6
  );
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

export async function handleBoardPage(interaction: ButtonInteraction) {
  if (!interaction.inGuild() || !interaction.guild) return;
  const parts = interaction.customId.split("|");
  if (parts.length !== 3) return;
  const [, projectId, pageRaw] = parts;
  const page = Number.parseInt(pageRaw, 10);
  if (!Number.isFinite(page)) return;

  const store = await loadStore();
  const guildData = getGuild(store, interaction.guildId);
  const project = guildData.projects[projectId];
  if (!project) return;

  const { embed, components } = buildBoardView(
    interaction.guild.name,
    project,
    guildData,
    page,
    6
  );

  await interaction.update({ embeds: [embed], components });
}

export async function handleBoardClose(interaction: ButtonInteraction) {
  if (!interaction.inGuild()) return;
  await interaction.message.delete().catch(() => {});
}
