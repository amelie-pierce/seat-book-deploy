import { useState, useEffect } from "react";
import {
  Popover,
  Button,
  Typography,
  Box,
  Chip,
  Paper,
} from "@mui/material";
import { SEATING_CONFIG } from '../config/seatingConfig';
import { bookingService } from '../services/bookingService';
import { BookingRecord } from '../utils/bookingStorage';

interface DesktopSeatModalProps {
  open: boolean;
  onClose: () => void;
  seatId: string;
  selectedDate: string;
  currentUser?: string;
  anchorPosition?: { top: number; left: number } | null;
  seatBookings: Array<{
    seatId: string;
    userId: string;
  }>;
  allDates?: Date[]; // All available dates to display
  allBookings?: Array<{
    seatId: string;
    userId: string;
    date: string;
  }>; // All bookings across all dates
}

export default function DesktopSeatModal({
  open,
  onClose,
  seatId,
  selectedDate,
  currentUser,
  anchorPosition,
  seatBookings,
  allDates = [],
  allBookings = [],
}: DesktopSeatModalProps) {
  const [internalSelectedDate, setInternalSelectedDate] = useState<string>(selectedDate);
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

  // Update internal selected date when prop changes
  useEffect(() => {
    if (open) {
      setInternalSelectedDate(selectedDate);
      setModifiedDates({});
    }
  }, [open, selectedDate]);

  const handleDateToggle = (dateStr: string, isCurrentlyBooked: boolean) => {
    setInternalSelectedDate(dateStr);
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
      for (const [dateStr, shouldBook] of Object.entries(modifiedDates)) {
        if (shouldBook) {
          // Add new booking
          await bookingService.createBooking(
            currentUser,
            seatId,
            "FULL_DAY",
            dateStr
          );
        } else {
          // Remove booking - find the booking ID first
          const userData = await bookingService.loadUserData(currentUser);
          const bookingToRemove = userData.userBookings.find(
            (b: BookingRecord) => b.seatId === seatId && b.date === dateStr
          );
          
          if (bookingToRemove) {
            await bookingService.cancelBooking(bookingToRemove.id, currentUser);
          }
        }
      }

      // Clear modifications
      setModifiedDates({});
      setIsUpdating(false);
      
      // Close modal
      onClose();
    } catch (error) {
      console.error("Error updating bookings:", error);
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    onClose();
    setModifiedDates({});
  };

  const getSeatDisplayName = (seatId: string) => {
    const tableLetter = seatId.charAt(0);
    const zoneName = SEATING_CONFIG.zones.zone1.tables.includes(tableLetter) 
      ? 'Zone A' 
      : 'Zone B';
    return `Desk ${seatId} - ${zoneName}`;
  };
  
  return (
    <Popover
      open={open}
      onClose={handleClose}
      anchorReference="anchorPosition"
      anchorPosition={
        anchorPosition
          ? { top: anchorPosition.top, left: anchorPosition.left }
          : undefined
      }
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
            minWidth: 300,
            maxWidth: 400,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            overflow: 'visible',
          }
        }
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }
      }}
    >
      <Paper elevation={0} sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" component="span">
                {getSeatDisplayName(seatId)}
              </Typography>
            </Box>
            {seatBookings.length === 0 ? (
              <Chip
                label="Free"
                color="success"
                sx={{ borderRadius: 2 }}
              />
            ) : (
              <Chip
                label="Booked"
                color="error"
                sx={{ borderRadius: 2 }}
              />
            )}
          </Box>
        </Box>

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
                gridTemplateColumns: 'repeat(5, 1fr)',
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
                  const isSelected = dateStr === internalSelectedDate;

                  return (
                    <Chip
                      key={dateStr}
                      label={`${dayName}, ${dayNumber}`}
                      onClick={isDisabled ? undefined : () => handleDateToggle(dateStr, isOriginallyBooked)}
                      disabled={isDisabled}
                      sx={{
                        borderRadius: '6px',
                        backgroundColor: isDisabled ? '#F3F4F6' : (isBooked ? '#FFE8DF' : '#E5E7EB'),
                        color: isDisabled ? '#9CA3AF' : (isBooked ? '#FF6B35' : '#6B7280'),
                        border: isSelected ? '2px solid #FF6B35' : (isModified && !isDisabled ? '2px solid #FF6B35' : 'none'),
                        fontWeight: isSelected ? 600 : 500,
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

        {/* Actions */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexDirection: 'column' }}>
          {/* Update button - always visible, disabled if no modifications */}
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
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
        </Box>
      </Paper>
    </Popover>
  );
}
