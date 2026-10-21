import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, Download, CheckCircle, FileSpreadsheet, AlertTriangle, ArrowRight, X, Copy, RefreshCw, Trash2, Check } from 'lucide-react';
import { adminAPI } from '../../../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function AddExcel() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'result'

    // Preview Data
    const [validSites, setValidSites] = useState([]);
    const [conflicts, setConflicts] = useState([]);
    const [errors, setErrors] = useState([]);

    // Result Data
    const [resultStats, setResultStats] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'xlsx' && ext !== 'xls') {
                toast.error('Only Excel files (.xlsx, .xls) are allowed');
                e.target.value = '';
                return;
            }
            setSelectedFile(file);
            setStep('upload');
            setResultStats(null);
            setConflicts([]);
        }
    };

    const handleDownloadFormat = async () => {
        try {
            const blob = await adminAPI.downloadSiteFormat();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'new_site_format.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            toast.error('Failed to download format');
        }
    };

    // Step 1: Upload & Preview
    const handlePreview = async () => {
        if (!selectedFile) {
            toast.error('Please select an Excel file first');
            return;
        }

        setUploading(true);
        setErrors([]); // Clear previous errors
        try {
            const data = await adminAPI.previewSitesExcel(selectedFile);

            // Safe access with defaults
            const validSitesFromApi = data?.validSites || [];
            const conflictsFromApi = data?.conflicts || [];
            const errorsFromApi = data?.errors || [];

            // Initialize conflicts with default resolution 'IGNORE' for safety
            const conflictsWithResolution = conflictsFromApi.map(c => ({
                ...c,
                resolution: 'IGNORE' // 'IGNORE', 'ADD', 'REPLACE'
            }));

            setValidSites(validSitesFromApi);
            setConflicts(conflictsWithResolution);
            setErrors(errorsFromApi);

            // Handle edge case: no valid sites AND no conflicts
            if (conflictsFromApi.length === 0 && validSitesFromApi.length === 0) {
                if (errorsFromApi.length > 0) {
                    toast.error(`All ${errorsFromApi.length} rows had errors. No sites to import.`);
                } else {
                    toast.error('Excel file contains no valid site data.');
                }
                return; // Stay on upload step
            }

            setStep('preview');
            if (conflictsFromApi.length > 0) {
                toast('Duplicate sites found. Please resolve conflicts.', { icon: '⚠️' });
            }

        } catch (error) {
            console.error('Preview Error:', error);
            toast.error(error?.response?.data?.message || error?.message || 'Failed to preview Excel file');
        } finally {
            setUploading(false);
        }
    };

    // Conflict Resolution Handler
    const updateResolution = (index, resolution) => {
        const newConflicts = [...conflicts];
        newConflicts[index].resolution = resolution;
        setConflicts(newConflicts);
    };

    const applyResolutionToAll = (resolution) => {
        const newConflicts = conflicts.map(c => ({ ...c, resolution }));
        setConflicts(newConflicts);
    };

    // Step 2: Confirm & Import
    const handleConfirmImport = async () => {
        // Check if there's anything to actually import
        const sitesToAdd = conflicts.filter(c => c.resolution !== 'IGNORE').length + validSites.length;
        if (sitesToAdd === 0) {
            toast.error('No sites to import. All conflicts are set to Skip.');
            return;
        }

        setUploading(true);
        try {
            // Prepare payload
            const sitesToProcess = [
                ...validSites, // Valid ones are just added
                ...conflicts.map(c => ({
                    ...c.newSite,
                    resolution: c.resolution
                }))
            ];

            const data = await adminAPI.confirmSitesExcel(sitesToProcess);

            setResultStats({
                success: true,
                inserted: data?.stats?.inserted || 0,
                replaced: data?.stats?.replaced || 0,
                ignored: data?.stats?.ignored || 0,
                errors: data?.stats?.errors || []
            });
            setStep('result');
            toast.success('Import completed successfully!');

            // Reset File
            setSelectedFile(null);
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) fileInput.value = '';

        } catch (error) {
            console.error('Confirm Import Error:', error);
            toast.error(error?.response?.data?.message || error?.message || 'Import failed during confirmation');
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        setStep('upload');
        setValidSites([]);
        setConflicts([]);
        setErrors([]);
        setSelectedFile(null);
        if (document.querySelector('input[type="file"]')) {
            document.querySelector('input[type="file"]').value = '';
        }
    };


    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)] flex items-center gap-3">
                <FileSpreadsheet className="text-green-500" /> Bulk Import Sites
            </h2>

            {/* Error Display */}
            {errors.length > 0 && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                        <AlertTriangle size={16} /> Import Errors ({errors.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto text-sm text-red-300 space-y-1">
                        {errors.map((err, i) => <div key={i}>{err}</div>)}
                    </div>
                </div>
            )}

            {step === 'upload' && (
                <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Upload Section */}
                        <div className="flex-1">
                            <label className="block text-[var(--text-secondary)] mb-4 font-medium">Select Excel File</label>

                            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 flex flex-col items-center justify-center hover:border-[var(--primary-cyan)] transition-colors cursor-pointer relative bg-[var(--surface-muted)]">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Upload size={40} className="text-[var(--text-muted)] mb-4" />
                                {selectedFile ? (
                                    <div className="text-center">
                                        <p className="text-[var(--primary-cyan)] font-bold mb-1">{selectedFile.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <div className="text-center text-[var(--text-muted)]">
                                        <p className="font-medium">Drop file here or click to browse</p>
                                        <p className="text-xs mt-2">Supports .xlsx and .xls</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex items-center gap-4">
                                <button
                                    onClick={handlePreview}
                                    disabled={uploading || !selectedFile}
                                    className="premium-btn premium-btn-primary px-6 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? <RefreshCw className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                                    {uploading ? 'Analyzing...' : 'Analyze File'}
                                </button>

                                <button
                                    onClick={handleDownloadFormat}
                                    className="premium-btn px-4 py-3 flex items-center gap-2 text-[var(--primary-cyan)] border border-[var(--primary-cyan)]/30 hover:bg-[var(--primary-cyan)]/10"
                                >
                                    <Download size={18} /> Format Template
                                </button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="w-full md:w-80 bg-[var(--background-dark)] rounded-xl p-6 h-fit border border-[var(--border)]">
                            <h4 className="font-bold text-[var(--text-primary)] mb-4">Instructions</h4>
                            <ul className="space-y-3 text-sm text-[var(--text-secondary)] list-disc pl-4">
                                <li>Use the official formatted template.</li>
                                <li><strong>Root Domain</strong> is required.</li>
                                <li>Prices (GP/Niche) allow decimals (e.g. 50.00).</li>
                                <li>Existing domains will be detected for duplicate resolution.</li>
                                <li>You can bulk create accounts afterwards.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background-dark)]">
                        <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Import Preview</h3>
                            <p className="text-[var(--text-muted)] text-sm mt-1">
                                Found <span className="text-green-400 font-bold">{validSites.length}</span> new sites and <span className="text-orange-400 font-bold">{conflicts.length}</span> conflicts.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 hover:bg-white/10 rounded-lg text-sm text-[var(--text-secondary)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={uploading}
                                className="premium-btn premium-btn-primary px-6 py-2 flex items-center gap-2"
                            >
                                <Check size={18} /> Confirm Import
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-8">

                        {/* Conflict Resolution Section */}
                        {conflicts.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-orange-400 flex items-center gap-2">
                                        <AlertTriangle size={18} /> Resolve Duplicates ({conflicts.length})
                                    </h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => applyResolutionToAll('IGNORE')} className="text-xs px-3 py-1.5 bg-[var(--surface-muted)] hover:bg-[var(--color-border)] rounded text-[var(--text-secondary)] transition-colors">Keep All Existing</button>
                                        <button onClick={() => applyResolutionToAll('ADD')} className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors">Add All as Duplicate</button>
                                        <button onClick={() => applyResolutionToAll('REPLACE')} className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors">Replace All</button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
                                    <table className="w-full text-left text-sm" style={{ minWidth: '700px' }}>
                                        <thead className="bg-[var(--background-dark)] text-[var(--text-muted)] uppercase text-xs">
                                            <tr>
                                                <th className="p-3">Domain</th>
                                                <th className="p-3">New Upload Details</th>
                                                <th className="p-3">Existing Site Details</th>
                                                <th className="p-3 w-64 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {conflicts.map((conflict, idx) => (
                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-3 font-medium text-[var(--text-primary)]">
                                                        <a href={`https://${conflict.newSite.root_domain}`} target="_blank" rel="noreferrer" className="text-[var(--primary-cyan)] hover:underline flex items-center gap-1">
                                                            {conflict.newSite.root_domain}
                                                            <span className="text-xs opacity-60">↗</span>
                                                        </a>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="text-xs space-y-1">
                                                            <div><span className="text-[var(--text-muted)]">Email:</span> {conflict.newSite.email || '-'}</div>
                                                            <div><span className="text-[var(--text-muted)]">GP:</span> ${conflict.newSite.gp_price} / <span className="text-[var(--text-muted)]">Niche:</span> ${conflict.newSite.niche_edit_price}</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="text-xs space-y-1 opacity-70">
                                                            <div><span className="text-[var(--text-muted)]">Email:</span> {conflict.existingSite.email || '-'}</div>
                                                            <div><span className="text-[var(--text-muted)]">GP:</span> ${conflict.existingSite.gp_price} / <span className="text-[var(--text-muted)]">Niche:</span> ${conflict.existingSite.niche_edit_price}</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex bg-[var(--surface-muted)] rounded-lg p-1 border border-[var(--border)]">
                                                            <button
                                                                onClick={() => updateResolution(idx, 'IGNORE')}
                                                                className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${conflict.resolution === 'IGNORE' ? 'bg-gray-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                                                title="Keep Existing (Skip New)"
                                                            >
                                                                Skip
                                                            </button>
                                                            <button
                                                                onClick={() => updateResolution(idx, 'ADD')}
                                                                className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${conflict.resolution === 'ADD' ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                                                title="Keep Both (Create Duplicate)"
                                                            >
                                                                Add
                                                            </button>
                                                            <button
                                                                onClick={() => updateResolution(idx, 'REPLACE')}
                                                                className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${conflict.resolution === 'REPLACE' ? 'bg-red-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                                                title="Delete Old, Add New"
                                                            >
                                                                Replace
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Valid Sites Preview (Collapsed or simple stat) */}
                        {validSites.length > 0 && (
                            <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle className="text-green-500" size={20} />
                                <div>
                                    <p className="text-green-400 font-medium">{validSites.length} valid new sites ready to import.</p>
                                    <p className="text-xs text-[var(--text-muted)]">These will be added efficiently without conflict.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 'result' && resultStats && (
                <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                        <Check className="text-green-500 w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Import Complete</h3>
                    <div className="grid grid-cols-3 gap-8 my-6 text-center">
                        <div>
                            <div className="text-2xl font-bold text-green-400">{resultStats.inserted}</div>
                            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Added</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-400">{resultStats.replaced}</div>
                            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Replaced</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[var(--text-muted)]">{resultStats.ignored}</div>
                            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Skipped</div>
                        </div>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="premium-btn px-6 py-2"
                    >
                        Upload Another File
                    </button>
                </div>
            )}
        </div>
    );
}

export default AddExcel;
