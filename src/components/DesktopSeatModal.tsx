import { useState, useEffect } from "react";
import {
  Popover,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  Avatar,
  Paper,
} from "@mui/material";
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';

const userAvatar = {
  1234: 'https://i.pravatar.cc/150?img=1',
  "U001": 'https://i.pravatar.cc/150?img=2',
  "U002": 'https://i.pravatar.cc/150?img=3',
  "U003": 'https://i.pravatar.cc/150?img=4',
  "U004": 'https://i.pravatar.cc/150?img=5',
} as { [key: string]: string };

type TimeSlotType = 'AM' | 'PM' | 'FULL_DAY';

interface DesktopSeatModalProps {
  open: boolean;
  onClose: () => void;
  seatId: string;
  selectedDate: string;
  onSubmit: (seatId: string, timeSlot: TimeSlotType) => void;
  onRemove?: (seatId: string, timeSlot: TimeSlotType) => void;
  currentUser?: string;
  currentUserBooking?: {
    seatId: string;
    userId: string;
    timeSlot: 'AM' | 'PM' | 'FULL_DAY';
  } | undefined;
  availableTimeSlots: TimeSlotType[];
  anchorPosition?: { top: number; left: number } | null;
  seatBookings: Array<{
    seatId: string;
    userId: string;
    timeSlot: 'AM' | 'PM' | 'FULL_DAY';
  }>;
}

export default function DesktopSeatModal({
  open,
  onClose,
  seatId,
  selectedDate,
  onSubmit,
  onRemove,
  currentUser,
  currentUserBooking,
  availableTimeSlots,
  anchorPosition,
  seatBookings,
}: DesktopSeatModalProps) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotType | ''>('');

  const isCurrentUserBooked = !!currentUserBooking;

  // Auto-select time slot when modal opens
  useEffect(() => {
    if (open) {
      // Only auto-select if there's exactly one available slot
      if (availableTimeSlots.length === 1) {
        setSelectedTimeSlot(availableTimeSlots[0]);
      } else {
        // For multiple options, let user choose manually
        setSelectedTimeSlot('');
      }
    } else {
      // Reset when modal closes
      setSelectedTimeSlot('');
    }
  }, [open, availableTimeSlots]);

  const handleSubmit = () => {
    if (selectedTimeSlot) {
      onSubmit(seatId, selectedTimeSlot);
      onClose();
      setSelectedTimeSlot('');
    }
  };

  const handleRemove = () => {
    if (currentUserBooking && onRemove) {
      onRemove(seatId, currentUserBooking.timeSlot);
      onClose();
      setSelectedTimeSlot('');
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedTimeSlot('');
  };

  const formatDate = (dateStr: string) => {
    if(!dateStr) return '';
    // Parse the date string as local date to avoid timezone offset issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return format(localDate, 'EEEE, MMMM d, yyyy');
  };

  const getTimeSlotLabel = (timeSlot: TimeSlotType) => {
    switch (timeSlot) {
      case 'AM':
        return 'AM';
      case 'PM':
        return 'PM';
      case 'FULL_DAY':
        return 'Full Day';
      default:
        return timeSlot;
    }
  };

  const getSeatDisplayName = (seatId: string) => {
    const tableLetter = seatId.charAt(0);
    const seatNumber = seatId.slice(1);
    return `Desk ${tableLetter}, Table ${seatNumber}`;
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
            ) : availableTimeSlots.length > 0 ? (
              <Chip
                label="Partially Booked"
                color="warning"
                sx={{ borderRadius: 2 }}
              />
            ) : (
              <Chip
                label="Fully Booked"
                color="error"
                sx={{ borderRadius: 2 }}
              />
            )}
          </Box>
        </Box>

        {/* Content */}
        <Box>
        {seatBookings.length > 0 ? (
          // Show all bookings for this seat
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
                      {getTimeSlotLabel(booking.timeSlot)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pt: 2, borderTop: 1, borderColor: 'grey.300' }}>
              <CalendarTodayIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {formatDate(selectedDate)}
              </Typography>
            </Box>
          </>
        ) : (
          // Show booking interface when seat is free
          <>
            {/* Seat and Date Info */}
            <Box sx={{ borderTop: 1, borderColor: 'grey.300', pt: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <CalendarTodayIcon fontSize="small" />
                <span>Available</span>
              </Box>
              <Typography variant="body1" color="grey.500">
                {formatDate(selectedDate)}
              </Typography>
            </Box>

            {/* Time Slot Selection */}
            {availableTimeSlots.length > 0 ? (
              <Box sx={{ mb: 3, borderTop: 1, borderColor: 'grey.300', pt: 2 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Select a time slot:
                </Typography>
                <Box sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                }}>
                  {availableTimeSlots.map(timeSlot => (
                    <Chip
                      key={timeSlot}
                      label={getTimeSlotLabel(timeSlot)}
                      onClick={() => setSelectedTimeSlot(timeSlot)}
                      clickable
                      sx={{
                        px: 0.5,
                        py: 0.25,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        backgroundColor: selectedTimeSlot === timeSlot ? "grey.600" : "grey.200",
                        color: selectedTimeSlot === timeSlot ? "white" : "grey.800",
                        minWidth: 100,
                        height: 40,
                        borderRadius: 2,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          backgroundColor: "grey.600",
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                This seat is not available for the selected date. All time slots are already booked.
              </Alert>
            )}
          </>
        )}
        </Box>

        {/* Actions */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexDirection: 'column' }}>
          {/* Show remove button if current user has booked */}
          {isCurrentUserBooked && (
            <Button
              onClick={handleRemove}
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<DeleteIcon />}
              sx={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'error.main',
                borderColor: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.main',
                  color: 'white',
                  borderColor: 'error.main',
                }
              }}
            >
              Remove My Booking
            </Button>
          )}
          
          {/* Show book button if there are available slots */}
          {availableTimeSlots.length > 0 && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!selectedTimeSlot}
              fullWidth
              size="large"
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              Book Desk
            </Button>
          )}

          {/* Show message if fully booked and user hasn't booked */}
          {availableTimeSlots.length === 0 && !isCurrentUserBooked && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              This seat is fully booked for the selected date.
            </Alert>
          )}
        </Box>
      </Paper>
    </Popover>
  );
}
