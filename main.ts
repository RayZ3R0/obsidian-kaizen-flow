import { Plugin, WorkspaceLeaf } from 'obsidian';
import { KaizenView, VIEW_TYPE_KAIZEN } from './views/KaizenView';
import { ProjectCreationModal } from './modals/ProjectCreationModal';

export default class KaizenPlugin extends Plugin {
    async onload() {
        // Register the View
        this.registerView(
            VIEW_TYPE_KAIZEN,
            (leaf) => new KaizenView(leaf, this.app)
        );

        // Add Ribbon Icon to open the dashboard
        this.addRibbonIcon('kanban-square', 'Open Kaizen Dashboard', () => {
            this.activateView();
        });

        // Command: Create New Project
        this.addCommand({
            id: 'create-kaizen-project',
            name: 'Create New Project',
            callback: () => {
                new ProjectCreationModal(this.app).open();
            }
        });

        // Command: Open Dashboard
        this.addCommand({
            id: 'open-kaizen-dashboard',
            name: 'Open Dashboard',
            callback: () => {
                this.activateView();
            }
        });
    }

    async onunload() {
        // Cleanup if needed
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_KAIZEN);

        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            // Our view could not be found in the workspace, create a new leaf
            // in the right sidebar for now, or main. Let's do main.
            leaf = workspace.getLeaf(false);
            await leaf.setViewState({ type: VIEW_TYPE_KAIZEN, active: true });
        }

        // "Reveal" the leaf in case it is in a collapsed sidebar
        workspace.revealLeaf(leaf);
    }
}
