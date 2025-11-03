import { forwardRef, ReactElement, useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  Slide,
  Avatar,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import { TransitionProps } from '@mui/material/transitions';
import { format } from 'date-fns';
import { processSeatBookingModifications } from '../utils/bookingModifications';

const userAvatar = {
  1234: 'https://i.pravatar.cc/150?img=1',
  "U001": 'https://i.pravatar.cc/150?img=2',
  "U002": 'https://i.pravatar.cc/150?img=3',
  "U003": 'https://i.pravatar.cc/150?img=4',
  "U004": 'https://i.pravatar.cc/150?img=5',
} as { [key: string]: string };

const SlideTransition = forwardRef<
  unknown,
  TransitionProps & {
    children: ReactElement;
  }
>(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface MobileSeatModalProps {
  open: boolean;
  onClose: () => void;
  seatId: string;
  selectedDate: string;
  currentUser?: string;
  currentUserBooking?: {
    seatId: string;
    userId: string;
  } | undefined;
  seatBookings: Array<{
    seatId: string;
    userId: string;
  }>;
  allDates?: Date[];
  allBookings?: Array<{
    seatId: string;
    userId: string;
    date: string;
  }>;
  onSuccess?: () => void; // Callback after successful booking update
}

export default function MobileSeatModal({
  open,
  onClose,
  seatId,
  selectedDate,
  currentUser,
  seatBookings,
  allDates = [],
  allBookings = [],
  onSuccess,
}: MobileSeatModalProps) {
  const [modifiedDates, setModifiedDates] = useState<{ [dateStr: string]: boolean }>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Helper function to format date
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get month and year from the dates
  const getMonthYear = () => {
    if (allDates.length > 0) {
      const firstDate = allDates[0];
      const monthName = firstDate.toLocaleDateString('en-US', { month: 'long' });
      const year = firstDate.getFullYear();
      return `${monthName}, ${year}`;
    }
    return '';
  };

  // Get user's bookings for this seat across all dates
  const getUserBookingsForSeat = () => {
    if (!currentUser || !allBookings) return [];
    return allBookings.filter(
      booking => booking.seatId === seatId && booking.userId === currentUser
    ).map(booking => booking.date);
  };

  // Get dates booked by other users for this seat
  const getDisabledDates = () => {
    if (!allBookings) return [];
    return allBookings
      .filter(booking => booking.seatId === seatId && booking.userId !== currentUser)
      .map(booking => booking.date);
  };

  const userBookedDates = getUserBookingsForSeat();
  const disabledDates = getDisabledDates();

  // Reset modifications when modal opens
  useEffect(() => {
    if (open) {
      setModifiedDates({});
    }
  }, [open]);

  const handleDateToggle = (dateStr: string, isCurrentlyBooked: boolean) => {
    setModifiedDates(prev => ({
      ...prev,
      [dateStr]: !isCurrentlyBooked,
    }));
  };

  const handleUpdate = async () => {
    if (!currentUser) return;

    try {
      setIsUpdating(true);

      // Process all modifications for this seat
      await processSeatBookingModifications(seatId, modifiedDates, currentUser);

      // Clear modifications
      setModifiedDates({});
      setIsUpdating(false);

      // Call success callback to refresh data
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error("Error updating bookings:", error);
      setIsUpdating(false);
    }
  };

  const isSeatAvailable = seatBookings.length === 0;

  const handleClose = () => {
    setModifiedDates({});
    onClose();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return format(localDate, 'EEEE, MMMM d, yyyy');
  };

  const getSeatDisplayName = (seatId: string) => {
    const tableLetter = seatId.charAt(0);
    const seatNumber = seatId.slice(1);
    return `Desk ${tableLetter}, Table ${seatNumber}`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      TransitionComponent={SlideTransition}
      PaperProps={{
        sx: {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          m: 0,
          width: '100%',
          maxWidth: 'none',
          borderRadius: '16px 16px 0 0',
          maxHeight: '85vh',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.1)',
        }
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'flex-end',
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <Box
          sx={{
            width: 40,
            height: 4,
            backgroundColor: 'grey.300',
            borderRadius: 2,
            mb: 2,
            cursor: 'pointer'
          }}
          onClick={handleClose}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="span">
              {getSeatDisplayName(seatId)}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 0, px: 3 }}>
        {/* Date Selection Section - Show if allDates provided */}
        {allDates.length > 0 && (
          <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'grey.300', pb: 2 }}>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#1F2937',
                mb: 1,
              }}
            >
              Select date <span style={{ fontWeight: 600 }}>({getMonthYear()}):</span>
            </Typography>

            {/* Date Chips Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
              }}
            >
              {allDates
                .filter((date) => {
                  const dayOfWeek = date.getDay();
                  // Only show weekdays (Monday = 1 to Friday = 5)
                  return dayOfWeek >= 1 && dayOfWeek <= 5;
                })
                .map((date) => {
                  const dateStr = formatLocalDate(date);
                  const isOriginallyBooked = userBookedDates.includes(dateStr);
                  const isModified = modifiedDates[dateStr] !== undefined;

                  // Check if date is in the past
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPastDate = date < today;

                  // Disable if booked by others OR if date is in the past
                  const isDisabled = disabledDates.includes(dateStr) || isPastDate;

                  // Calculate effective state after modifications
                  let isBooked = isOriginallyBooked;
                  if (isModified) {
                    isBooked = modifiedDates[dateStr]; // true = will be booked, false = will be unbooked
                  }

                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNumber = String(date.getDate()).padStart(2, '0');

                  return (
                    <Chip
                      key={dateStr}
                      label={`${dayName}, ${dayNumber}`}
                      onClick={isDisabled ? undefined : () => handleDateToggle(dateStr, isOriginallyBooked)}
                      disabled={isDisabled}
                      sx={{
                        borderRadius: '6px',
                        backgroundColor: isDisabled ? '#F3F4F6' : (isBooked ? '#EAECF5' : '#ECECEE'),
                        color: isDisabled ? '#9CA3AF' : (isBooked ? 'primary.main' : '#6B7280'),
                        fontWeight: isModified ? 600 : 500,
                        fontSize: '0.75rem',
                        height: '32px',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.6 : 1,
                        '& .MuiChip-label': {
                          px: 1,
                          py: 0,
                        },
                        '&:hover': {
                          backgroundColor: isDisabled
                            ? '#F3F4F6'
                            : (isBooked ? '#FFD4C4' : '#D1D5DB'),
                        },
                      }}
                    />
                  );
                })}
            </Box>
          </Box>
        )}

        {/* Legacy single-date view - Only show if no allDates provided */}
        {allDates.length === 0 && seatBookings.length > 0 && (
          <>
            <Box sx={{ borderTop: 1, borderColor: 'grey.300', pt: 2, mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                Current Bookings:
              </Typography>

              {seatBookings.map((booking, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2,
                    p: 1.5,
                    backgroundColor: booking.userId === currentUser ? 'primary.50' : 'grey.50',
                    borderRadius: 2,
                    border: booking.userId === currentUser ? '2px solid' : '1px solid',
                    borderColor: booking.userId === currentUser ? 'primary.main' : 'grey.200',
                  }}
                >
                  <Avatar
                    src={userAvatar[booking.userId]}
                    sx={{
                      width: 40,
                      height: 40,
                    }}
                  >
                    {booking.userId.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {booking.userId}
                      {booking.userId === currentUser && (
                        <Chip
                          label="You"
                          size="small"
                          color="primary"
                          sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Full Day
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pt: 2, borderTop: 1, borderColor: 'grey.300' }}>
              <FontAwesomeIcon icon={faCalendarDays} fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {formatDate(selectedDate)}
              </Typography>
            </Box>
          </>
        )}

        {allDates.length === 0 && seatBookings.length === 0 && (
          <>
            <Box sx={{ borderTop: 1, borderColor: 'grey.300', pt: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <FontAwesomeIcon icon={faCalendarDays} fontSize="small" />
                <span>Available</span>
              </Box>
              <Typography variant="body1" color="grey.500">
                {formatDate(selectedDate)}
              </Typography>
            </Box>

            {isSeatAvailable ? (
              <Box sx={{ mb: 3, borderTop: 1, borderColor: 'grey.300', pt: 2 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  This desk is available for full day booking
                </Typography>
              </Box>
            ) : (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                This seat is not available for the selected date.
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{
        px: 3,
        pb: 3,
        flexDirection: 'column',
        gap: 2,
        '& > :not(style) ~ :not(style)': {
          ml: 0,
        }
      }}>
        {/* Show Update button if dates are provided */}
        {allDates.length > 0 && (
          <Button
            onClick={handleUpdate}
            variant="contained"
            fullWidth
            size="large"
            disabled={Object.keys(modifiedDates).length === 0 || isUpdating}
            sx={{
              fontSize: '1rem',
              fontWeight: 600,
              backgroundColor: '#FF6B35',
              '&:hover': {
                backgroundColor: '#E55A2B',
              },
              '&:disabled': {
                backgroundColor: '#D1D5DB',
                color: '#9CA3AF',
              },
            }}
          >
            {isUpdating ? 'Updating...' : 'Booking'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
