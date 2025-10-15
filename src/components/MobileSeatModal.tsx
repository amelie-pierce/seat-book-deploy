import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  Chip,
  IconButton,
  Slide,
} from "@mui/material";
import { Close as CloseIcon, Chair as ChairIcon } from "@mui/icons-material";
import { forwardRef, ReactElement } from "react";
import { TransitionProps } from '@mui/material/transitions';

const SlideTransition = forwardRef<
  unknown,
  TransitionProps & {
    children: ReactElement;
  }
>(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

type TimeSlotType = 'AM' | 'PM' | 'FULL_DAY';

interface MobileSeatModalProps {
  open: boolean;
  onClose: () => void;
  seatId: string;
  selectedDate: string;
  onSubmit: (seatId: string, timeSlot: TimeSlotType) => void;
  currentUser?: string;
  allBookingsForDate: Array<{
    seatId: string;
    userId: string;
    timeSlot: 'AM' | 'PM' | 'FULL_DAY';
  }>;
}

export default function MobileSeatModal({
  open,
  onClose,
  seatId,
  selectedDate,
  onSubmit,
  currentUser,
  allBookingsForDate
}: MobileSeatModalProps) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotType | ''>('');

  // Get available time slots for the selected seat
  const getAvailableTimeSlots = useCallback((seatId: string, dateStr: string): TimeSlotType[] => {
    if (!seatId || !dateStr) return ['AM', 'PM', 'FULL_DAY'];

    // Find all bookings for this seat on this date
    const seatBookings = allBookingsForDate.filter(booking =>
      booking.seatId === seatId
    );

    if (seatBookings.length === 0) {
      // No bookings, all time slots available
      return ['AM', 'PM', 'FULL_DAY'];
    }

    // Check for FULL_DAY bookings
    const hasFullDayBooking = seatBookings.some(booking => booking.timeSlot === 'FULL_DAY');
    if (hasFullDayBooking) {
      // If there's a full day booking, no slots available
      return [];
    }

    // Check individual time slots
    const hasAmBooking = seatBookings.some(booking => booking.timeSlot === 'AM');
    const hasPmBooking = seatBookings.some(booking => booking.timeSlot === 'PM');

    const availableSlots: TimeSlotType[] = [];

    if (!hasAmBooking) availableSlots.push('AM');
    if (!hasPmBooking) availableSlots.push('PM');

    // Only show FULL_DAY if both AM and PM are available
    if (!hasAmBooking && !hasPmBooking) {
      availableSlots.push('FULL_DAY');
    }

    return availableSlots;
  }, [allBookingsForDate]);

  const availableTimeSlots = getAvailableTimeSlots(seatId, selectedDate);
  
  // Auto-select time slot only when modal first opens and only if there's exactly one option
  useEffect(() => {
    if (open) {
      const currentAvailableSlots = getAvailableTimeSlots(seatId, selectedDate);
      // Only auto-select if there's exactly one available slot
      if (currentAvailableSlots.length === 1) {
        setSelectedTimeSlot(currentAvailableSlots[0]);
      } else {
        // For multiple options, let user choose manually - start with empty selection
        setSelectedTimeSlot('');
      }
    } else {
      // Reset when modal closes
      setSelectedTimeSlot('');
    }
  }, [open, seatId, selectedDate, getAvailableTimeSlots]);

  const handleSubmit = () => {
    if (selectedTimeSlot) {
      onSubmit(seatId, selectedTimeSlot);
      onClose();
      setSelectedTimeSlot('');
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedTimeSlot('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTimeSlotLabel = (timeSlot: TimeSlotType) => {
    switch (timeSlot) {
      case 'AM':
        return 'Morning (AM)';
      case 'PM':
        return 'Afternoon (PM)';
      case 'FULL_DAY':
        return 'Full Day';
      default:
        return timeSlot;
    }
  };

  const getSeatDisplayName = (seatId: string) => {
    const tableLetter = seatId.charAt(0);
    const seatNumber = seatId.slice(1);
    return `Table ${tableLetter}, Seat ${seatNumber}`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={false}
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
        pb: 1,
        pt: 1
      }}>
        {/* Drag Handle */}
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
            <ChairIcon color="primary" />
            <Typography variant="h6" component="span">
              Reserve Seat
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ color: 'grey.500' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0, px: 3 }}>
        {/* Seat and Date Info */}
        <Box sx={{ mb: 3 }}>
          <Chip
            icon={<ChairIcon />}
            label={getSeatDisplayName(seatId)}
            color="primary"
            variant="outlined"
            sx={{ mb: 2, fontSize: '1rem', py: 1, width: '100%', justifyContent: 'flex-start' }}
          />
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
            {formatDate(selectedDate)}
          </Typography>
        </Box>

        {/* Authentication Status */}
        {currentUser ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Booking as: {currentUser}
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            You&apos;ll need to authenticate before confirming your reservation
          </Alert>
        )}

        {/* Time Slot Selection */}
        {availableTimeSlots.length > 0 ? (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Time Slot</InputLabel>
            <Select
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value as TimeSlotType)}
              label="Time Slot"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            >
              {availableTimeSlots.map(timeSlot => (
                <MenuItem key={timeSlot} value={timeSlot}>
                  {getTimeSlotLabel(timeSlot)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            This seat is not available for the selected date. All time slots are already booked.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        px: 3, 
        pb: 3, 
        pt: 2,
        flexDirection: 'column',
        gap: 2,
        '& > :not(style) ~ :not(style)': {
          ml: 0,
        }
      }}>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!selectedTimeSlot || availableTimeSlots.length === 0}
          fullWidth
          size="large"
          sx={{ 
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600
          }}
        >
          Reserve Seat
        </Button>
        <Button 
          onClick={handleClose} 
          color="inherit"
          fullWidth
          size="large"
          sx={{ 
            py: 1.5,
            fontSize: '1rem'
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}