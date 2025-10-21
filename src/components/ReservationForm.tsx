import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { bookingService } from "../services/bookingService";
import {
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

type TimeSlotType = "AM" | "PM" | "FULL_DAY";

interface ReservationFormProps {
  selectedSeat?: string;
  selectedSeatsFromClick?: { [date: string]: string };
  selectedSeatsFromDropdown?: { [date: string]: string };
  onSubmit?: (
    bookings: Array<{ date: string; seatId: string; timeSlot: TimeSlotType }>
  ) => void;
  currentUser?: string;
  onDateClick?: (date: string) => void;
  selectedDate?: string;
  userBookings?: { date: string; seatId: string; timeSlot: TimeSlotType }[];
  onBookingChange?: () => void;
  onClear?: () => void;
  onDropdownSelectionChange?: (selections: { [date: string]: string }) => void;
  onClearClickSelection?: (date: string) => void;
  allBookingsForDate?: Array<{
    seatId: string;
    userId: string;
    timeSlot: "AM" | "PM" | "FULL_DAY";
  }>;
}

export default function ReservationForm({
  selectedSeat,
  selectedSeatsFromClick = {},
  selectedSeatsFromDropdown: externalSelectedSeatsFromDropdown = {},
  onSubmit,
  currentUser,
  onDateClick,
  selectedDate,
  userBookings = [],
  onBookingChange,
  onClear,
  onDropdownSelectionChange,
  onClearClickSelection,
  allBookingsForDate = [],
}: ReservationFormProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<{
    [date: string]: TimeSlotType;
  }>({});
  const [lastSelectedSeat, setLastSelectedSeat] = useState<string | undefined>(
    undefined
  );
  const [pendingBookings, setPendingBookings] = useState<{
    [date: string]: { seatId: string; timeSlot: TimeSlotType };
  }>({});
  const [previousUser, setPreviousUser] = useState<string | undefined>(
    currentUser
  );

  // Suppress unused variable warning - pendingBookings is used through setPendingBookings
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedPendingBookings = pendingBookings;

  // Ref to access current selectedTimeSlots without causing useEffect dependency issues
  const selectedTimeSlotsRef = useRef(selectedTimeSlots);
  selectedTimeSlotsRef.current = selectedTimeSlots;

  // Use external prop for dropdown selections instead of internal state
  const selectedSeatsFromDropdown = externalSelectedSeatsFromDropdown;

  // Helper function to update dropdown selections via parent callback
  const updateDropdownSelection = useCallback(
    (dateStr: string, seatId: string) => {
      if (onDropdownSelectionChange) {
        const newSelections = {
          ...selectedSeatsFromDropdown,
          [dateStr]: seatId,
        };
        onDropdownSelectionChange(newSelections);
      }
    },
    [onDropdownSelectionChange, selectedSeatsFromDropdown]
  );

  // Helper function to clear all dropdown selections
  const clearAllDropdownSelections = useCallback(() => {
    if (onDropdownSelectionChange) {
      onDropdownSelectionChange({});
    }
  }, [onDropdownSelectionChange]);

  // Get available time slots for a seat on a specific date
  const getAvailableTimeSlots = useCallback(
    (seatId: string, dateStr: string): TimeSlotType[] => {
      if (!seatId || !dateStr) return ["AM", "PM", "FULL_DAY"];

      // Find all bookings for this seat on this date
      const seatBookings = allBookingsForDate.filter(
        (booking) => booking.seatId === seatId
      );

      if (seatBookings.length === 0) {
        // No bookings, all time slots available
        return ["AM", "PM", "FULL_DAY"];
      }

      // Check for FULL_DAY bookings
      const hasFullDayBooking = seatBookings.some(
        (booking) => booking.timeSlot === "FULL_DAY"
      );
      if (hasFullDayBooking) {
        // If there's a full day booking, no slots available
        return [];
      }

      // Check individual time slots
      const hasAmBooking = seatBookings.some(
        (booking) => booking.timeSlot === "AM"
      );
      const hasPmBooking = seatBookings.some(
        (booking) => booking.timeSlot === "PM"
      );

      const availableSlots: TimeSlotType[] = [];

      if (!hasAmBooking) availableSlots.push("AM");
      if (!hasPmBooking) availableSlots.push("PM");

      // Only show FULL_DAY if both AM and PM are available
      if (!hasAmBooking && !hasPmBooking) {
        availableSlots.push("FULL_DAY");
      }

      return availableSlots;
    },
    [allBookingsForDate]
  );

  // Get available seats based on selected time slot and date
  const getAvailableSeats = useCallback(
    (dateStr: string, timeSlot: TimeSlotType | ""): string[] => {
      if (!dateStr || !timeSlot) return [];

      const availableSeats: string[] = [];

      // Generate all possible seats (assuming tables A-H, each with 6 seats)
      const tables = ["A", "B", "C", "D", "E", "F", "G", "H"];

      tables.forEach((tableLetter) => {
        for (let seatNum = 1; seatNum <= 6; seatNum++) {
          const seatId = `${tableLetter}${seatNum}`;

          // Check if this seat is available for the selected time slot
          const seatBookings = allBookingsForDate.filter(
            (booking) => booking.seatId === seatId
          );

          let isAvailable = true;

          if (seatBookings.length > 0) {
            // Check for conflicts with the selected time slot
            const hasFullDayBooking = seatBookings.some(
              (booking) => booking.timeSlot === "FULL_DAY"
            );
            const hasAmBooking = seatBookings.some(
              (booking) => booking.timeSlot === "AM"
            );
            const hasPmBooking = seatBookings.some(
              (booking) => booking.timeSlot === "PM"
            );

            if (timeSlot === "FULL_DAY") {
              // FULL_DAY requires both AM and PM to be free
              isAvailable =
                !hasFullDayBooking && !hasAmBooking && !hasPmBooking;
            } else if (timeSlot === "AM") {
              // AM requires no FULL_DAY booking and no AM booking
              isAvailable = !hasFullDayBooking && !hasAmBooking;
            } else if (timeSlot === "PM") {
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
    },
    [allBookingsForDate]
  );

  // Group available seats by table for dropdown
  const getGroupedAvailableSeats = useCallback(
    (dateStr: string, timeSlot: TimeSlotType | "") => {
      const availableSeats = getAvailableSeats(dateStr, timeSlot);
      const grouped: { [table: string]: string[] } = {};

      availableSeats.forEach((seatId) => {
        const table = seatId.charAt(0);
        if (!grouped[table]) {
          grouped[table] = [];
        }
        grouped[table].push(seatId);
      });

      // Sort seats within each table
      Object.keys(grouped).forEach((table) => {
        grouped[table].sort((a, b) => {
          const numA = parseInt(a.slice(1));
          const numB = parseInt(b.slice(1));
          return numA - numB;
        });
      });

      return grouped;
    },
    [getAvailableSeats]
  );

  // Handle seat selection from dropdown
  const handleSeatSelectionFromDropdown = (dateStr: string, seatId: string) => {
    const newSelections = {
      ...selectedSeatsFromDropdown,
      [dateStr]: seatId,
    };

    // Notify parent component about dropdown selection changes (parent will update the state)
    if (onDropdownSelectionChange) {
      onDropdownSelectionChange(newSelections);
    }

    // Auto-select time slot if not already selected
    if (!selectedTimeSlots[dateStr]) {
      const availableSlots = getAvailableTimeSlots(seatId, dateStr);
      if (availableSlots.length === 3 && availableSlots.includes("FULL_DAY")) {
        setSelectedTimeSlots((prev) => ({
          ...prev,
          [dateStr]: "FULL_DAY",
        }));
      } else if (availableSlots.length === 1) {
        setSelectedTimeSlots((prev) => ({
          ...prev,
          [dateStr]: availableSlots[0],
        }));
      }
    }
  };

  // Get current seat for a date (either from dropdown, external selection, or existing booking)
  const getCurrentSeat = useCallback(
    (dateStr: string) => {
      console.log(`🎯 getCurrentSeat called for date: ${dateStr}`);

      // First check if there's an existing booking for this date
      const booking = userBookings.find((b) => b.date === dateStr);
      if (booking) {
        console.log(
          `🎯 Found existing booking for ${dateStr}: ${booking.seatId}`
        );
        return booking.seatId;
      }

      // Since we keep dropdown and click selections in sync, prefer dropdown as the single source of truth
      if (selectedSeatsFromDropdown[dateStr]) {
        console.log(
          `🎯 Found dropdown selection for ${dateStr}: ${selectedSeatsFromDropdown[dateStr]}`
        );
        return selectedSeatsFromDropdown[dateStr];
      }

      // Fallback: Check if this is the selected date and we have a seat from external selection (seat button click)
      if (selectedDate === dateStr && selectedSeat) {
        console.log(
          `🎯 Found selectedSeat for current date ${dateStr}: ${selectedSeat}`
        );
        return selectedSeat;
      }

      // Check if there's a seat from clicking on the seating layout for this date
      if (selectedSeatsFromClick[dateStr]) {
        console.log(
          `🎯 Found click selection for ${dateStr}: ${selectedSeatsFromClick[dateStr]}`
        );
        return selectedSeatsFromClick[dateStr];
      }

      // Return empty if no selection
      console.log(`🎯 No selection found for ${dateStr}, returning empty`);
      return "";
    },
    [
      selectedSeatsFromDropdown,
      selectedSeat,
      selectedDate,
      userBookings,
      selectedSeatsFromClick,
    ]
  );

  // Reset all state when user changes (login/logout)
  const resetAllState = useCallback(() => {
    setSelectedTimeSlots({});
    setLastSelectedSeat(undefined);
    setPendingBookings({});
    clearAllDropdownSelections();
    setShowSuccess(false);
  }, [clearAllDropdownSelections]);

  // Watch for user changes and reset state
  useEffect(() => {
    if (previousUser !== currentUser) {
      resetAllState();
      setPreviousUser(currentUser);
    }
  }, [currentUser, previousUser, resetAllState]);

  // Also reset state when user logs out (becomes unauthenticated)
  useEffect(() => {
    if (
      !currentUser &&
      selectedTimeSlots &&
      Object.keys(selectedTimeSlots).length > 0
    ) {
      resetAllState();
    }
  }, [currentUser, selectedTimeSlots, resetAllState]);

  // Initialize time slots from user bookings and handle updates
  useEffect(() => {
    const initialTimeSlots: { [date: string]: TimeSlotType } = {};
    userBookings.forEach((booking) => {
      if (booking.timeSlot) {
        initialTimeSlots[booking.date] = booking.timeSlot;
      }
    });

    // Only update if we have new booking data to add
    if (Object.keys(initialTimeSlots).length > 0) {
      setSelectedTimeSlots((prev) => {
        const newState = {
          ...prev, // Keep existing time slots
          ...initialTimeSlots, // Override/add with authoritative booking data
        };
        return newState;
      });
    }
  }, [userBookings]);

  // Store dropdown selections as pending bookings
  useEffect(() => {
    // Update pending bookings based on dropdown selections and time slots
    const newPendingBookings: {
      [date: string]: { seatId: string; timeSlot: TimeSlotType };
    } = {};

    Object.entries(selectedSeatsFromDropdown).forEach(([date, seatId]) => {
      const timeSlot = selectedTimeSlots[date];
      if (seatId && timeSlot) {
        const existingBooking = userBookings.find(
          (b) => b.date === date && b.seatId === seatId
        );
        if (!existingBooking) {
          newPendingBookings[date] = {
            seatId,
            timeSlot,
          };
        }
      }
    });

    // Only update if the content has actually changed to prevent infinite loops
    setPendingBookings((prev) => {
      const prevKeys = Object.keys(prev).sort();
      const newKeys = Object.keys(newPendingBookings).sort();

      // Check if keys are different
      if (
        prevKeys.length !== newKeys.length ||
        !prevKeys.every((key, index) => key === newKeys[index])
      ) {
        return newPendingBookings;
      }

      // Check if values are different
      const hasChanged = newKeys.some((date) => {
        const prevBooking = prev[date];
        const newBooking = newPendingBookings[date];
        return (
          !prevBooking ||
          prevBooking.seatId !== newBooking.seatId ||
          prevBooking.timeSlot !== newBooking.timeSlot
        );
      });

      return hasChanged ? newPendingBookings : prev;
    });
  }, [selectedSeatsFromDropdown, selectedTimeSlots, userBookings]);

  // Auto-select time slot when seat is selected based on availability
  useEffect(() => {
    if (selectedSeat && selectedDate) {
      // Only auto-select when the seat actually changes, not on every render
      const seatChanged = lastSelectedSeat !== selectedSeat;

      if (seatChanged) {
        setLastSelectedSeat(selectedSeat);

        const availableSlots = getAvailableTimeSlots(
          selectedSeat,
          selectedDate
        );
        // Check if there's already a user booking for this date
        const existingBooking = userBookings.find(
          (b) => b.date === selectedDate
        );
        if (existingBooking) {
          return;
        }

        // Check if there's already a time slot selected for this date
        const currentTimeSlot = selectedTimeSlotsRef.current[selectedDate];
        if (currentTimeSlot) {
          // Time slot already selected, don't auto-select
          return;
        }

        // Auto-select appropriate time slot when seat changes based on availability
        if (
          availableSlots.length === 3 &&
          availableSlots.includes("FULL_DAY")
        ) {
          // If no one has booked any time slots, default to FULL_DAY
          setSelectedTimeSlots((prev) => ({
            ...prev,
            [selectedDate]: "FULL_DAY",
          }));
        } else if (availableSlots.length === 1) {
          // Only one slot available (someone booked AM, only PM left OR someone booked PM, only AM left)
          const onlyAvailableSlot = availableSlots[0];
          setSelectedTimeSlots((prev) => ({
            ...prev,
            [selectedDate]: onlyAvailableSlot,
          }));
        } else if (availableSlots.length === 2) {
          // This should not normally happen with current logic, but handle just in case
          const nonFullDaySlot =
            availableSlots.find((slot) => slot !== "FULL_DAY") ||
            availableSlots[0];
          setSelectedTimeSlots((prev) => ({
            ...prev,
            [selectedDate]: nonFullDaySlot,
          }));
        }
      }
    }
  }, [
    selectedSeat,
    selectedDate,
    lastSelectedSeat,
    allBookingsForDate,
    userBookings,
    getAvailableTimeSlots,
  ]);

  // Auto-select time slots for seats selected via clicking on seating layout
  useEffect(() => {
    Object.entries(selectedSeatsFromClick).forEach(([dateStr, seatId]) => {
      if (seatId && !selectedTimeSlots[dateStr]) {
        // Check if there's already a user booking for this date
        const existingBooking = userBookings.find((b) => b.date === dateStr);
        if (existingBooking) {
          return;
        }

        const availableSlots = getAvailableTimeSlots(seatId, dateStr);
        if (
          availableSlots.length === 3 &&
          availableSlots.includes("FULL_DAY")
        ) {
          // If no one has booked any time slots, default to FULL_DAY
          setSelectedTimeSlots((prev) => ({
            ...prev,
            [dateStr]: "FULL_DAY",
          }));
        } else if (availableSlots.length === 1) {
          // Only one slot available
          const onlyAvailableSlot = availableSlots[0];
          setSelectedTimeSlots((prev) => ({
            ...prev,
            [dateStr]: onlyAvailableSlot,
          }));
        } else if (availableSlots.length === 2) {
          // Two slots available, prefer non-FULL_DAY
          const nonFullDaySlot =
            availableSlots.find((slot) => slot !== "FULL_DAY") ||
            availableSlots[0];
          setSelectedTimeSlots((prev) => ({
            ...prev,
            [dateStr]: nonFullDaySlot,
          }));
        }
      }
    });
  }, [
    selectedSeatsFromClick,
    selectedTimeSlots,
    userBookings,
    getAvailableTimeSlots,
  ]);

  // Validate seat selections when time slots or available seats change
  useEffect(() => {
    Object.entries(selectedTimeSlots).forEach(([dateStr, timeSlot]) => {
      if (!timeSlot) return;

      const availableSeats = getAvailableSeats(dateStr, timeSlot);

      // Check and clear invalid dropdown selections (which also clears click selections since they're synced)
      if (
        selectedSeatsFromDropdown[dateStr] &&
        !availableSeats.includes(selectedSeatsFromDropdown[dateStr])
      ) {
        updateDropdownSelection(dateStr, "");
        // Also clear click selection in parent component
        if (onClearClickSelection) {
          onClearClickSelection(dateStr);
        }
      }
    });
  }, [
    selectedTimeSlots,
    selectedSeatsFromDropdown,
    getAvailableSeats,
    onClearClickSelection,
    updateDropdownSelection,
  ]);

  const handleTimeSlotChange = (date: string, timeSlot: TimeSlotType) => {
    setSelectedTimeSlots((prev) => ({
      ...prev,
      [date]: timeSlot,
    }));

    // Clear seat selections that are not available for the new time slot
    const availableSeats = getAvailableSeats(date, timeSlot);

    // Clear both dropdown and click selections if not available for this time slot (they're kept in sync)
    if (
      selectedSeatsFromDropdown[date] &&
      !availableSeats.includes(selectedSeatsFromDropdown[date])
    ) {
      updateDropdownSelection(date, "");
      // Also clear click selection in parent
      if (onClearClickSelection) {
        onClearClickSelection(date);
      }
    }
  };

  const getTimeSlotForDate = (dateStr: string) => {
    // First check if there's an existing booking
    const existingBooking = userBookings.find((b) => b.date === dateStr);
    if (existingBooking?.timeSlot) {
      return existingBooking.timeSlot;
    }
    // Then check if there's a selected time slot (only if it's not null/undefined)
    if (selectedTimeSlots[dateStr]) {
      return selectedTimeSlots[dateStr];
    }
    // Return empty string if no booking or selection exists (before seat is clicked)
    return "";
  };

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      // Collect all bookings from all sources
      const allBookings: Array<{
        date: string;
        seatId: string;
        timeSlot: TimeSlotType;
      }> = [];
      const processedDates = new Set<string>();

      // 1. Collect from dropdown selections
      Object.entries(selectedSeatsFromDropdown).forEach(([date, seatId]) => {
        const timeSlot = selectedTimeSlots[date];
        if (seatId && timeSlot) {
          allBookings.push({ date, seatId, timeSlot });
          processedDates.add(date);
        }
      });

      // 2. Collect from clicked seat selections
      Object.entries(selectedSeatsFromClick).forEach(([date, seatId]) => {
        const timeSlot = selectedTimeSlots[date];
        if (seatId && timeSlot && !processedDates.has(date)) {
          allBookings.push({ date, seatId, timeSlot });
          processedDates.add(date);
        }
      });

      // 3. Add current seat selection if it exists and not already processed
      if (
        selectedSeat &&
        selectedDate &&
        selectedTimeSlots[selectedDate] &&
        !processedDates.has(selectedDate)
      ) {
        allBookings.push({
          date: selectedDate,
          seatId: selectedSeat,
          timeSlot: selectedTimeSlots[selectedDate],
        });
      }

      if (onSubmit && allBookings.length > 0) {
        onSubmit(allBookings);

        // Clear dropdown selections after submission
        clearAllDropdownSelections();
        setPendingBookings({});

        // Notify parent about clearing dropdown selections
        if (onDropdownSelectionChange) {
          onDropdownSelectionChange({});
        }

        // DON'T clear time slots for newly booked dates - they will become actual bookings
        // The time slots will be preserved and updated when userBookings refreshes
        // Note: selectedSeatsFromClick is managed by the parent component
      }
      setShowSuccess(true);
    },
    [
      selectedSeatsFromDropdown,
      selectedSeatsFromClick,
      selectedTimeSlots,
      selectedSeat,
      selectedDate,
      onSubmit,
      onDropdownSelectionChange,
      clearAllDropdownSelections,
    ]
  );

  const handleClear = () => {
    if (selectedDate) {
      // Clear the time slot for the current date
      setSelectedTimeSlots((prev) => {
        const newState = { ...prev };
        delete newState[selectedDate];
        return newState;
      });

      // Clear pending booking for current date
      setPendingBookings((prev) => {
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
  const calculateTotalBookings = useCallback(() => {
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
    if (
      selectedSeat &&
      selectedDate &&
      selectedTimeSlots[selectedDate] &&
      !processedDates.has(selectedDate)
    ) {
      count++;
    }

    return count;
  }, [
    selectedSeatsFromDropdown,
    selectedSeatsFromClick,
    selectedTimeSlots,
    selectedSeat,
    selectedDate,
  ]);

  const totalBookings = useMemo(
    () => calculateTotalBookings(),
    [calculateTotalBookings]
  );
  const isFormValid = totalBookings > 0;
  // Memoize date calculation to avoid recalculating on every render
  const availableDates = useMemo(() => {
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
    return dates;
  }, []);

  return (
    <>
      <Box>
        <Typography
          variant="h5"
          component="h2"
          mb={3}
          textAlign="center"
          textTransform={"uppercase"}
          fontWeight={"600"}
        >
          Booking List
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
          {availableDates.map((date, idx) => {
            const dateStr = date.toISOString().split("T")[0];
            const isSelected = selectedDate === dateStr;
            const booking = userBookings.find((b) => b.date === dateStr);

            // Check if date is in the past
            const now = new Date();
            const today = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            );
            const currentHour = now.getHours();
            const currentDay = today.getDay();
            const isAfterFridayDeadline = currentDay === 5 && currentHour >= 15;
            const isPastDate = !isAfterFridayDeadline && date < today;
            return (
              <Box
                key={idx}
                sx={{
                  display: "grid",
                  alignItems: "center",
                  gap: 1,
                  gridTemplateColumns: "1fr 1fr 1fr 0.1fr",
                }}
              >
                <Chip
                  label={date.toLocaleDateString()}
                  color={isPastDate ? "default" : "primary"}
                  variant="outlined"
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: isSelected ? "bold" : "normal",
                    boxShadow: "none",
                    opacity: isPastDate ? 0.5 : 1,
                    cursor: isPastDate ? "not-allowed" : "pointer",
                    borderRadius: 2,
                    width: "100%",
                    border: isSelected
                      ? "1px solid #FF5208"
                      : "1px solid #CDCFD0",
                    color: "#000",
                  }}
                  onClick={
                    onDateClick && !isPastDate
                      ? () => onDateClick(dateStr)
                      : undefined
                  }
                />
                <FormControl size="small" sx={{ width: "100%" }}>
                  <Select
                    value={getTimeSlotForDate(dateStr)}
                    onChange={(e) => {
                      const value = e.target.value as string;
                      if (value === "") {
                        // Handle empty selection by clearing the time slot
                        setSelectedTimeSlots((prev) => {
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
                    sx={{
                      height: 32,
                      width: "100%",
                      borderRadius: 2,
                      color: "#000",
                    }}
                    disabled={!!booking || isPastDate}
                  >
                    {/* Empty option for no selection */}
                    <MenuItem value="">
                      <em>Select time slot</em>
                    </MenuItem>
                    {(() => {
                      // Only filter time slots for the selected seat AND selected date
                      // For other dates, show all options unless there's an existing booking
                      let availableSlots: TimeSlotType[] = [
                        "AM",
                        "PM",
                        "FULL_DAY",
                      ];

                      if (selectedSeat && selectedDate === dateStr) {
                        // Only apply filtering for the currently selected date
                        availableSlots = getAvailableTimeSlots(
                          selectedSeat,
                          dateStr
                        );
                      }

                      return availableSlots.map((timeSlot) => (
                        <MenuItem key={timeSlot} value={timeSlot}>
                          {timeSlot === "AM"
                            ? "Morning (AM)"
                            : timeSlot === "PM"
                            ? "Afternoon (PM)"
                            : "Full Day"}
                        </MenuItem>
                      ));
                    })()}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ width: "100%" }}>
                  <Select
                    key={`seat-${dateStr}`}
                    value={getCurrentSeat(dateStr)}
                    onChange={(e) =>
                      handleSeatSelectionFromDropdown(
                        dateStr,
                        e.target.value as string
                      )
                    }
                    displayEmpty
                    variant="outlined"
                    sx={{
                      height: 32,
                      width: "100%",
                      borderRadius: 2,
                      color: "#000",
                    }}
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

                      const groupedSeats = getGroupedAvailableSeats(
                        dateStr,
                        selectedTimeSlots[dateStr]
                      );

                      return Object.keys(groupedSeats)
                        .sort() // Sort table letters A, B, C, etc.
                        .map((tableLetter) => [
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
                            .map((seatId) => (
                              <MenuItem key={seatId} value={seatId}>
                                Seat {seatId.slice(1)} ({seatId})
                              </MenuItem>
                            )),
                        ])
                        .flat();
                    })()}
                  </Select>
                </FormControl>
                <IconButton
                  sx={{ color: "#C84040" }}
                  size="small"
                  title="Remove this date"
                  onClick={async () => {
                    if (!currentUser) return;
                    if (!booking) return;
                    try {
                      const allUserBookings =
                        await bookingService.getUserBookings(currentUser);
                      const fullBooking = allUserBookings.find(
                        (b) =>
                          b.date === dateStr &&
                          b.seatId === booking.seatId &&
                          b.status === "ACTIVE"
                      );
                      if (!fullBooking) return;
                      await bookingService.cancelBooking(
                        fullBooking.id,
                        currentUser
                      );
                      // Reset the time slot for this date to default
                      setSelectedTimeSlots((prev) => {
                        const newState = { ...prev };
                        delete newState[dateStr];
                        return newState;
                      });
                      if (onBookingChange) await onBookingChange();
                      handleClear(); // Clear the time slot selection
                    } catch (err) {
                      console.error("Failed to cancel booking:", err);
                    }
                  }}
                  disabled={!booking || isPastDate}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            );
          })}
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
            {totalBookings === 0
              ? "Select a Seat"
              : totalBookings === 1
              ? "Reserve Seat"
              : `Reserve ${totalBookings} Seats`}
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={() => setShowSuccess(false)}
      >
        <Alert severity="success" onClose={() => setShowSuccess(false)}>
          {totalBookings === 1
            ? "Reservation submitted successfully!"
            : `${totalBookings} reservations submitted successfully!`}
        </Alert>
      </Snackbar>
    </>
  );
}
