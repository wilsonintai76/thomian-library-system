/**
 * DbMigrationWizard.tsx
 * 5-step modal wizard that guides an administrator through migrating
 * the Thomian library system from SQLite (Phase 1) to PostgreSQL (Phase 2).
 *
 * Steps:
 *   1  STATUS      – Show current DB info and explain what will happen
 *   2  CREDENTIALS – Enter + test PostgreSQL connection details
 *   3  BACKUP      – Download a full dumpdata JSON export
 *   4  INSTRUCTIONS – Exact docker-compose / .env changes to apply
 *   5  VERIFY      – Confirm the new PostgreSQL connection is live
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Database, ArrowRight, ArrowLeft, CheckCircle, Loader2,
    Download, Copy, Check, Server, AlertTriangle, RefreshCw, Terminal,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DbStatus {
    vendor: 'sqlite' | 'postgresql' | string;
    db_name: string;
    size_bytes: number | null;
    counts: { books: number; patrons: number; loans: number; transactions: number };
}

interface PgCreds {
    host: string;
    port: string;
    name: string;
    user: string;
    password: string;
}

type Step = 'status' | 'credentials' | 'backup' | 'instructions' | 'verify';

const STEPS: Step[] = ['status', 'credentials', 'backup', 'instructions', 'verify'];
const STEP_LABELS: Record<Step, string> = {
    status:       '1  Status',
    credentials:  '2  Credentials',
    backup:       '3  Backup',
    instructions: '4  Instructions',
    verify:       '5  Verify',
};

// ─── API helpers (self-contained — no dependency on realApi.ts) ───────────────

function getToken(): string | null { return localStorage.getItem('thomian_auth_token'); }
function authHeaders(): HeadersInit {
    const tok = getToken();
    return { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Token ${tok}` } : {}) };
}
async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
    const r = await fetch(`/api${path}`, { headers: authHeaders(), ...opts });
    if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || body.detail || `HTTP ${r.status}`);
    }
    return r.json() as Promise<T>;
}

// ─── Small reusable pieces ───────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button
            onClick={copy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
        >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <CopyButton text={code} />
            </div>
            <pre className="bg-slate-900 text-emerald-400 rounded-2xl p-5 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono">
                {code}
            </pre>
        </div>
    );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex flex-col items-center bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
            <span className="text-2xl font-black">{value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</span>
        </div>
    );
}

// ─── Step components ─────────────────────────────────────────────────────────

function StepStatus({ dbStatus, onNext }: { dbStatus: DbStatus | null; onNext: () => void }) {
    const isPostgres = dbStatus?.vendor === 'postgresql';
    const sizeMb = dbStatus?.size_bytes ? (dbStatus.size_bytes / 1024 / 1024).toFixed(2) : null;
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Current Database</h3>
                <p className="text-slate-500 font-medium mt-1 text-sm">
                    This wizard migrates all data from SQLite to PostgreSQL. The process takes about 5 minutes.
                </p>
            </div>

            {!dbStatus ? (
                <div className="flex items-center gap-3 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Checking database…</span></div>
            ) : (
                <>
                    <div className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-white">
                        <div className={`p-3 rounded-xl ${isPostgres ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            <Database className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-black text-lg uppercase tracking-tight">
                                {isPostgres ? 'PostgreSQL' : 'SQLite'}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">{dbStatus.db_name}{sizeMb ? ` · ${sizeMb} MB` : ''}</p>
                        </div>
                        {isPostgres && (
                            <span className="ml-auto flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1.5 rounded-xl">
                                <CheckCircle className="h-3.5 w-3.5" /> ACTIVE
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3 flex-wrap">
                        <StatPill label="Books"        value={dbStatus.counts.books} />
                        <StatPill label="Patrons"      value={dbStatus.counts.patrons} />
                        <StatPill label="Loans"        value={dbStatus.counts.loans} />
                        <StatPill label="Transactions" value={dbStatus.counts.transactions} />
                    </div>

                    {isPostgres ? (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                            <p className="text-sm text-emerald-800 font-medium">
                                PostgreSQL is already active. No migration needed.
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800 font-medium">
                                Brief downtime is required while you restart the Docker container with new settings.
                                All data will be preserved.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function StepCredentials({
    creds, setCreds, testResult, testing, onTest, onNext, onBack,
}: {
    creds: PgCreds;
    setCreds: (c: PgCreds) => void;
    testResult: { success: boolean; error?: string } | null;
    testing: boolean;
    onTest: () => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const field = (key: keyof PgCreds, label: string, type = 'text', placeholder = '') => (
        <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{label}</label>
            <input
                type={type}
                value={creds[key]}
                onChange={e => setCreds({ ...creds, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-blue-400 outline-none font-medium text-sm transition-colors bg-white"
            />
        </div>
    );
    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">PostgreSQL Credentials</h3>
                <p className="text-slate-500 font-medium mt-1 text-sm">
                    Enter the connection details for your target PostgreSQL server. The test is read-only — it will not change anything.
                </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">{field('host', 'Host', 'text', 'localhost or db')}</div>
                <div>{field('port', 'Port', 'text', '5432')}</div>
            </div>
            {field('name', 'Database Name', 'text', 'thomian_db')}
            {field('user', 'Username', 'text', 'postgres')}
            {field('password', 'Password', 'password', '••••••••')}

            <button
                onClick={onTest}
                disabled={testing || !creds.host || !creds.name || !creds.user || !creds.password}
                className="w-full py-4 rounded-2xl border-2 border-blue-200 text-blue-700 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 disabled:opacity-40 transition-all"
            >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                {testing ? 'Testing…' : 'Test Connection'}
            </button>

            {testResult && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${testResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    {testResult.success
                        ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                        : <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    }
                    <p className={`text-sm font-medium ${testResult.success ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {testResult.success ? 'Connection successful!' : testResult.error}
                    </p>
                </div>
            )}
        </div>
    );
}

function StepBackup({ downloading, downloaded, onDownload, onNext, onBack }: {
    downloading: boolean;
    downloaded: boolean;
    onDownload: () => void;
    onNext: () => void;
    onBack: () => void;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Create a Backup</h3>
                <p className="text-slate-500 font-medium mt-1 text-sm">
                    Download a full JSON export of all your data before switching databases.
                    Save it somewhere safe — you can use it with <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">manage.py loaddata</code> to restore.
                </p>
            </div>

            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center gap-4">
                <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center ${downloaded ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {downloaded ? <CheckCircle className="h-8 w-8" /> : <Download className="h-8 w-8" />}
                </div>
                <div className="text-center">
                    <p className="font-black text-lg">
                        {downloaded ? 'Backup downloaded!' : 'thomian_backup_[today].json'}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        {downloaded ? 'Keep this file safe before proceeding.' : 'All books, patrons, loans, and transactions.'}
                    </p>
                </div>
                <button
                    onClick={onDownload}
                    disabled={downloading}
                    className="px-8 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 hover:bg-blue-700 disabled:opacity-40 shadow-xl shadow-blue-100 transition-all"
                >
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {downloading ? 'Preparing…' : downloaded ? 'Download Again' : 'Download Backup'}
                </button>
            </div>

            {!downloaded && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium">You must download the backup before continuing.</p>
                </div>
            )}
        </div>
    );
}

function StepInstructions({ creds, onNext, onBack }: {
    creds: PgCreds;
    onNext: () => void;
    onBack: () => void;
}) {
    const envBlock = `# In your .env file — change these lines:
DB_ENGINE=postgresql
DB_HOST=${creds.host || 'db'}
DB_PORT=${creds.port || '5432'}
DB_NAME=${creds.name || 'thomian_db'}
DB_USER=${creds.user || 'postgres'}
DB_PASSWORD=${creds.password ? '***your-password***' : 'your_password'}`;

    const composeBlock = `# In docker-compose.yml:
#
# 1. Uncomment the entire  db:  service block at the top.
#
# 2. In the backend service, replace:
#      - DB_ENGINE=sqlite
#      - DB_PATH=/app/data/db.sqlite3
#    with:
#      - DB_ENGINE=postgresql
#      - DB_HOST=${creds.host || 'db'}
#      - DB_PORT=${creds.port || '5432'}
#
# 3. Uncomment the  depends_on:  block under backend.
#
# 4. Uncomment  postgres_data:  in the volumes section.`;

    const restartBlock = `# Restart the stack and apply migrations:
docker compose down
docker compose up -d
docker compose exec backend python manage.py migrate

# Then load your backup:
docker compose cp ./thomian_backup_*.json backend:/app/data/backup.json
docker compose exec backend python manage.py loaddata /app/data/backup.json`;

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Apply the Changes</h3>
                <p className="text-slate-500 font-medium mt-1 text-sm">
                    Make these changes on your server host, then restart the container stack.
                </p>
            </div>

            <CodeBlock label="1 · Update .env" code={envBlock} />
            <CodeBlock label="2 · Update docker-compose.yml" code={composeBlock} />
            <CodeBlock label="3 · Restart + Migrate + Load" code={restartBlock} />

            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <Terminal className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 font-medium">
                    After the stack is back up, return here and click <strong>Verify</strong> to confirm PostgreSQL is active.
                </p>
            </div>
        </div>
    );
}

function StepVerify({ dbStatus, loading, onRefresh, onClose }: {
    dbStatus: DbStatus | null;
    loading: boolean;
    onRefresh: () => void;
    onClose: () => void;
}) {
    const isPostgres = dbStatus?.vendor === 'postgresql';
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Verify Migration</h3>
                <p className="text-slate-500 font-medium mt-1 text-sm">
                    After restarting the container with the new settings, click <strong>Check Status</strong> to confirm.
                </p>
            </div>

            {dbStatus && (
                <div className={`flex items-center gap-4 p-6 rounded-3xl border-2 ${isPostgres ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`p-3 rounded-xl ${isPostgres ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        <Database className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                        <p className="font-black text-xl uppercase tracking-tight">
                            {isPostgres ? '✓ PostgreSQL Active' : 'Still showing SQLite'}
                        </p>
                        <p className="text-sm text-slate-500 font-medium">{dbStatus.db_name}</p>
                        {isPostgres && (
                            <div className="flex gap-3 mt-3 flex-wrap">
                                <StatPill label="Books"   value={dbStatus.counts.books} />
                                <StatPill label="Patrons" value={dbStatus.counts.patrons} />
                                <StatPill label="Loans"   value={dbStatus.counts.loans} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!isPostgres && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium">
                        Still on SQLite. Make sure you have applied the changes and restarted Docker, then refresh.
                    </p>
                </div>
            )}

            <button
                onClick={onRefresh}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-50 transition-all"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {loading ? 'Checking…' : 'Check Status'}
            </button>

            {isPostgres && (
                <button
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all"
                >
                    <CheckCircle className="h-4 w-4" />
                    Migration Complete — Close
                </button>
            )}
        </div>
    );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

interface DbMigrationWizardProps {
    onClose: () => void;
}

const DbMigrationWizard: React.FC<DbMigrationWizardProps> = ({ onClose }) => {
    const [step, setStep]             = useState<Step>('status');
    const [dbStatus, setDbStatus]     = useState<DbStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [creds, setCreds]           = useState<PgCreds>({ host: 'db', port: '5432', name: 'thomian_db', user: 'postgres', password: '' });
    const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
    const [testing, setTesting]       = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloaded, setDownloaded]   = useState(false);

    const loadStatus = useCallback(async () => {
        setStatusLoading(true);
        try {
            const s = await apiFetch<DbStatus>('/system-config/db_status/');
            setDbStatus(s);
        } catch {
            // ignore — remains null
        } finally {
            setStatusLoading(false);
        }
    }, []);

    useEffect(() => { loadStatus(); }, [loadStatus]);

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const r = await apiFetch<{ success: boolean; error?: string }>(
                '/system-config/db_test_connection/',
                { method: 'POST', body: JSON.stringify(creds) },
            );
            setTestResult(r);
        } catch (e: unknown) {
            setTestResult({ success: false, error: e instanceof Error ? e.message : String(e) });
        } finally {
            setTesting(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const tok = localStorage.getItem('thomian_auth_token');
            const r = await fetch('/api/system-config/db_export/', {
                headers: tok ? { Authorization: `Token ${tok}` } : {},
            });
            if (!r.ok) throw new Error('Export failed');
            const blob = await r.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            const cd   = r.headers.get('Content-Disposition') || '';
            const match = cd.match(/filename="([^"]+)"/);
            a.href     = url;
            a.download = match?.[1] ?? 'thomian_backup.json';
            a.click();
            URL.revokeObjectURL(url);
            setDownloaded(true);
        } catch (e) {
            alert('Export failed. Check the server logs.');
        } finally {
            setDownloading(false);
        }
    };

    const stepIndex = STEPS.indexOf(step);

    const canNext: Record<Step, boolean> = {
        status:       !!dbStatus && dbStatus.vendor !== 'postgresql',
        credentials:  testResult?.success === true,
        backup:       downloaded,
        instructions: true,
        verify:       false,
    };

    const next = () => setStep(STEPS[stepIndex + 1]);
    const back = () => setStep(STEPS[stepIndex - 1]);

    return (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-200">
                            <Database className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight">Database Migration</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SQLite → PostgreSQL</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close migration wizard" className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Step progress */}
                <div className="px-8 pb-4 shrink-0">
                    <div className="flex gap-1.5">
                        {STEPS.map((s, i) => (
                            <div
                                key={s}
                                className={`h-1.5 flex-1 rounded-full transition-all ${
                                    i < stepIndex ? 'bg-emerald-500'
                                    : i === stepIndex ? 'bg-blue-600'
                                    : 'bg-slate-100'
                                }`}
                            />
                        ))}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                        {STEP_LABELS[step]}
                    </p>
                </div>

                {/* Step body */}
                <div className="flex-1 overflow-y-auto px-8 pb-4">
                    {step === 'status' && (
                        <StepStatus dbStatus={dbStatus} onNext={next} />
                    )}
                    {step === 'credentials' && (
                        <StepCredentials
                            creds={creds} setCreds={setCreds}
                            testResult={testResult} testing={testing}
                            onTest={handleTest} onNext={next} onBack={back}
                        />
                    )}
                    {step === 'backup' && (
                        <StepBackup
                            downloading={downloading} downloaded={downloaded}
                            onDownload={handleDownload} onNext={next} onBack={back}
                        />
                    )}
                    {step === 'instructions' && (
                        <StepInstructions creds={creds} onNext={next} onBack={back} />
                    )}
                    {step === 'verify' && (
                        <StepVerify
                            dbStatus={dbStatus} loading={statusLoading}
                            onRefresh={loadStatus} onClose={onClose}
                        />
                    )}
                </div>

                {/* Footer nav */}
                {step !== 'verify' && (
                    <div className="flex items-center justify-between px-8 py-6 border-t border-slate-100 shrink-0 gap-3">
                        <button
                            onClick={back}
                            disabled={stepIndex === 0}
                            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-xs uppercase hover:bg-slate-200 disabled:opacity-30 transition-all"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>

                        {step === 'status' && dbStatus?.vendor === 'postgresql' ? (
                            <button
                                onClick={onClose}
                                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                            >
                                <CheckCircle className="h-4 w-4" /> Already on PostgreSQL
                            </button>
                        ) : (
                            <button
                                onClick={next}
                                disabled={!canNext[step]}
                                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-40 transition-all"
                            >
                                Next <ArrowRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DbMigrationWizard;
