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
  ListSubheader,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";

type TimeSlotType = 'AM' | 'PM' | 'FULL_DAY';

interface ReservationFormProps {
  selectedSeat?: string;
  selectedSeatsFromClick?: { [date: string]: string };
  onSubmit?: (bookings: Array<{ date: string; seatId: string; timeSlot: TimeSlotType }>) => void;
  currentUser?: string;
  isAuthenticated?: boolean;
  onDateClick?: (date: string) => void;
  selectedDate?: string;
  userBookings?: { date: string; seatId: string; timeSlot: TimeSlotType }[];
  onBookingChange?: () => void;
  onClear?: () => void;
  onDropdownSelectionChange?: (selections: { [date: string]: string }) => void;
  allBookingsForDate?: Array<{
    seatId: string;
    userId: string;
    timeSlot: 'AM' | 'PM' | 'FULL_DAY';
  }>;
}

export default function ReservationForm({
  selectedSeat,
  selectedSeatsFromClick = {},
  onSubmit,
  currentUser,
  isAuthenticated = false,
  onDateClick,
  selectedDate,
  userBookings = [],
  onBookingChange,
  onClear,
  onDropdownSelectionChange,
  allBookingsForDate = []
}: ReservationFormProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<{ [date: string]: TimeSlotType }>({});
  const [lastSelectedSeat, setLastSelectedSeat] = useState<string | undefined>(undefined);
  const [pendingBookings, setPendingBookings] = useState<{ [date: string]: { seatId: string; timeSlot: TimeSlotType } }>({});
  const [previousUser, setPreviousUser] = useState<string | undefined>(currentUser);
  const [selectedSeatsFromDropdown, setSelectedSeatsFromDropdown] = useState<{ [date: string]: string }>({});

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

  // Get available seats based on selected time slot and date
  const getAvailableSeats = useCallback((dateStr: string, timeSlot: TimeSlotType | ''): string[] => {
    if (!dateStr || !timeSlot) return [];

    const availableSeats: string[] = [];
    
    // Generate all possible seats (assuming tables A-H, each with 6 seats)
    const tables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    tables.forEach(tableLetter => {
      for (let seatNum = 1; seatNum <= 6; seatNum++) {
        const seatId = `${tableLetter}${seatNum}`;
        
        // Check if this seat is available for the selected time slot
        const seatBookings = allBookingsForDate.filter(booking => booking.seatId === seatId);
        
        let isAvailable = true;
        
        if (seatBookings.length > 0) {
          // Check for conflicts with the selected time slot
          const hasFullDayBooking = seatBookings.some(booking => booking.timeSlot === 'FULL_DAY');
          const hasAmBooking = seatBookings.some(booking => booking.timeSlot === 'AM');
          const hasPmBooking = seatBookings.some(booking => booking.timeSlot === 'PM');
          
          if (timeSlot === 'FULL_DAY') {
            // FULL_DAY requires both AM and PM to be free
            isAvailable = !hasFullDayBooking && !hasAmBooking && !hasPmBooking;
          } else if (timeSlot === 'AM') {
            // AM requires no FULL_DAY booking and no AM booking
            isAvailable = !hasFullDayBooking && !hasAmBooking;
          } else if (timeSlot === 'PM') {
            // PM requires no FULL_DAY booking and no PM booking
            isAvailable = !hasFullDayBooking && !hasPmBooking;
          }
        }
        
        if (isAvailable) {
          availableSeats.push(seatId);
        }
      }
    });
    
    return availableSeats;
  }, [allBookingsForDate]);

  // Group available seats by table for dropdown
  const getGroupedAvailableSeats = useCallback((dateStr: string, timeSlot: TimeSlotType | '') => {
    const availableSeats = getAvailableSeats(dateStr, timeSlot);
    const grouped: { [table: string]: string[] } = {};
    
    availableSeats.forEach(seatId => {
      const table = seatId.charAt(0);
      if (!grouped[table]) {
        grouped[table] = [];
      }
      grouped[table].push(seatId);
    });
    
    // Sort seats within each table
    Object.keys(grouped).forEach(table => {
      grouped[table].sort((a, b) => {
        const numA = parseInt(a.slice(1));
        const numB = parseInt(b.slice(1));
        return numA - numB;
      });
    });
    
    return grouped;
  }, [getAvailableSeats]);

  // Handle seat selection from dropdown
  const handleSeatSelectionFromDropdown = (dateStr: string, seatId: string) => {
    console.log(`🎯 Seat selected from dropdown: ${seatId} for ${dateStr}`);
    const newSelections = {
      ...selectedSeatsFromDropdown,
      [dateStr]: seatId
    };
    setSelectedSeatsFromDropdown(newSelections);
    
    // Notify parent component about dropdown selection changes for visual sync
    if (onDropdownSelectionChange) {
      onDropdownSelectionChange(newSelections);
    }
    
    // Auto-select time slot if not already selected
    if (!selectedTimeSlots[dateStr]) {
      const availableSlots = getAvailableTimeSlots(seatId, dateStr);
      if (availableSlots.length === 3 && availableSlots.includes('FULL_DAY')) {
        setSelectedTimeSlots(prev => ({
          ...prev,
          [dateStr]: 'FULL_DAY'
        }));
      } else if (availableSlots.length === 1) {
        setSelectedTimeSlots(prev => ({
          ...prev,
          [dateStr]: availableSlots[0]
        }));
      }
    }
  };

  // Get current seat for a date (either from dropdown, external selection, or existing booking)
  const getCurrentSeat = (dateStr: string) => {
    // First check if there's an existing booking for this date
    const booking = userBookings.find(b => b.date === dateStr);
    if (booking) {
      return booking.seatId;
    }
    
    // Check if this is the selected date and we have a seat from external selection
    if (selectedDate === dateStr && selectedSeat) {
      return selectedSeat;
    }
    
    // Check if there's a seat from clicking on the seating layout for this date
    if (selectedSeatsFromClick[dateStr]) {
      return selectedSeatsFromClick[dateStr];
    }
    
    // Otherwise check dropdown selection
    return selectedSeatsFromDropdown[dateStr] || '';
  };

  // Reset all state when user changes (login/logout)
  const resetAllState = useCallback(() => {
    console.log('🔄 Resetting ReservationForm state');
    setSelectedTimeSlots({});
    setLastSelectedSeat(undefined);
    setPendingBookings({});
    setSelectedSeatsFromDropdown({});
    setShowSuccess(false);
  }, []);

  // Watch for user changes and reset state
  useEffect(() => {
    if (previousUser !== currentUser) {
      console.log(`👤 User changed from ${previousUser} to ${currentUser} - resetting state`);
      resetAllState();
      setPreviousUser(currentUser);
    }
  }, [currentUser, previousUser, resetAllState]);

  // Also reset state when user logs out (becomes unauthenticated)
  useEffect(() => {
    if (!isAuthenticated && (selectedTimeSlots && Object.keys(selectedTimeSlots).length > 0)) {
      console.log(`🚪 User logged out - resetting state`);
      resetAllState();
    }
  }, [isAuthenticated, selectedTimeSlots, resetAllState]);

  // Initialize time slots from user bookings and handle updates
  useEffect(() => {
    console.log('🔄 Processing userBookings update:', userBookings);
    
    const initialTimeSlots: { [date: string]: TimeSlotType } = {};
    userBookings.forEach(booking => {
      if (booking.timeSlot) {
        console.log(`📅 Setting time slot from booking: ${booking.date} = ${booking.timeSlot}`);
        initialTimeSlots[booking.date] = booking.timeSlot;
      }
    });
    
    // Only update if we have new booking data to add
    if (Object.keys(initialTimeSlots).length > 0) {
      setSelectedTimeSlots(prev => {
        const newState = {
          ...prev,  // Keep existing time slots
          ...initialTimeSlots  // Override/add with authoritative booking data
        };
        console.log('🎯 Updated selectedTimeSlots (preserving existing):', newState);
        console.log('🎯 Previous state was:', prev);
        console.log('🎯 Booking data adds:', initialTimeSlots);
        return newState;
      });
    } else if (userBookings.length === 0) {
      console.log('⏸️ No user bookings and no time slots to add - keeping current state');
    }
  }, [userBookings]);

  // Store dropdown selections as pending bookings
  useEffect(() => {
    // Update pending bookings based on dropdown selections and time slots
    const newPendingBookings: { [date: string]: { seatId: string; timeSlot: TimeSlotType } } = {};
    
    Object.entries(selectedSeatsFromDropdown).forEach(([date, seatId]) => {
      const timeSlot = selectedTimeSlots[date];
      if (seatId && timeSlot) {
        const existingBooking = userBookings.find(b => b.date === date && b.seatId === seatId);
        if (!existingBooking) {
          console.log(`📝 Storing pending booking from dropdown: ${seatId} on ${date} (${timeSlot})`);
          newPendingBookings[date] = {
            seatId,
            timeSlot
          };
        }
      }
    });
    
    setPendingBookings(newPendingBookings);
  }, [selectedSeatsFromDropdown, selectedTimeSlots, userBookings]);

  // Auto-select time slot when seat is selected based on availability
  useEffect(() => {
    if (selectedSeat && selectedDate) {
      // Only auto-select when the seat actually changes, not on every render
      const seatChanged = lastSelectedSeat !== selectedSeat;
      
      if (seatChanged) {
        setLastSelectedSeat(selectedSeat);
        
        const availableSlots = getAvailableTimeSlots(selectedSeat, selectedDate);
        console.log(`🎯 Seat changed to ${selectedSeat} for ${selectedDate}. Available slots:`, availableSlots);
        
        // Check if there's already a user booking for this date
        const existingBooking = userBookings.find(b => b.date === selectedDate);
        if (existingBooking) {
          console.log(`📌 User already has booking for ${selectedDate}:`, existingBooking);
          return;
        }
        
        // Check if there's a pending booking for this date
        const pendingBooking = pendingBookings[selectedDate];
        if (pendingBooking && pendingBooking.seatId === selectedSeat) {
          console.log(`📌 Restoring pending booking for ${selectedDate}:`, pendingBooking);
          setSelectedTimeSlots(prev => ({
            ...prev,
            [selectedDate]: pendingBooking.timeSlot
          }));
          return;
        }
        
        // Auto-select appropriate time slot when seat changes based on availability
        if (availableSlots.length === 3 && availableSlots.includes('FULL_DAY')) {
          // If no one has booked any time slots, default to FULL_DAY
          console.log(`🔄 Fully available seat - auto-selecting FULL_DAY`);
          setSelectedTimeSlots(prev => ({
            ...prev,
            [selectedDate]: 'FULL_DAY'
          }));
        } else if (availableSlots.length === 1) {
          // Only one slot available (someone booked AM, only PM left OR someone booked PM, only AM left)
          const onlyAvailableSlot = availableSlots[0];
          console.log(`🔄 One slot available - auto-selecting: ${onlyAvailableSlot}`);
          setSelectedTimeSlots(prev => ({
            ...prev,
            [selectedDate]: onlyAvailableSlot
          }));
        } else if (availableSlots.length === 2) {
          // This should not normally happen with current logic, but handle just in case
          const nonFullDaySlot = availableSlots.find(slot => slot !== 'FULL_DAY') || availableSlots[0];
          console.log(`🔄 Two slots available - auto-selecting: ${nonFullDaySlot}`);
          setSelectedTimeSlots(prev => ({
            ...prev,
            [selectedDate]: nonFullDaySlot
          }));
        } else {
          console.log(`⚠️ No available time slots for seat ${selectedSeat} on ${selectedDate}`);
        }
      }
    }
  }, [selectedSeat, selectedDate, lastSelectedSeat, allBookingsForDate, userBookings, getAvailableTimeSlots, pendingBookings]);

  // Auto-select time slots for seats selected via clicking on seating layout
  useEffect(() => {
    Object.entries(selectedSeatsFromClick).forEach(([dateStr, seatId]) => {
      if (seatId && !selectedTimeSlots[dateStr]) {
        // Check if there's already a user booking for this date
        const existingBooking = userBookings.find(b => b.date === dateStr);
        if (existingBooking) {
          return;
        }

        const availableSlots = getAvailableTimeSlots(seatId, dateStr);
        console.log(`🎯 Auto-selecting time slot for clicked seat ${seatId} on ${dateStr}. Available slots:`, availableSlots);
        
        if (availableSlots.length === 3 && availableSlots.includes('FULL_DAY')) {
          // If no one has booked any time slots, default to FULL_DAY
          console.log(`🔄 Fully available clicked seat - auto-selecting FULL_DAY`);
          setSelectedTimeSlots(prev => ({
            ...prev,
            [dateStr]: 'FULL_DAY'
          }));
        } else if (availableSlots.length === 1) {
          // Only one slot available
          const onlyAvailableSlot = availableSlots[0];
          console.log(`🔄 One slot available for clicked seat - auto-selecting: ${onlyAvailableSlot}`);
          setSelectedTimeSlots(prev => ({
            ...prev,
            [dateStr]: onlyAvailableSlot
          }));
        } else if (availableSlots.length === 2) {
          // Two slots available, prefer non-FULL_DAY
          const nonFullDaySlot = availableSlots.find(slot => slot !== 'FULL_DAY') || availableSlots[0];
          console.log(`🔄 Two slots available for clicked seat - auto-selecting: ${nonFullDaySlot}`);
          setSelectedTimeSlots(prev => ({
            ...prev,
            [dateStr]: nonFullDaySlot
          }));
        }
      }
    });
  }, [selectedSeatsFromClick, selectedTimeSlots, userBookings, getAvailableTimeSlots]);



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
      console.log(`⚡ Time slot from existing booking for ${dateStr}: ${existingBooking.timeSlot}`);
      return existingBooking.timeSlot;
    }
    // Then check if there's a selected time slot (only if it's not null/undefined)
    if (selectedTimeSlots[dateStr]) {
      console.log(`⚡ Time slot from state for ${dateStr}: ${selectedTimeSlots[dateStr]}`);
      return selectedTimeSlots[dateStr];
    }
    // Return empty string if no booking or selection exists (before seat is clicked)
    console.log(`⚡ No time slot found for ${dateStr}`);
    return '';
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    console.log('🚀 Starting submission process...');
    console.log('📊 Current state:');
    console.log('  selectedSeatsFromDropdown:', selectedSeatsFromDropdown);
    console.log('  selectedSeatsFromClick:', selectedSeatsFromClick);
    console.log('  selectedTimeSlots:', selectedTimeSlots);
    console.log('  selectedSeat (current):', selectedSeat);
    console.log('  selectedDate:', selectedDate);
    
    // Collect all bookings from all sources
    const allBookings: Array<{ date: string; seatId: string; timeSlot: TimeSlotType }> = [];
    const processedDates = new Set<string>();
    
    // 1. Collect from dropdown selections
    Object.entries(selectedSeatsFromDropdown).forEach(([date, seatId]) => {
      const timeSlot = selectedTimeSlots[date];
      if (seatId && timeSlot) {
        console.log(`📊 Counting dropdown booking: ${seatId} on ${date} (${timeSlot})`);
        allBookings.push({ date, seatId, timeSlot });
        processedDates.add(date);
      }
    });
    
    // 2. Collect from clicked seat selections
    Object.entries(selectedSeatsFromClick).forEach(([date, seatId]) => {
      const timeSlot = selectedTimeSlots[date];
      if (seatId && timeSlot && !processedDates.has(date)) {
        console.log(`📊 Counting clicked booking: ${seatId} on ${date} (${timeSlot})`);
        allBookings.push({ date, seatId, timeSlot });
        processedDates.add(date);
      }
    });
    
    // 3. Add current seat selection if it exists and not already processed
    if (selectedSeat && selectedDate && selectedTimeSlots[selectedDate] && !processedDates.has(selectedDate)) {
      console.log(`📊 Counting current booking: ${selectedSeat} on ${selectedDate} (${selectedTimeSlots[selectedDate]})`);
      allBookings.push({
        date: selectedDate,
        seatId: selectedSeat,
        timeSlot: selectedTimeSlots[selectedDate]
      });
    }
    
    console.log(`📊 Total bookings ready: ${allBookings.length}`);
    console.log('📊 All bookings:', allBookings);
    
    if (onSubmit && allBookings.length > 0) {
      onSubmit(allBookings);
      
      // Clear dropdown selections after submission
      setSelectedSeatsFromDropdown({});
      setPendingBookings({});
      
      // Notify parent about clearing dropdown selections
      if (onDropdownSelectionChange) {
        onDropdownSelectionChange({});
      }
      
      // DON'T clear time slots for newly booked dates - they will become actual bookings
      // The time slots will be preserved and updated when userBookings refreshes
      console.log('✅ Keeping time slots for newly booked dates - they will become actual bookings');
      
      // Note: selectedSeatsFromClick is managed by the parent component
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
      
      // Clear pending booking for current date
      setPendingBookings(prev => {
        const newState = { ...prev };
        delete newState[selectedDate];
        return newState;
      });
    }
    if (onClear) {
      onClear();
    }
  };

    // Calculate total bookings to be created
    const calculateTotalBookings = () => {
      let count = 0;
      const processedDates = new Set<string>();
      
      // Count dropdown selections
      Object.entries(selectedSeatsFromDropdown).forEach(([date, seatId]) => {
        const timeSlot = selectedTimeSlots[date];
        if (seatId && timeSlot) {
          count++;
          processedDates.add(date);
        }
      });
      
      // Count clicked seat selections
      Object.entries(selectedSeatsFromClick).forEach(([date, seatId]) => {
        const timeSlot = selectedTimeSlots[date];
        if (seatId && timeSlot && !processedDates.has(date)) {
          count++;
          processedDates.add(date);
        }
      });
      
      // Count current selection if not already processed
      if (selectedSeat && selectedDate && selectedTimeSlots[selectedDate] && !processedDates.has(selectedDate)) {
        count++;
      }
      
      return count;
    };

    const totalBookings = calculateTotalBookings();
    const isFormValid = isAuthenticated && totalBookings > 0;

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
            Reserve Your Seats
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
                        onChange={(e) => {
                          const value = e.target.value as string;
                          if (value === '') {
                            // Handle empty selection by clearing the time slot
                            setSelectedTimeSlots(prev => {
                              const newState = { ...prev };
                              delete newState[dateStr];
                              return newState;
                            });
                          } else {
                            handleTimeSlotChange(dateStr, value as TimeSlotType);
                          }
                        }}
                        displayEmpty
                        variant="outlined"
                        sx={{ height: 32, minWidth: '140px' }}
                        disabled={!!booking || isPastDate}
                      >
                        {/* Empty option for no selection */}
                        <MenuItem value="">
                          <em>Select time slot</em>
                        </MenuItem>
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
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={getCurrentSeat(dateStr)}
                        onChange={(e) => handleSeatSelectionFromDropdown(dateStr, e.target.value as string)}
                        displayEmpty
                        variant="outlined"
                        sx={{ height: 32, minWidth: '150px' }}
                        disabled={!!booking || isPastDate}
                      >
                        {/* Empty option for no selection */}
                        <MenuItem value="">
                          <em>Select seat</em>
                        </MenuItem>
                        {(() => {
                          // If there's an existing booking, show only that seat
                          if (booking) {
                            const tableLetter = booking.seatId.charAt(0);
                            const seatNumber = booking.seatId.slice(1);
                            return (
                              <MenuItem key={booking.seatId} value={booking.seatId}>
                                Table {tableLetter}, Seat {seatNumber} (Booked)
                              </MenuItem>
                            );
                          }
                          
                          if (!selectedTimeSlots[dateStr]) {
                            return null; // No seats shown until time slot is selected
                          }
                          
                          const groupedSeats = getGroupedAvailableSeats(dateStr, selectedTimeSlots[dateStr]);
                          
                          return Object.keys(groupedSeats)
                            .sort() // Sort table letters A, B, C, etc.
                            .map(tableLetter => [
                              <ListSubheader key={`header-${tableLetter}`}>
                                Table {tableLetter}
                              </ListSubheader>,
                              ...groupedSeats[tableLetter]
                                .sort((a, b) => {
                                  // Sort by seat number
                                  const numA = parseInt(a.slice(1));
                                  const numB = parseInt(b.slice(1));
                                  return numA - numB;
                                })
                                .map(seatId => (
                                  <MenuItem key={seatId} value={seatId}>
                                    Seat {seatId.slice(1)} ({seatId})
                                  </MenuItem>
                                ))
                            ]).flat();
                        })()}
                      </Select>
                    </FormControl>
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
                : totalBookings === 0
                ? "Select a Seat"
                : totalBookings === 1
                ? "Reserve Seat"
                : `Reserve ${totalBookings} Seats`}
            </Button>
          </Box>
        </Paper>

        <Snackbar
          open={showSuccess}
          autoHideDuration={4000}
          onClose={() => setShowSuccess(false)}
        >
          <Alert severity="success" onClose={() => setShowSuccess(false)}>
            {totalBookings === 1 ? 'Reservation submitted successfully!' : `${totalBookings} reservations submitted successfully!`}
          </Alert>

        </Snackbar>
      </>
    );
}

