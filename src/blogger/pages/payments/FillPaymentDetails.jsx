import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, CheckCircle } from 'lucide-react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export function FillPaymentDetails() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [countryName, setCountryName] = useState('');
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef(null);

  // PayPal
  const [paypalId, setPaypalId] = useState('');

  // Bank Details
  const [bankType, setBankType] = useState('');
  const [beneficiaryAccountNumber, setBeneficiaryAccountNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneBankName, setBeneBankName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [beneBankBranchName, setBeneBankBranchName] = useState('');
  const [beneficiaryEmailId, setBeneficiaryEmailId] = useState('');
  const [customerReferenceNumber, setCustomerReferenceNumber] = useState('');

  // UPI
  const [upiId, setUpiId] = useState('');

  // QR Code
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [qrPreview, setQrPreview] = useState('');

  useEffect(() => {
    fetchPaymentDetails();
  }, []);

  const fetchPaymentDetails = async () => {
    try {
      const response = await api.get('/blogger/payment-details');
      const data = response.data;

      setAvailableMethods(data.available_methods || ['paypal']);
      setCountryName(data.country_name || '');
      setPaypalId(data.paypal_id || '');
      setUpiId(data.upi_id || '');
      setQrCodeImage(data.qr_code_image || '');
      setQrPreview(data.qr_code_image || '');

      if (data.bank_details) {
        setBankType(data.bank_details.bank_type || '');
        setBeneficiaryAccountNumber(data.bank_details.beneficiary_account_number || '');
        setBeneficiaryName(data.bank_details.beneficiary_name || '');
        setBeneBankName(data.bank_details.bene_bank_name || '');
        setIfscCode(data.bank_details.ifsc_code || '');
        setBeneBankBranchName(data.bank_details.bene_bank_branch_name || '');
        setBeneficiaryEmailId(data.bank_details.beneficiary_email_id || '');
        setCustomerReferenceNumber(data.bank_details.customer_reference_number || '');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      showError('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showError('File size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrPreview(reader.result);
        setQrCodeImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveQr = () => {
    setQrPreview('');
    setQrCodeImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.put('/blogger/payment-details', {
        paypal_id: paypalId,
        upi_id: upiId,
        qr_code_image: qrCodeImage,
        bank_type: bankType,
        beneficiary_account_number: beneficiaryAccountNumber,
        beneficiary_name: beneficiaryName,
        bene_bank_name: beneBankName,
        ifsc_code: ifscCode,
        bene_bank_branch_name: beneBankBranchName,
        beneficiary_email_id: beneficiaryEmailId,
        customer_reference_number: customerReferenceNumber
      });
      showSuccess('Payment details updated successfully');
    } catch (error) {
      console.error('Error updating payment details:', error);
      showError(error.response?.data?.message || 'Failed to update payment details');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: 'var(--background-dark)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)'
  };

  const sectionStyle = {
    backgroundColor: 'var(--card-background)',
    border: '1px solid var(--border)'
  };

  // Check if specific payment methods are available
  const hasBank = availableMethods.includes('bank');
  const hasUpi = availableMethods.includes('upi_id');
  const hasQr = availableMethods.includes('qr_code');
  const hasPaypal = availableMethods.includes('paypal');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Fill Payment Details
      </h2>

      {countryName && (
        <div className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />
          Country: <span style={{ color: 'var(--text-primary)' }}>{countryName}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bank Details Section - Show if bank method available */}
        {hasBank && (
          <div className="rounded-2xl" style={sectionStyle}>
            <div
              className="border-b px-4 py-3 font-medium rounded-t-2xl"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Bank Details
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Account Type</label>
                  <input
                    value={bankType}
                    onChange={(e) => setBankType(e.target.value)}
                    placeholder="Savings / Current"
                    className="w-full rounded-xl px-3 py-2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Beneficiary Account Number</label>
                  <input
                    value={beneficiaryAccountNumber}
                    onChange={(e) => setBeneficiaryAccountNumber(e.target.value)}
                    placeholder="Account Number"
                    className="w-full rounded-xl px-3 py-2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Beneficiary Name</label>
                  <input
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="Account Holder Name"
                    className="w-full rounded-xl px-3 py-2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Bank Name</label>
                  <input
                    value={beneBankName}
                    onChange={(e) => setBeneBankName(e.target.value)}
                    placeholder="Bank Name"
                    className="w-full rounded-xl px-3 py-2"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>IFSC Code</label>
                  <input
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="IFSC Code"
                    className="w-full rounded-xl px-3 py-2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Bank Branch Name</label>
                  <input
                    value={beneBankBranchName}
                    onChange={(e) => setBeneBankBranchName(e.target.value)}
                    placeholder="Branch Name"
                    className="w-full rounded-xl px-3 py-2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Beneficiary Email Id</label>
                  <input
                    type="email"
                    value={beneficiaryEmailId}
                    onChange={(e) => setBeneficiaryEmailId(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-xl px-3 py-2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Reference Number</label>
                  <input
                    value={customerReferenceNumber}
                    onChange={(e) => setCustomerReferenceNumber(e.target.value)}
                    placeholder="Reference Number"
                    className="w-full rounded-xl px-3 py-2"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* UPI Details Section - Show if upi_id method available */}
        {hasUpi && (
          <div className="rounded-2xl" style={sectionStyle}>
            <div
              className="border-b px-4 py-3 font-medium rounded-t-2xl"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              UPI Details
            </div>
            <div className="p-4">
              <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>UPI Id</label>
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi"
                className="w-full rounded-xl px-3 py-2"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* QR Code Section - Show if qr_code method available */}
        {hasQr && (
          <div className="rounded-2xl" style={sectionStyle}>
            <div
              className="border-b px-4 py-3 font-medium rounded-t-2xl"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              QR Code
            </div>
            <div className="p-4">
              <label className="text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Upload QR Code Image</label>
              {qrPreview ? (
                <div className="relative inline-block">
                  <img
                    src={qrPreview}
                    alt="QR Code Preview"
                    className="max-w-xs rounded-lg border"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveQr}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>
                    Drag & Drop your files or <span className="text-amber-500 hover:underline">Browse</span>
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* PayPal Section - Show if paypal method available */}
        {hasPaypal && (
          <div className="rounded-2xl" style={sectionStyle}>
            <div
              className="border-b px-4 py-3 font-medium rounded-t-2xl"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Paypal Details
            </div>
            <div className="p-4 space-y-2">
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Paypal ID</label>
              <input
                value={paypalId}
                onChange={(e) => setPaypalId(e.target.value)}
                placeholder="Enter your PayPal email or ID"
                className="w-full rounded-xl px-3 py-2"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 rounded-xl font-semibold text-white hover:text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-sm transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
