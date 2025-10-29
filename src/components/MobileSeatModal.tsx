import { useState, useEffect, forwardRef, ReactElement } from "react";
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
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteIcon from '@mui/icons-material/Delete';
import { TransitionProps } from '@mui/material/transitions';
import { format } from 'date-fns';

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

type TimeSlotType = 'AM' | 'PM' | 'FULL_DAY';

interface MobileSeatModalProps {
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
}

export default function MobileSeatModal({
  open,
  onClose,
  seatId,
  selectedDate,
  onSubmit,
  onRemove,
  currentUser,
  currentUserBooking,
  availableTimeSlots,
}: MobileSeatModalProps) {
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
            <Typography variant="h6" component="span">
              {getSeatDisplayName(seatId)}
            </Typography>
          </Box>
          {!isCurrentUserBooked && <Chip
            label={"Free"}
            color={"success"}
            sx={{ borderRadius: 2 }}
          />}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 0, px: 3 }}>
        {isCurrentUserBooked ? (
          // Show booking details when user has already booked
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar
                src={userAvatar[currentUser || '']}
                sx={{
                  width: 50,
                  height: 50,
                }}
              >
                {currentUser?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  {currentUser}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CalendarTodayIcon fontSize="small" />
              <Typography variant="body2">
                {formatDate(selectedDate)} • {getTimeSlotLabel(currentUserBooking?.timeSlot || 'AM')}
              </Typography>
            </Box>
          </>
        ) : (
          // Show original booking interface
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
        {isCurrentUserBooked ? (
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
            Remove
          </Button>
        ) : (
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
            Book Desk
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}