import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
  type Interaction
} from "discord.js";
import { commands } from "./commands/definitions.js";
import { handleAutocomplete } from "./commands/autocomplete.js";
import { handleProjectSetupCommand, handleProjectDeleteCommand, handleProjectModal } from "./commands/project.js";
import { handleTicketCreate, handleProjectHistory, handleTicketModify, handleTicketHistoryClose, handleTicketHistoryPage } from "./commands/ticket.js";
import { handleAssign, handleAssignExternal, handleUnassign } from "./commands/assign.js";
import { handleBoardClose, handleBoardCommand, handleBoardPage } from "./commands/board.js";
import { buildNoticeEmbed, scheduleReplyDelete } from "./services/helpers.js";
import { COLORS } from "./services/colors.js";

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  throw new Error("Missing DISCORD_TOKEN or CLIENT_ID in environment.");
}
const token = DISCORD_TOKEN;
const clientId = CLIENT_ID;
const guildId = GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands
    });
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
  }
}

client.on("clientReady", async () => {
  await registerCommands();
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith("history-close|")) {
      await handleTicketHistoryClose(interaction);
      return;
    }
    if (interaction.customId.startsWith("board-close|")) {
      await handleBoardClose(interaction);
      return;
    }
    if (interaction.customId.startsWith("history|")) {
      await handleTicketHistoryPage(interaction);
      return;
    }
    if (interaction.customId.startsWith("board|")) {
      await handleBoardPage(interaction);
      return;
    }
  }

  if (interaction.isChatInputCommand()) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [
          buildNoticeEmbed(
            "Server Only",
            "This bot only works in servers.",
            COLORS.warning
          )
        ],
        flags: MessageFlags.Ephemeral
      });
      scheduleReplyDelete(interaction);
      return;
    }

    switch (interaction.commandName) {
      case "project": {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "show") {
          await handleBoardCommand(interaction);
        } else if (subcommand === "setup") {
          await handleProjectSetupCommand(interaction);
        } else if (subcommand === "delete") {
          await handleProjectDeleteCommand(interaction);
        } else if (subcommand === "history") {
          await handleProjectHistory(interaction);
        }
        return;
      }
      case "ticket": {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "create") {
          await handleTicketCreate(interaction, client);
        } else if (subcommand === "update") {
          await handleTicketModify(interaction, client);
        } else if (subcommand === "assign") {
          await handleAssign(interaction, client);
        } else if (subcommand === "assign-external") {
          await handleAssignExternal(interaction, client);
        } else if (subcommand === "unassign") {
          await handleUnassign(interaction, client);
        }
        return;
      }
      default:
        return;
    }
  }

  if (interaction.isModalSubmit()) {
    if (!interaction.inGuild()) return;

    if (interaction.customId === "modal:project-setup") {
      await handleProjectModal(interaction);
      return;
    }
    if (interaction.customId.startsWith("modal:project-delete:")) {
      await handleProjectModal(interaction);
      return;
    }
  }
});

client.login(token);
