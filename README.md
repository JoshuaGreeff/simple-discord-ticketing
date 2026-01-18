# Simple Discord Ticketing

Lightweight ticket board using Discord slash commands and modals.

## Setup

1. Copy `.env.example` to `.env` and fill values.
2. Install deps: `npm install`
3. Start the bot: `npm start`

## Docker Compose

1. Copy `.env.example` to `.env` and fill values.
2. `docker compose up -d --build`

If `GUILD_ID` is set, commands register only in that guild (faster). If omitted, they register globally.

## Commands

- `/project show` posts the project board in the current channel.
- `/project setup` creates or updates a project (and posts/updates its board).
- `/project history` shows completed tickets for a project.
- `/project delete` deletes a project (and its tickets).
- `/ticket create` creates a ticket (requires a project tag, optional `due_date`).
- `/ticket update` updates a ticket (requires project + ticket number and `time_spent`, optional `title`).
- `/ticket assign` assigns a ticket to a user.
- `/ticket assign-external` assigns a ticket to an external assignee.
- `/ticket unassign` removes assignees from a ticket (requires project + ticket number).

## Notes

- Tickets stored locally in `data/store.db` (SQLite).
- Project tags are unique per guild but can repeat across different guilds.
