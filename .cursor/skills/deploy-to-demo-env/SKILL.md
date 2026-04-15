---
name: deploy-to-demo-env
description: Deploys the FinLogia application (backend and portal) to the demo environment (finlogia-demo). Use when the user asks to deploy to demo, push to demo, or test in the demo environment.
---

# Deploy to Demo Environment

This skill automates the deployment of the FinLogia application (both backend and portal) to the `finlogia-demo` Firebase project.

## Instructions

To deploy to the demo environment, simply execute the `deploy_demo.sh` script located in the `scripts` directory at the root of the project.

```bash
# Execute this from the root of the FinLogia workspace
./scripts/deploy_demo.sh
```

### What the script does:
1. **Backend Deployment**: Navigates to `apps/backend` and deploys Firebase Functions, Firestore rules, and Storage rules to the `finlogia-demo` project.
2. **Portal Deployment**: Navigates to `apps/portal/pwa-client`, dynamically generates the correct `.env.local` configuration for the demo environment based on `clients.json`, builds the Vue application, and deploys it to Firebase Hosting for `finlogia-demo`.

## Prerequisites
- The user must be authenticated with the Firebase CLI (`firebase login`) with an account that has access to the `finlogia-demo` project.
- The `jq` command-line JSON processor must be installed (it is typically available on macOS/Linux).

## Examples

**Example 1: User asks to deploy to demo**
Input: "Deploy the latest changes to the demo environment"
Action:
1. Run `./scripts/deploy_demo.sh` using the Shell tool.
2. Inform the user when the deployment is complete and provide the URL (https://finlogia-demo.web.app).

**Example 2: User asks to test in demo**
Input: "I want to test this in demo"
Action:
1. Run `./scripts/deploy_demo.sh` using the Shell tool.
2. Tell the user the demo environment has been updated and is ready for testing.
