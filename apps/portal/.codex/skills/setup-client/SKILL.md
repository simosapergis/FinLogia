---
description: Run the setup_client.sh script to onboard a new client to the multi-tenant architecture. Use when the user asks to add, onboard, or set up a new client, customer, or Firebase project.
---

# Setup Client Skill

When the user wants to add a new client to the FinLogia multi-tenant architecture, you should run the `setup_client.sh` script.

## Instructions

1.  Run the script using the terminal:
    ```bash
    ./setup_client.sh
    ```
2.  The script is interactive. It will:
    - List available Firebase projects.
    - Ask for the `projectId` of the new client.
    - Ask for the Firebase config JSON (which the user must paste).
    - Append the new client's configuration to `clients.json`.
    - Ask if the user wants to deploy immediately to the new client.
3.  Guide the user through these interactive steps. If they haven't provided the config JSON yet, tell them they will need to paste it when prompted.
4.  Do NOT attempt to manually edit `clients.json` unless the script fails or the user explicitly asks for a manual edit. The script handles the JSON parsing and formatting safely.