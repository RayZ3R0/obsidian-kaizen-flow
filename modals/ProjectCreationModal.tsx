import { App, Modal } from 'obsidian';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { ProjectService, ProjectTemplateStep } from '../services/ProjectService';
import { Trash2, Plus } from 'lucide-react';
import { DateTime } from 'luxon';

const ModalContent = ({ app, onClose }: { app: App; onClose: () => void }) => {
    const [projectName, setProjectName] = React.useState("");
    const [finalTaskName, setFinalTaskName] = React.useState("Submission");
    // Default to +2 days, with time. Input type='datetime-local' requires YYYY-MM-DDTHH:mm
    const [deadline, setDeadline] = React.useState(DateTime.now().plus({ days: 2 }).toFormat("yyyy-MM-dd'T'HH:mm"));
    // Start with 1 default step
    const [steps, setSteps] = React.useState<ProjectTemplateStep[]>([
        { name: "Step 1", lead_days: 1, context: "General" }
    ]);

    const handleCreate = async () => {
        if (!projectName || !deadline) return;

        console.log("Creating project with deadline:", deadline);

        const service = new ProjectService(app);
        await service.createProject({
            projectName,
            deadline, // This is now a full ISO-like string from datetime-local
            steps,
            finalTaskName
        });
        onClose();
    };

    const updateStep = (index: number, field: keyof ProjectTemplateStep, value: any) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
    };

    const addStep = () => {
        setSteps([...steps, { name: "New Task", lead_days: 1, context: "General" }]);
    };

    const removeStep = (index: number) => {
        const newSteps = [...steps];
        newSteps.splice(index, 1);
        setSteps(newSteps);
    };

    return (
        <div style={{ padding: '10px' }}>
            <h2>Create New Project</h2>
            <div className="setting-item">
                <div className="setting-item-info">Project Name</div>
                <div className="setting-item-control">
                    <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Ep 1" />
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">
                    <div className="setting-item-name">Deadline</div>
                    <div className="setting-item-description">MM/DD/YYYY HH:MM</div>
                </div>
                <div className="setting-item-control">
                    <input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                    />
                </div>
            </div>

            <div className="setting-item">
                <div className="setting-item-info">Final Task Name</div>
                <div className="setting-item-control">
                    <input type="text" value={finalTaskName} onChange={(e) => setFinalTaskName(e.target.value)} placeholder="Submission" />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <h3>Subtasks</h3>
                <button onClick={addStep} title="Add Subtask" style={{ fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> Add Task
                </button>
            </div>

            <div style={{ marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                {steps.map((step, idx) => (
                    <div key={idx} className="kaizen-subtask-row" style={{ gap: '8px' }}>
                        <input
                            className="kaizen-subtask-input"
                            type="text"
                            value={step.name}
                            onChange={(e) => updateStep(idx, 'name', e.target.value)}
                            placeholder="Task Name"
                            style={{ flex: 3 }}
                        />
                        <input
                            type="text"
                            value={step.context}
                            onChange={(e) => updateStep(idx, 'context', e.target.value)}
                            placeholder="Context"
                            style={{ flex: 2 }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                className="kaizen-lead-days-input"
                                type="number"
                                min="0"
                                value={step.lead_days}
                                onChange={(e) => updateStep(idx, 'lead_days', parseInt(e.target.value))}
                                style={{ width: '60px' }}
                            />
                            <span style={{ fontSize: '0.8em' }}>days</span>
                        </div>
                        <button className="clickable-icon" onClick={() => removeStep(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={onClose}>Cancel</button>
                <button className="mod-cta" onClick={handleCreate}>Initialize Timeline</button>
            </div>
        </div>
    );
};

export class ProjectCreationModal extends Modal {
    root: ReactDOM.Root | null = null;

    constructor(app: App) {
        super(app);
        this.modalEl.addClass('kaizen-modal');
    }

    onOpen() {
        const { contentEl } = this;
        this.root = ReactDOM.createRoot(contentEl);
        this.root.render(
            <React.StrictMode>
                <ModalContent app={this.app} onClose={() => this.close()} />
            </React.StrictMode>
        );
    }

    onClose() {
        this.root?.unmount();
        const { contentEl } = this;
        contentEl.empty();
    }
}
