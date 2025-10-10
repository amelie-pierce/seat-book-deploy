import { useState, useEffect, useCallback } from "react";
import { bookingService } from "../services/bookingService";
import {
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  Snackbar,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,

} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";

type TimeSlotType = 'AM' | 'PM' | 'FULL_DAY';

interface ReservationFormProps {
  selectedSeat?: string;
  onSubmit?: (date: string, timeSlot: TimeSlotType) => void;
  currentUser?: string;
  isAuthenticated?: boolean;
  onDateClick?: (date: string) => void;
  selectedDate?: string;
  userBookings?: { date: string; seatId: string; timeSlot: TimeSlotType }[];
  onBookingChange?: () => void;
  onClear?: () => void;
  allBookingsForDate?: Array<{
    seatId: string;
    userId: string;
    timeSlot: 'AM' | 'PM' | 'FULL_DAY';
  }>;
}

export default function ReservationForm({
  selectedSeat,
  onSubmit,
  currentUser,
  isAuthenticated = false,
  onDateClick,
  selectedDate,
  userBookings = [],
  onBookingChange,
  onClear,
  allBookingsForDate = []
}: ReservationFormProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<{ [date: string]: TimeSlotType }>({});
  const [lastSelectedSeat, setLastSelectedSeat] = useState<string | undefined>(undefined);

  // Get available time slots for a seat on a specific date
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

  // Initialize time slots from user bookings and handle updates
  useEffect(() => {
    const initialTimeSlots: { [date: string]: TimeSlotType } = {};
    userBookings.forEach(booking => {
      if (booking.timeSlot) {
        initialTimeSlots[booking.date] = booking.timeSlot;
      }
    });
    setSelectedTimeSlots(prev => ({
      ...prev,
      ...initialTimeSlots
    }));
  }, [userBookings]);

  // Auto-select time slot when seat is selected based on availability
  useEffect(() => {
    if (selectedSeat && selectedDate) {
      // Only auto-select when the seat actually changes, not on every render
      const seatChanged = lastSelectedSeat !== selectedSeat;
      
      if (seatChanged) {
        setLastSelectedSeat(selectedSeat);
        
        const availableSlots = getAvailableTimeSlots(selectedSeat, selectedDate);
        console.log(`🎯 Seat changed to ${selectedSeat} for ${selectedDate}. Available slots:`, availableSlots);
        
        // If there's already a user booking for this date, don't change it
        const existingBooking = userBookings.find(b => b.date === selectedDate);
        if (existingBooking) {
          console.log(`📌 User already has booking for ${selectedDate}:`, existingBooking);
          return;
        }
        
        // Auto-select appropriate time slot when seat changes
        if (availableSlots.length === 3 && availableSlots.includes('FULL_DAY')) {
          // For fully available seats, default to FULL_DAY
          console.log(`🔄 Fully available seat - auto-selecting FULL_DAY`);
          setSelectedTimeSlots(prev => ({
            ...prev,
            [selectedDate]: 'FULL_DAY'
          }));
        } else if (availableSlots.length > 0) {
          // For partially available seats, select the only/first available option
          const autoSelectedSlot = availableSlots[0];
          console.log(`🔄 Partially available seat - auto-selecting: ${autoSelectedSlot}`);
          setSelectedTimeSlots(prev => ({
            ...prev,
            [selectedDate]: autoSelectedSlot
          }));
        } else {
          console.log(`⚠️ No available time slots for seat ${selectedSeat} on ${selectedDate}`);
        }
      }
    }
  }, [selectedSeat, selectedDate, lastSelectedSeat, allBookingsForDate, userBookings, getAvailableTimeSlots]);

  // Convert seat ID to readable format
  const formatSeatDisplay = (seatId: string) => {
    if (seatId.length >= 2) {
      const tableLetter = seatId.charAt(0);
      const seatNumber = seatId.slice(1);
      return `Table ${tableLetter}, Seat ${seatNumber}`;
    }
    return seatId;
  };

  const handleTimeSlotChange = (date: string, timeSlot: TimeSlotType) => {
    console.log(`Setting time slot for ${date} to ${timeSlot}`);
    setSelectedTimeSlots(prev => ({
      ...prev,
      [date]: timeSlot
    }));
  };

  const getTimeSlotForDate = (dateStr: string) => {
    // First check if there's an existing booking
    const existingBooking = userBookings.find(b => b.date === dateStr);
    if (existingBooking?.timeSlot) {
      return existingBooking.timeSlot;
    }
    // Then check if there's a selected time slot (only if it's not null/undefined)
    if (selectedTimeSlots[dateStr]) {
      return selectedTimeSlots[dateStr];
    }
    // Always default to FULL_DAY if no booking or selection exists
    return 'FULL_DAY';
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (onSubmit && selectedDate) {
      const timeSlot = selectedTimeSlots[selectedDate] || 'FULL_DAY';
      onSubmit(selectedDate, timeSlot);
    }
    setShowSuccess(true);
  };

  const handleClear = () => {
    if (selectedDate) {
      // Clear the time slot for the current date
      setSelectedTimeSlots(prev => {
        const newState = { ...prev };
        delete newState[selectedDate];
        return newState;
      });
    }
    if (onClear) {
      onClear();
    }
  };

    const isFormValid = isAuthenticated && selectedSeat;

    return (
      <>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: "100%",
            maxWidth: 600,
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" component="h2" mb={3} textAlign="center">
            Reserve Your Seat
          </Typography>

          {selectedSeat && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Selected Seat: {selectedSeat}
            </Alert>
          )}

          {currentUser && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Booking as: {currentUser}
            </Alert>
          )}

          {/* Date, Seat, and Delete Button Row */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
            {/* Generate dates based on new logic */}
            {(() => {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const currentHour = now.getHours();
              const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
              const dates: Date[] = [];
              
              // Check if it's after 3 PM on Friday
              const isAfterFridayDeadline = currentDay === 5 && currentHour >= 15; // Friday and >= 3 PM
              
              if (isAfterFridayDeadline) {
                // Show next week's working days (Monday to Friday)
                const nextMonday = new Date(today);
                const daysUntilNextMonday = (8 - currentDay) % 7; // Days until next Monday
                nextMonday.setDate(today.getDate() + daysUntilNextMonday);
                
                for (let i = 0; i < 5; i++) {
                  const date = new Date(nextMonday);
                  date.setDate(nextMonday.getDate() + i);
                  dates.push(date);
                }
              } else {
                // Show current week's working days (Monday to Friday)
                const monday = new Date(today);
                const daysFromMonday = (currentDay + 6) % 7; // Calculate days since Monday
                monday.setDate(today.getDate() - daysFromMonday);
                
                for (let i = 0; i < 5; i++) {
                  const date = new Date(monday);
                  date.setDate(monday.getDate() + i);
                  dates.push(date);
                }
              }
              return dates.map((date, idx) => {
                const dateStr = date.toISOString().split("T")[0];
                const isSelected = selectedDate === dateStr;
                const booking = userBookings.find(b => b.date === dateStr);
                
                // Check if date is in the past (only for current week scenario)
                const isPastDate = !isAfterFridayDeadline && date < today;
                
                let seatLabel;
                if (isSelected) {
                  if (booking) {
                    seatLabel = formatSeatDisplay(booking.seatId);
                  } else if (selectedSeat) {
                    seatLabel = formatSeatDisplay(selectedSeat);
                  } else {
                    seatLabel = "not booked yet";
                  }
                } else if (booking) {
                  seatLabel = formatSeatDisplay(booking.seatId);
                } else {
                  seatLabel = "not booked yet";
                }
                return (
                  <Box
                    key={idx}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Chip
                      label={date.toLocaleDateString()}
                      color={isPastDate ? "default" : "primary"}
                      variant="outlined"
                      sx={{
                        fontSize: "0.875rem",
                        flex: 1,
                        fontWeight: isSelected ? "bold" : "normal",
                        boxShadow: isSelected ? 2 : 0,
                        opacity: isPastDate ? 0.5 : 1,
                        cursor: isPastDate ? "not-allowed" : "pointer",
                      }}
                      onClick={
                        onDateClick && !isPastDate
                          ? () => onDateClick(dateStr)
                          : undefined
                      }
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={getTimeSlotForDate(dateStr)}
                        onChange={(e) => handleTimeSlotChange(dateStr, e.target.value as TimeSlotType)}
                        displayEmpty
                        variant="outlined"
                        sx={{ height: 32, minWidth: '140px' }}
                        disabled={!!booking || isPastDate}
                      >
                        {(() => {
                          // Only filter time slots for the selected seat AND selected date
                          // For other dates, show all options unless there's an existing booking
                          let availableSlots: TimeSlotType[] = ['AM', 'PM', 'FULL_DAY'];
                          
                          if (selectedSeat && selectedDate === dateStr) {
                            // Only apply filtering for the currently selected date
                            availableSlots = getAvailableTimeSlots(selectedSeat, dateStr);
                          }
                          
                          return availableSlots.map(timeSlot => (
                            <MenuItem key={timeSlot} value={timeSlot}>
                              {timeSlot === 'AM' ? 'Morning (AM)' : 
                               timeSlot === 'PM' ? 'Afternoon (PM)' : 
                               'Full Day'}
                            </MenuItem>
                          ));
                        })()}
                      </Select>
                    </FormControl>
                    <Chip
                      label={seatLabel}
                      color={booking ? "secondary" : "default"}
                      variant={booking ? "filled" : "outlined"}
                      sx={{ fontSize: "0.875rem" }}
                    />
                    <IconButton
                      color="error"
                      size="small"
                      title="Remove this date"
                      onClick={async () => {
                        if (!currentUser) return;
                        if (!booking) return;
                        try {
                          const allUserBookings = await bookingService.getUserBookings(currentUser);
                          const fullBooking = allUserBookings.find(b => b.date === dateStr && b.seatId === booking.seatId && b.status === 'ACTIVE');
                          if (!fullBooking) return;
                          await bookingService.cancelBooking(fullBooking.id, currentUser);
                          // Reset the time slot for this date to default
                          setSelectedTimeSlots(prev => {
                            const newState = { ...prev };
                            delete newState[dateStr]; // Remove the time slot for this date
                            return newState;
                          });
                          if (onBookingChange) await onBookingChange();
                          handleClear(); // Clear the time slot selection
                        } catch (err) {
                          console.error('Failed to cancel booking:', err);
                        }
                      }}
                      disabled={!booking || isPastDate}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                );
              });
            })()}
          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{ mt: 2 }}
              disabled={!isFormValid}
            >
              {!isAuthenticated
                ? "Please Authenticate First"
                : !selectedSeat
                ? "Select a Seat"
                : "Reserve Seat"}
            </Button>
          </Box>
        </Paper>

        <Snackbar
          open={showSuccess}
          autoHideDuration={4000}
          onClose={() => setShowSuccess(false)}
        >
          <Alert severity="success" onClose={() => setShowSuccess(false)}>
            Reservation submitted successfully!
          </Alert>

        </Snackbar>
      </>
    );
}

