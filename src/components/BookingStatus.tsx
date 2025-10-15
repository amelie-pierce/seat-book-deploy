'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertTitle, Snackbar, Chip, Box } from '@mui/material';
import { Warning as WarningIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface BookingStatusProps {
  bookingError: string | null;
  onRetry?: () => void;
  onRefresh?: () => void;
}

export default function BookingStatus({ bookingError, onRetry, onRefresh }: BookingStatusProps) {
  const [showError, setShowError] = useState(false);
  const [isConflict, setIsConflict] = useState(false);

  useEffect(() => {
    if (bookingError) {
      setShowError(true);
      setIsConflict(
        bookingError.includes('already taken') || 
        bookingError.includes('Already booked') ||
        bookingError.includes('Seat already taken')
      );
    }
  }, [bookingError]);

  const handleClose = () => {
    setShowError(false);
  };

  if (!showError || !bookingError) return null;

  return (
    <Snackbar
      open={showError}
      autoHideDuration={isConflict ? 8000 : 6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert 
        severity={isConflict ? 'warning' : 'error'} 
        onClose={handleClose}
        sx={{ 
          minWidth: '400px',
          '& .MuiAlert-message': { width: '100%' }
        }}
      >
        <AlertTitle>
          {isConflict ? (
            <>
              <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Seat Conflict Detected
            </>
          ) : (
            'Booking Failed'
          )}
        </AlertTitle>
        
        <Box sx={{ mb: 1 }}>
          {bookingError}
        </Box>

        {isConflict && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={<RefreshIcon />}
              label="Refresh View"
              size="small"
              onClick={onRefresh}
              color="primary"
              variant="outlined"
              clickable
            />
            <Chip
              label="Try Again"
              size="small"
              onClick={onRetry}
              color="secondary"
              variant="outlined"
              clickable
            />
          </Box>
        )}

        {isConflict && (
          <Box sx={{ mt: 1, fontSize: '0.85em', opacity: 0.8 }}>
            💡 Tip: Another user booked this seat first. Choose a different seat or time slot.
          </Box>
        )}
      </Alert>
    </Snackbar>
  );
}