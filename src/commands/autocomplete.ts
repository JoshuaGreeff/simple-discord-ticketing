import type { AutocompleteInteraction } from "discord.js";
import { getGuild, loadStore } from "../services/storage.js";

const AUTO_COMMANDS = new Set(["project", "ticket"]);

export async function handleAutocomplete(interaction: AutocompleteInteraction) {
  if (!interaction.inGuild()) {
    await interaction.respond([]);
    return;
  }

  if (!AUTO_COMMANDS.has(interaction.commandName)) return;

  const store = await loadStore();
  const guildData = getGuild(store, interaction.guildId);
  const focusedOption = interaction.options.getFocused(true);
  if (focusedOption.name !== "project") {
    await interaction.respond([]);
    return;
  }

  const focused = String(focusedOption.value || "").toUpperCase();
  const choices = Object.values(guildData.projects)
    .filter((project) => project.tag.toUpperCase().startsWith(focused))
    .slice(0, 25)
    .map((project) => ({
      name: `${project.tag} - ${project.name}`,
      value: project.tag
    }));

  await interaction.respond(choices);
}
