import { ApplicationCommandOptionType } from "discord.js";
import type { RESTPostAPIApplicationCommandsJSONBody } from "discord.js";

export const commands: RESTPostAPIApplicationCommandsJSONBody[] = [
  {
    name: "project",
    description: "Project commands",
    options: [
      {
        name: "show",
        description: "Show the project board in this channel",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "project",
            description: "Project tag",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
          }
        ]
      },
      {
        name: "setup",
        description: "Create or update a project",
        type: ApplicationCommandOptionType.Subcommand
      },
      {
        name: "history",
        description: "View completed tickets",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "project",
            description: "Project tag",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
          }
        ]
      },
      {
        name: "delete",
        description: "Delete the project and all tickets",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "project",
            description: "Project tag",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
          }
        ]
      }
    ]
  },
  {
    name: "ticket",
    description: "Ticket commands",
    options: [
      {
        name: "create",
        description: "Create a ticket",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "project",
            description: "Project tag",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
          },
          {
            name: "title",
            description: "Ticket title",
            type: ApplicationCommandOptionType.String,
            required: true
          },
          {
            name: "due_date",
            description: "Due date (free-form text)",
            type: ApplicationCommandOptionType.String,
            required: false
          }
        ]
      },
      {
        name: "update",
        description: "Update a ticket",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "project",
            description: "Project tag",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
          },
          {
            name: "ticket",
            description: "Ticket number",
            type: ApplicationCommandOptionType.String,
            required: true
          },
          {
            name: "time_spent",
            description: "Hours since last update (e.g. 2 or 1.5)",
            type: ApplicationCommandOptionType.Number,
            required: true
          },
          {
            name: "title",
            description: "Update ticket title",
            type: ApplicationCommandOptionType.String,
            required: false
          },
          {
            name: "due_date",
            description: "Update due date (free-form text)",
            type: ApplicationCommandOptionType.String,
            required: false
          },
          {
            name: "status",
            description: "Update status",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
              { name: "Backlog", value: "backlog" },
              { name: "Open", value: "open" },
              { name: "In Progress", value: "in_progress" },
              { name: "Completed", value: "completed" },
              { name: "Cancelled", value: "cancelled" },
              { name: "Deleted", value: "deleted" }
            ]
          }
        ]
      },
      {
        name: "assign",
        description: "Assign a ticket",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "project",
            description: "Project tag",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
          },
          {
            name: "ticket",
            description: "Ticket number",
            type: ApplicationCommandOptionType.String,
            required: true
          },
          {
            name: "assignee",
            description: "Assignee (defaults to you)",
            type: ApplicationCommandOptionType.User,
            required: false
          }
        ]
      },
      {
        name: "assign-external",
        description: "Assign a non-guild assignee",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "project",
            description: "Project tag",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
          },
          {
            name: "ticket",
            description: "Ticket number",
            type: ApplicationCommandOptionType.String,
            required: true
          },
          {
            name: "assignee",
            description: "External assignee name",
            type: ApplicationCommandOptionType.String,
            required: true
          }
        ]
      },
      {
        name: "unassign",
        description: "Unassign users from a ticket",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "ticket",
            description: "Ticket ID",
            type: ApplicationCommandOptionType.String,
            required: true
          },
          {
            name: "assignee",
            description: "Assignee to remove (omit to clear all)",
            type: ApplicationCommandOptionType.User,
            required: false
          }
        ]
      }
    ]
  }
];
