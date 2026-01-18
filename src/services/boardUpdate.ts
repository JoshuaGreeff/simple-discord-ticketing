import type { Client } from "discord.js";
import { buildBoardView } from "./board.js";
import { getGuild, loadStore, saveStore } from "./storage.js";

export async function updateBoard(
  client: Client,
  guildId: string,
  projectId: string
) {
  const store = await loadStore();
  const guildData = getGuild(store, guildId);
  const project = guildData.projects[projectId];
  if (!project?.board) return;

  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(project.board.channelId);
  if (!channel || !channel.isTextBased()) return;

  try {
    const message = await channel.messages.fetch(project.board.messageId);
    const { embed, components } = buildBoardView(guild.name, project, guildData, 0, 6);
    await message.edit({
      embeds: [embed],
      components
    });
  } catch {
    project.board = null;
    await saveStore(store);
  }
}
