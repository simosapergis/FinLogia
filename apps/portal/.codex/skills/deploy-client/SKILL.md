---
description: Run the deploy_client.sh script to deploy the PWA to a specific single client. Use when the user asks to deploy, update, or release to a specific client, customer, or projectId.
---

# Deploy Single Client Skill

When the user wants to deploy the codebase to a *single specific client*, you should run the `deploy_client.sh` script.

## Instructions

1.  Identify the `projectId` the user wants to deploy to. If they haven't provided one, ask them or check `clients.json` for the available IDs.
2.  Run the script using the terminal, passing the `projectId` as the first argument:
    ```bash
    ./deploy_client.sh <projectId>
    ```
    *(Example: `./deploy_client.sh finlogia-amiseli`)*
3.  The script will:
    - Run the version bump script (`bump_version.sh`), prompting the user to confirm the new version.
    - Run pre-deployment checks (`npm run test:run` and `vue-tsc`).
    - Generate the specific `.env.local` for that client from `clients.json`.
    - Build and deploy to that specific Firebase project.
4.  Since the script prompts for version bumping, instruct the user to interact with the terminal to complete the deployment.