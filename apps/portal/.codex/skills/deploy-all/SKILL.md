---
description: Run the deploy_all.sh script to deploy the PWA to all configured clients. Use when the user asks to deploy to all clients, update everyone, release a new version globally, or run mass deployment.
---

# Deploy All Clients Skill

When the user wants to deploy the latest codebase to *all* clients configured in the system, you should run the `deploy_all.sh` script.

## Instructions

1.  Ensure you are on the `main` branch, as that is the source of truth for the multi-tenant deployment.
2.  Run the script using the terminal:
    ```bash
    ./deploy_all.sh
    ```
3.  The script will:
    - Run the version bump script (`bump_version.sh`) once, prompting the user to confirm the new version.
    - Run pre-deployment checks (`npm run test:run` and `vue-tsc`) once.
    - Loop through every client in `clients.json` and deploy the app to their respective Firebase Hosting environments.
4.  Since the script prompts for version bumping and confirmation, instruct the user to interact with the terminal to complete the deployment.