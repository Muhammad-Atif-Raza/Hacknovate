import React, { useState, useEffect } from 'react';
import { X, QrCode, Clock, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { bookingService } from '../../services/bookingService';

export const QRModal = ({ bookingId, isOpen, onClose, onCheckinSuccess }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    const fetchQR = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await bookingService.getBookingQR(bookingId);
        setQrData(data);
        if (data.status === 'CHECKED_IN') {
          setCheckinSuccess(true);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to generate QR code.');
      } finally {
        setLoading(false);
      }
    };

    fetchQR();
  }, [isOpen, bookingId]);

  // Live countdown timer calculation for the 15-minute check-in deadline
  useEffect(() => {
    if (!qrData?.checkin_deadline) return;

    const deadline = new Date(qrData.checkin_deadline).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = deadline - now;

      if (difference <= 0) {
        setTimeLeft('00:00 (Expired)');
        setIsExpired(true);
      } else {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        setIsExpired(false);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [qrData]);

  const handleSimulateScan = async () => {
    if (!qrData?.qr_token) return;
    setVerifying(true);
    setError('');
    try {
      const result = await bookingService.verifyCheckin(qrData.qr_token);
      setCheckinSuccess(true);
      if (onCheckinSuccess) onCheckinSuccess(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification rejected by backend.');
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">QR Check-in Pass</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Generating encrypted pass token...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="font-semibold">Check-in Unavailable</p>
                <p className="mt-0.5 text-xs text-rose-600">{error}</p>
              </div>
            </div>
          ) : checkinSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Check-In Verified!</h4>
                <p className="text-sm text-slate-600 mt-1">
                  Access to <span className="font-semibold text-slate-900">{qrData?.room_number}</span> has been confirmed.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 text-left space-y-1">
                <p><span className="font-medium text-slate-800">Booking ID:</span> {qrData?.booking_id}</p>
                <p><span className="font-medium text-slate-800">Room:</span> {qrData?.room_name}</p>
                <p><span className="font-medium text-slate-800">Time Slot:</span> {qrData?.time_slot}</p>
                <p><span className="font-medium text-slate-800">Status:</span> Active Occupancy</p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-navy-900 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              {/* Countdown Banner */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                isExpired 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${isExpired ? 'text-rose-600' : 'text-amber-600'}`} />
                  <span className="font-medium">15-Min Scan Grace Window</span>
                </div>
                <span className="font-bold text-sm tracking-wide font-mono">{timeLeft}</span>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-slate-300 inline-block shadow-inner">
                {qrData?.qr_image ? (
                  <img
                    src={qrData.qr_image}
                    alt="Booking QR Code"
                    className="w-48 h-48 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                    No QR Image
                  </div>
                )}
              </div>

              {/* Booking Info Snippet */}
              <div className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-200 text-left space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-700">Reservation:</span>
                  <span className="font-semibold text-slate-900">{qrData?.booking_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-700">Venue:</span>
                  <span className="font-semibold text-slate-900">{qrData?.room_number} ({qrData?.room_name})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-700">Slot:</span>
                  <span className="font-semibold text-slate-900">{qrData?.time_slot}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Scan this code at the room entrance or kiosk upon arrival. Failure to check in within 15 minutes of scheduled start will automatically release the slot to the standby queue.
              </p>

              {/* Backend Verification Action Button */}
              <button
                onClick={handleSimulateScan}
                disabled={verifying || isExpired}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Validating with Server...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Simulate Room Door QR Scan
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
