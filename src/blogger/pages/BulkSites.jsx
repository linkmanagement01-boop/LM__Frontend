import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, Download, FileSpreadsheet, CheckCircle, Clock, XCircle, History } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function BulkSites() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/blogger/bulk-sites/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setHistory(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

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
      setUploadResult(null);
    }
  };

  const handleDownloadFormat = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Please login first');
      return;
    }
    window.location.href = `${API_BASE_URL}/admin/sites/download-format?token=${token}`;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an Excel file first');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/blogger/bulk-sites/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      toast.success('File uploaded! Waiting for admin approval.', {
        duration: 5000,
        position: 'top-right',
        style: { background: '#22c55e', color: '#fff' }
      });

      setUploadResult({ success: true, message: data.message });
      setSelectedFile(null);
      document.querySelector('input[type="file"]').value = '';
      fetchHistory();
    } catch (error) {
      toast.error(error.message || 'Failed to upload file', { position: 'top-right' });
      setUploadResult({ success: false, error: error.message });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', icon: Clock },
      accepted: { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', icon: CheckCircle },
      rejected: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', icon: XCircle }
    };
    const style = styles[status] || styles.pending;
    const Icon = style.icon;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '4px 10px', borderRadius: '12px',
        backgroundColor: style.bg, color: style.color,
        fontSize: '12px', fontWeight: '500', textTransform: 'capitalize'
      }}>
        <Icon size={12} /> {status}
      </span>
    );
  };

  return (
    <div>
      <h2 style={{
        fontSize: '24px', fontWeight: 'bold', marginBottom: '24px',
        color: 'var(--text-primary, #fff)'
      }}>
        Bulk Sites Upload
      </h2>

      <div style={{
        backgroundColor: 'var(--card-background, #1a1a2e)',
        border: '1px solid var(--border, #2a2a4a)',
        borderRadius: '8px', padding: '24px'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px'
        }}>
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '12px', color: 'var(--text-secondary, #aaa)', fontSize: '14px'
            }}>
              <FileSpreadsheet size={18} /> Upload Excel File
            </label>
            <input
              type="file" accept=".xlsx,.xls" onChange={handleFileChange}
              style={{ marginBottom: '16px', color: 'var(--text-primary, #fff)' }}
            />
            {selectedFile && (
              <div style={{
                marginBottom: '12px', padding: '8px 12px',
                backgroundColor: 'var(--background, #0f0f1a)',
                borderRadius: '4px', color: 'var(--text-secondary, #aaa)', fontSize: '13px'
              }}>
                Selected: <strong style={{ color: 'var(--primary-cyan, #00bcd4)' }}>{selectedFile.name}</strong>
              </div>
            )}
            <div>
              <button onClick={handleUpload} disabled={uploading || !selectedFile}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  backgroundColor: uploading ? '#A78BFA' : '#7C3AED',
                  color: '#fff', border: 'none', padding: '12px 24px',
                  borderRadius: '6px', fontSize: '14px', fontWeight: '600',
                  cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
                  opacity: !selectedFile ? 0.5 : 1
                }}
              >
                <Upload size={18} />
                {uploading ? 'Uploading...' : 'Submit for Admin Approval'}
              </button>
            </div>
          </div>

          <div>
            <button onClick={handleDownloadFormat}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: 'transparent',
                border: '1px solid var(--primary-cyan, #00bcd4)',
                color: 'var(--primary-cyan, #00bcd4)',
                padding: '10px 16px', borderRadius: '6px',
                cursor: 'pointer', fontSize: '14px'
              }}
            >
              <Download size={16} /> Download Template
            </button>
          </div>
        </div>

        {uploadResult && uploadResult.success && (
          <div style={{
            marginTop: '20px', padding: '16px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid #22c55e', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <CheckCircle size={24} style={{ color: '#22c55e' }} />
            <div>
              <div style={{ color: '#22c55e', fontWeight: '600' }}>Upload Successful!</div>
              <div style={{ color: 'var(--text-secondary, #aaa)', fontSize: '14px' }}>
                Your file has been submitted for admin approval.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload History */}
      <div style={{
        marginTop: '24px', backgroundColor: 'var(--card-background, #1a1a2e)',
        border: '1px solid var(--border, #2a2a4a)', borderRadius: '8px'
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--border, #2a2a4a)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <History size={18} style={{ color: 'var(--primary-cyan, #00bcd4)' }} />
          <h3 style={{ margin: 0, color: 'var(--text-primary, #fff)', fontSize: '16px' }}>
            Upload History
          </h3>
        </div>

        {loadingHistory ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #666)' }}>
            Loading...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted, #666)' }}>
            No uploads yet
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--background, #0f0f1a)' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary, #aaa)', fontSize: '12px' }}>File Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary, #aaa)', fontSize: '12px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary, #aaa)', fontSize: '12px' }}>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border, #2a2a4a)' }}>
                  <td style={{ padding: '14px 20px', color: 'var(--text-primary, #fff)' }}>{item.file_name}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>{getStatusBadge(item.status)}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary, #aaa)', fontSize: '13px' }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
