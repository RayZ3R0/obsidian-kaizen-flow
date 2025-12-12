import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { DateTime } from 'luxon';
import { UrgencyCalculator, UrgencyLevel, UrgencyStatus } from '../services/UrgencyCalculator';

export const VIEW_TYPE_KAIZEN = "kaizen-adhd-view";

interface TaskItem {
    file: TFile;
    name: string;
    project: string;
    status: string;
    context: string;
    deadline: string | null;
    planned_date: string | null;
    urgency: UrgencyStatus;
}

const Countdown = ({ target }: { target: string | null }) => {
    const [diff, setDiff] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (!target) return;
        const targetDate = DateTime.fromISO(target);
        if (!targetDate.isValid) return;

        const update = () => {
            const now = DateTime.now();
            const d = targetDate.diff(now, ['days', 'hours', 'minutes', 'seconds']);
            setDiff(d.toMillis());
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [target]);

    if (!target || diff === null) return <span>--</span>;

    const isPast = diff < 0;
    const absMillis = Math.abs(diff);

    // Manual formatting
    const totalSeconds = Math.floor(absMillis / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const text = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    return (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
            {isPast ? `-${text}` : text}
        </span>
    );
};

const KaizenDashboard = ({ app }: { app: any }) => {
    const [tasks, setTasks] = React.useState<TaskItem[]>([]);
    const [activeTab, setActiveTab] = React.useState<'sprint' | 'all'>('sprint');

    const refreshTasks = React.useCallback(() => {
        // Small delay to allow proper cache update if called from event
        setTimeout(() => {
            const files = app.vault.getMarkdownFiles();
            const loadedTasks: TaskItem[] = [];

            files.forEach((file: TFile) => {
                const cache = app.metadataCache.getFileCache(file);
                if (cache?.frontmatter && cache.frontmatter.type === 'task') {
                    const fm = cache.frontmatter;
                    const urgency = UrgencyCalculator.calculate(fm.deadline, fm.planned_date);

                    loadedTasks.push({
                        file,
                        name: file.basename,
                        project: fm.project || 'No Project',
                        status: fm.status || 'todo',
                        context: fm.context || 'General',
                        deadline: fm.deadline,
                        planned_date: fm.planned_date,
                        urgency
                    });
                }
            });

            loadedTasks.sort((a, b) => {
                const scoreDiff = b.urgency.score - a.urgency.score;
                if (scoreDiff !== 0) return scoreDiff;

                // Secondary sort: Earliest Planned Date first
                const dateA = a.planned_date || "";
                const dateB = b.planned_date || "";
                return dateA.localeCompare(dateB);
            });
            setTasks(loadedTasks);
        }, 50);
    }, [app]);

    React.useEffect(() => {
        refreshTasks();
        const eventRef = app.metadataCache.on('changed', () => refreshTasks());
        // Also listen to delete in case file is removed
        const deleteRef = app.metadataCache.on('deleted', () => refreshTasks());

        return () => {
            app.metadataCache.offref(eventRef);
            app.metadataCache.offref(deleteRef);
        };
    }, [app, refreshTasks]);

    const displayTasks = React.useMemo(() => {
        if (activeTab === 'sprint') {
            return tasks.filter(t => t.status !== 'done' && t.urgency.level !== 'CHILL');
        }
        return tasks;
    }, [tasks, activeTab]);

    const openFile = (file: TFile) => {
        app.workspace.getLeaf(false).openFile(file);
    };

    const toggleComplete = async (e: React.MouseEvent, task: TaskItem) => {
        e.stopPropagation();
        const newStatus = task.status === 'done' ? 'todo' : 'done';

        try {
            await app.fileManager.processFrontMatter(task.file, (fm: any) => {
                fm.status = newStatus;
            });
            // State update should trigger via metadataCache listener
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };


    const formatDate = (isoStr: string | null) => {
        if (!isoStr) return '';
        const d = DateTime.fromISO(isoStr);
        return d.isValid ? d.toFormat('d MMMM, HH:mm') : isoStr;
    };

    return (
        <div className="kaizen-view-container">
            <div className="kaizen-header">
                <h2>Kaizen Dashboard</h2>
                <div className="kaizen-tabs">
                    <button
                        className={`kaizen-tab-button ${activeTab === 'sprint' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sprint')}
                    >
                        Sprint
                    </button>
                    <button
                        className={`kaizen-tab-button ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All Tasks
                    </button>
                </div>
            </div>

            <div className="kaizen-task-list">
                {displayTasks.map(task => {
                    const isDone = task.status === 'done';
                    const cardClass = `kaizen-task-card urgency-${task.urgency.level.toLowerCase().replace('_', '-')}` + (isDone ? ' completed' : '');

                    return (
                        <div key={task.file.path} className={cardClass} onClick={() => openFile(task.file)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={isDone}
                                    onChange={() => { }}
                                    onClick={(e) => toggleComplete(e, task)}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                                <div>
                                    <div style={{ fontWeight: 'bold', textDecoration: isDone ? 'line-through' : 'none' }}>
                                        {task.name}
                                    </div>
                                    <div style={{ fontSize: '0.8em', opacity: 0.8 }}>{task.project} • {task.context}</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {!isDone && (
                                    <div className="kaizen-urgency-badge" style={{ marginBottom: '4px' }}>
                                        {/* Show Status Label AND Countdown if deadline exists */}
                                        {task.deadline ? (
                                            <>
                                                {task.urgency.label} • <Countdown target={task.deadline} />
                                            </>
                                        ) : task.urgency.label}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.8em', opacity: 0.7 }}>
                                    Start: {formatDate(task.planned_date)}
                                    {task.deadline && task.deadline !== task.planned_date && (
                                        <> • Due: {formatDate(task.deadline)}</>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {displayTasks.length === 0 && (
                    <div style={{ textAlign: 'center', opacity: 0.5, marginTop: 50 }}>
                        {activeTab === 'sprint' ? "No urgent tasks. You're free!" : "No tasks found."}
                    </div>
                )}
            </div>
        </div>
    );
};

export class KaizenView extends ItemView {
    root: ReactDOM.Root | null = null;

    constructor(leaf: WorkspaceLeaf, private appObj: any) {
        super(leaf);
        this.appObj = appObj;
    }

    getViewType() {
        return VIEW_TYPE_KAIZEN;
    }

    getDisplayText() {
        return "Kaizen Dashboard";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.root = ReactDOM.createRoot(container);
        this.root.render(
            <React.StrictMode>
                <KaizenDashboard app={this.appObj} />
            </React.StrictMode>
        );
    }

    async onClose() {
        this.root?.unmount();
    }
}
