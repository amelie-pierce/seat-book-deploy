"use client";
import { useCallback, useState, useMemo } from "react";
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  IconButton,
  Avatar,
} from "@mui/material";
import {
  ExitToApp as LogoutIcon,
  Event as EventIcon,
  Chair as ChairIcon,
} from "@mui/icons-material";
import SeatingLayout from "../components/SeatingLayout";
import ReservationForm from "../components/ReservationForm";
import SeatModal from "../components/SeatModal";
import { useUserSession } from "../hooks/useUserSession";
import { SEATING_CONFIG, generateAllSeats } from "../config/seatingConfig";
import { bookingService } from "../services/bookingService";
import { BookingRecord } from "../utils/bookingStorage";
import { useEffect } from "react";
import { supabase } from "../../utils/supabase";

const userAvatar = {
  1234: "https://i.pravatar.cc/150?img=1",
  U001: "https://i.pravatar.cc/150?img=2",
  U002: "https://i.pravatar.cc/150?img=3",
  U003: "https://i.pravatar.cc/150?img=4",
  U004: "https://i.pravatar.cc/150?img=5",
};

export default function Home() {
  // Helper function to convert local date to YYYY-MM-DD string without timezone issues
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getReservationsData = async () => {
    const { data, error } = await supabase.from("reservations").select("*");
    console.log('data', data );
    // Optionally handle error
    if (error) {
      console.error('Supabase error:', error);
    }
  };

  const getUsersData = async () => {
    const { data, error } = await supabase.from("users").select("*");
    console.log('data', data );
    // Optionally handle error
    if (error) {
      console.error('Supabase error:', error);
    }
  };

  useEffect(() => {
    getReservationsData();
    getUsersData();
  }, []);

  const todayDate = formatLocalDate(new Date());

  // Function to get the first available (non-disabled) date
  const getFirstAvailableDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentHour = now.getHours();
    const currentDay = today.getDay();
    const dates: Date[] = [];

    // Check if it's after 3 PM on Friday
    const isAfterFridayDeadline = currentDay === 5 && currentHour >= 15;

    if (isAfterFridayDeadline) {
      // Show next week's working days (Monday to Friday)
      const nextMonday = new Date(today);
      const daysUntilNextMonday = (8 - currentDay) % 7;
      nextMonday.setDate(today.getDate() + daysUntilNextMonday);

      for (let i = 0; i < 5; i++) {
        const date = new Date(nextMonday);
        date.setDate(nextMonday.getDate() + i);
        dates.push(date);
      }
    } else {
      // Show current week's working days (Monday to Friday)
      const monday = new Date(today);
      const daysFromMonday = (currentDay + 6) % 7;
      monday.setDate(today.getDate() - daysFromMonday);

      for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
      }
    }

    // Find first non-disabled date
    for (const date of dates) {
      const isPastDate = !isAfterFridayDeadline && date < today;
      if (!isPastDate) {
        return formatLocalDate(date);
      }
    }

    // Fallback to today if no valid date found
    return todayDate;
  };

  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [selectedSeatsFromClick, setSelectedSeatsFromClick] = useState<{
    [date: string]: string;
  }>({});
  const [selectedSeatsFromDropdown, setSelectedSeatsFromDropdown] = useState<{
    [date: string]: string;
  }>({});
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingErrorSeverity, setBookingErrorSeverity] = useState<"success" | "error">("error");
  const [userBookings, setUserBookings] = useState<BookingRecord[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [bookingsMap, setBookingsMap] = useState<{
    [date: string]: { seatId: string; timeSlot: "AM" | "PM" | "FULL_DAY" };
  }>({});
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    getFirstAvailableDate()
  );
  const [availableSeatsForDate, setAvailableSeatsForDate] = useState<string[]>(
    []
  );
  const [allBookingsForDate, setAllBookingsForDate] = useState<
    Array<{
      seatId: string;
      userId: string;
      timeSlot: "AM" | "PM" | "FULL_DAY";
    }>
  >([]);

  // Desktop tab state
  const [desktopTabValue, setDesktopTabValue] = useState(0);

  // Mobile seat modal state
  const [mobileSeatModalOpen, setMobileSeatModalOpen] = useState(false);
  const [mobileSeatModalSeatId, setMobileSeatModalSeatId] =
    useState<string>("");
  const [mobileSeatModalDate, setMobileSeatModalDate] = useState<string>("");
  const [modalAnchorPosition, setModalAnchorPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Memoize filtered userBookings to prevent infinite loops in ReservationForm
  const activeUserBookings = useMemo(() => {
    return userBookings
      .filter((b) => b.status === "ACTIVE")
      .map((b) => ({
        date: b.date,
        seatId: b.seatId,
        timeSlot: b.timeSlot,
      }));
  }, [userBookings]);

  const { currentUser, clearUserSession, isLoading } = useUserSession();

  // Redirect to auth if user becomes null (logged out)
  useEffect(() => {
    if (!isLoading && !currentUser) {
      window.location.href = "/auth";
    }
  }, [currentUser, isLoading]);

  // Initialize database and load user data when app opens
  useEffect(() => {
    const loadBookingsForToday = async () => {
      try {
        setIsLoadingBookings(true);
        const allBookings = await bookingService.getBookingsForDate(todayDate);
        const bookedSeatsData = allBookings.map((booking) => ({
          seatId: booking.seatId,
          userId: booking.userId,
          timeSlot: booking.timeSlot,
        }));
        setAllBookingsForDate(bookedSeatsData);
      } catch (error) {
        console.error("❌ Error loading bookings:", error);
        setBookingError("Failed to load booking data");
      } finally {
        setIsLoadingBookings(false);
      }
    };
    loadBookingsForToday();
  }, [todayDate]);

  // Load user-specific data when user logs in (not when date changes)
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        try {
          console.log(`👤 Loading data for user: ${currentUser}`);
          // Fetch user bookings from Supabase
          const bookings = await bookingService.getUserBookings(currentUser);
          setUserBookings(bookings);
          // Create a map of bookings by date
          const bookingsMapObj: { [key: string]: { seatId: string; timeSlot: "AM" | "PM" | "FULL_DAY" } } = {};
          bookings.forEach((booking) => {
            bookingsMapObj[booking.date] = {
              seatId: booking.seatId,
              timeSlot: booking.timeSlot,
            };
          });
          setBookingsMap(bookingsMapObj);
        } catch (error) {
          console.error("❌ Error loading user data:", error);
        }
      } else {
        setUserBookings([]);
        setSelectedSeat(null);
        setUserEmail("");
      }
    };
    loadUserData();
  }, [currentUser]);

  // Handle initial date load and pending seat selection
  useEffect(() => {
    const handleInitialLoad = async () => {
      // Load initial date
      if (selectedDate) {
        await handleDateClick(selectedDate);
      }

      // Check for pending seat selection after authentication
      if (currentUser) {
        const pendingSeatId = localStorage.getItem("pendingSeatId");
        const pendingDate = localStorage.getItem("pendingDate");

        if (pendingSeatId && pendingDate) {
          // Clear from localStorage
          localStorage.removeItem("pendingSeatId");
          localStorage.removeItem("pendingDate");

          // Set the pending selection
          setSelectedDate(pendingDate);
          await handleDateClick(pendingDate);
          setSelectedSeatsFromClick((prev) => ({
            ...prev,
            [pendingDate]: pendingSeatId,
          }));
          setSelectedSeat(pendingSeatId);
        }
      }
    };

    handleInitialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleSeatClick = (
    seatId: string,
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    // Check seat availability using the new logic
    const isSeatClickable = () => {
      // Find all bookings for this seat on the selected date
      const seatBookings = allBookingsForDate.filter(
        (b) => b.seatId === seatId
      );

      // If no bookings, seat is available
      if (seatBookings.length === 0) {
        return true;
      }

      // Check if current user has booked this seat
      const currentUserBooking = seatBookings.find(
        (booking) => booking.userId === currentUser
      );

      // If current user has booked this seat, allow clicking to manage it
      if (currentUserBooking) {
        return true;
      }

      // Check for FULL_DAY bookings by other users
      const hasFullDayBooking = seatBookings.some(
        (booking) =>
          booking.timeSlot === "FULL_DAY" && booking.userId !== currentUser
      );
      if (hasFullDayBooking) {
        return false;
      }

      // Check if both AM and PM are booked by different users (not current user)
      const amBooking = seatBookings.find(
        (booking) => booking.timeSlot === "AM"
      );
      const pmBooking = seatBookings.find(
        (booking) => booking.timeSlot === "PM"
      );

      if (
        amBooking &&
        pmBooking &&
        amBooking.userId !== currentUser &&
        pmBooking.userId !== currentUser &&
        amBooking.userId !== pmBooking.userId
      ) {
        // Both AM and PM booked by different users (not current user) - not available
        return false;
      }

      // If only AM or only PM is booked, or both are booked by same user, seat is still available
      return true;
    };

    if (isSeatClickable()) {
      // Open the seat selection modal for both mobile and desktop
      if (selectedDate) {
        console.log("selectedDate", selectedDate);
        // Calculate position for desktop modal
        if (event) {
          const buttonRect = event.currentTarget.getBoundingClientRect();
          setModalAnchorPosition({
            top: buttonRect.top,
            left: buttonRect.left + buttonRect.width / 2,
          });
        } else {
          setModalAnchorPosition(null);
        }

        setMobileSeatModalSeatId(seatId);
        setMobileSeatModalDate(selectedDate);
        setMobileSeatModalOpen(true);
        return;
      }

      // If authenticated, proceed with seat selection
      if (selectedDate) {
        const currentClickedSeat = selectedSeatsFromClick[selectedDate];
        const newSeatId = seatId === currentClickedSeat ? null : seatId;

        console.log(
          `🔄 Seat button clicked: ${seatId}, date: ${selectedDate}, newSeatId: ${newSeatId}`
        );

        // Update per-date seat selection
        setSelectedSeatsFromClick((prev) => ({
          ...prev,
          [selectedDate]: newSeatId || "",
        }));

        // Sync dropdown selection with clicked seat
        const newDropdownSelections = {
          ...selectedSeatsFromDropdown,
          [selectedDate]: newSeatId || "",
        };

        console.log(`🔄 Updating dropdown selections:`, newDropdownSelections);
        setSelectedSeatsFromDropdown(newDropdownSelections);

        // Notify ReservationForm about the dropdown change
        handleDropdownSelectionChange(newDropdownSelections);

        // Also update the main selectedSeat for current date compatibility
        setSelectedSeat(newSeatId);

        console.log(`✅ Seat selection complete. newSeatId: ${newSeatId}`);
      }
    }
  };

  const handleMobileSeatModalClose = () => {
    setMobileSeatModalOpen(false);
    setMobileSeatModalSeatId("");
    setMobileSeatModalDate("");
  };

  const handleMobileSeatModalSubmit = async (
    seatId: string,
    timeSlot: "AM" | "PM" | "FULL_DAY"
  ) => {
    if (!mobileSeatModalDate) return;

    try {
      const bookings = [
        {
          date: mobileSeatModalDate,
          seatId,
          timeSlot,
        },
      ];

      await handleReservation(bookings);
      handleMobileSeatModalClose();
    } catch (error) {
      console.error("Failed to create mobile reservation:", error);
    }
  };

  const handleMobileSeatModalRemove = async (
    seatId: string,
    timeSlot: "AM" | "PM" | "FULL_DAY"
  ) => {
    if (!mobileSeatModalDate || !currentUser) return;
    try {
      // Find the booking to remove
      const bookingToRemove = userBookings.find(
        (booking) =>
          booking.seatId === seatId &&
          booking.date === mobileSeatModalDate &&
          booking.timeSlot === timeSlot &&
          booking.status === "ACTIVE"
      );
      if (bookingToRemove) {
        const result = await bookingService.cancelBooking(bookingToRemove.id);
        if (result.success) {
          setBookingError("Reservation deleted successfully");
          setBookingErrorSeverity("success");
          // Refresh user bookings
          const bookings = await bookingService.getUserBookings(currentUser);
          setUserBookings(bookings);
          // Refresh the current date view
          if (selectedDate) {
            await handleDateClick(selectedDate);
          }
        } else {
          setBookingError(result.error || "Failed to remove reservation. Please try again.");
          setBookingErrorSeverity("error");
        }
      }
      handleMobileSeatModalClose();
    } catch (error) {
      console.error("Failed to remove reservation:", error);
      setBookingError("Failed to remove reservation. Please try again.");
    }
  };

  const handleLogout = async () => {
    setSelectedSeat(null);
    setSelectedSeatsFromClick({});
    setSelectedSeatsFromDropdown({});
    setUserBookings([]);
    setBookingsMap({});
    clearUserSession();
    // Optionally reload bookings for current date
    if (selectedDate) {
      await handleDateClick(selectedDate);
    }
  };

  const handleDesktopTabChange = (
    event: React.SyntheticEvent,
    newValue: number
  ) => {
    setDesktopTabValue(newValue);
  };

  const handleReservation = async (
    bookings: Array<{
      date: string;
      seatId: string;
      timeSlot: "AM" | "PM" | "FULL_DAY";
    }>
  ) => {
    if (bookings.length > 0 && currentUser) {
      try {
        setBookingError(null);
        // Pass all bookings to bookingService for multi-day support
        const result = await bookingService.createBooking(currentUser, bookings);
        if (result.success) {
          setBookingError("Reservation(s) submitted successfully");
          setBookingErrorSeverity("success");
          // Reload user bookings
          const userBookings = await bookingService.getUserBookings(currentUser);
          setUserBookings(userBookings);
          // Refresh the current date view
          if (selectedDate) {
            await handleDateClick(selectedDate);
          }
          setSelectedSeat(null);
          setSelectedSeatsFromClick({});
          setSelectedSeatsFromDropdown({});
        } else {
          setBookingError(result.error || "Failed to create booking");
          setBookingErrorSeverity("error");
        }
      } catch (error) {
        console.error("❌ Error creating booking:", error);
        setBookingError("Failed to create booking. Please try again.");
      }
    }
  };

  const handleDropdownSelectionChange = (selections: {
    [date: string]: string;
  }) => {
    console.log(`📋 Dropdown selections received:`, selections);

    // Merge with existing selections, removing empty values
    setSelectedSeatsFromDropdown((prev) => {
      console.log(`📋 Previous dropdown state:`, prev);
      const newState = { ...prev };
      Object.entries(selections).forEach(([date, seatId]) => {
        console.log(`📋 Processing date ${date} with seatId: "${seatId}"`);
        if (seatId === "" || !seatId) {
          // Remove the property entirely when clearing
          console.log(`📋 Deleting property for date ${date}`);
          delete newState[date];
        } else {
          console.log(`📋 Setting ${date} = ${seatId}`);
          newState[date] = seatId;
        }
      });
      console.log(`📋 New dropdown state:`, newState);
      return newState;
    });
    // Sync click selections with dropdown selections to keep them in sync
    setSelectedSeatsFromClick((prev) => {
      const newState = { ...prev };
      Object.entries(selections).forEach(([date, seatId]) => {
        if (seatId === "" || !seatId) {
          // Remove the property entirely when clearing
          delete newState[date];
        } else {
          newState[date] = seatId;
        }
      });
      return newState;
    });

    // Update main selectedSeat for current date to keep seating layout in sync
    if (selectedDate) {
      const currentDateSelection = selections[selectedDate];
      console.log(
        `📋 Setting selectedSeat for date ${selectedDate}: ${currentDateSelection}`
      );
      setSelectedSeat(currentDateSelection || null);
    }
  };

  const handleClearBooking = () => {
    setSelectedSeat(null);
    // Also clear the per-date click selection for current date
    if (selectedDate) {
      setSelectedSeatsFromClick((prev) => ({
        ...prev,
        [selectedDate]: "",
      }));
    }
  };

  const handleDateClick = useCallback(
    async (dateStr: string) => {
      setSelectedDate(dateStr);
      // Restore seat selection for this date if it exists (check both click and dropdown selections)
      const clickedSeatForDate = selectedSeatsFromClick[dateStr];
      const dropdownSeatForDate = selectedSeatsFromDropdown[dateStr];
      // Prioritize dropdown selection as it's more recent if different
      const seatForDate = dropdownSeatForDate || clickedSeatForDate;
      setSelectedSeat(seatForDate || null);

      // Fetch reserved seats and all bookings for the selected date
      try {
        const reserved = await bookingService.getReservedSeats(dateStr);
        const allBookings = await bookingService.getBookingsForDate(dateStr);

        // Generate available seats for that date
        const seats = generateAllSeats(SEATING_CONFIG).filter(
          (seat) => !reserved.includes(seat)
        );
        setAvailableSeatsForDate(seats);

        // Transform bookings to the format expected by Table component
        const bookedSeatsData = allBookings.map((booking) => ({
          seatId: booking.seatId,
          userId: booking.userId,
          timeSlot: booking.timeSlot,
        }));
        setAllBookingsForDate(bookedSeatsData);
      } catch (err) {
        console.error("Error loading seats for date:", err);
        setAvailableSeatsForDate([]);
        setAllBookingsForDate([]);
        setBookingError("Failed to load seats for selected date");
      }
    },
    [selectedSeatsFromClick, selectedSeatsFromDropdown]
  );

  // Show loading state while checking authentication or loading bookings
  if (isLoading || isLoadingBookings) {
    return (
      <Container
        maxWidth="xl"
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box textAlign="center">
          <CircularProgress size={40} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* User Session Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
          px: 2,
          py: 1,
          backgroundColor: "#fff",
          borderBottom: "1px solid #CDCFD0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h5" component="h3" color="#000000">
            Flexi Seat
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontWeight: 500,
            }}
          >
            <Avatar
              src={userAvatar[currentUser as keyof typeof userAvatar]}
              sx={{
                width: 35,
                height: 35,
              }}
            >
              {currentUser?.charAt(0)}
            </Avatar>
            <Box sx={{ fontSize: "0.9rem" }}>
              <p>{currentUser}</p>
              <Typography sx={{ fontStyle: "italic", fontSize: "0.75rem" }}>
                {userEmail || "No email available"}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Tabs
          value={desktopTabValue}
          onChange={handleDesktopTabChange}
          aria-label="desktop navigation tabs"
          sx={{
            width: { xs: "100%", md: "auto" },
            "& .MuiTabs-indicator": {
              display: "none",
            },
            pb: 2,
            px: 2,
          }}
          variant="fullWidth"
        >
          <Tab
            icon={<ChairIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="List View"
            id="desktop-tab-0"
            aria-controls="desktop-tabpanel-0"
            sx={{
              minHeight: 40,
              textTransform: "none",
              fontSize: "1rem",
              color: "#6B7280",
              backgroundColor: desktopTabValue === 0 ? "#FF5208" : "#D1D5DB",
              borderRadius: "8px 0 0 8px",
              px: 3,
              py: 1,
              whiteSpace: "nowrap",
              "&.Mui-selected": {
                color: "#FFFFFF",
              },
              "& .MuiTab-iconWrapper": {
                marginRight: 1,
              },
            }}
          />
          <Tab
            icon={<EventIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="Map View"
            id="desktop-tab-1"
            aria-controls="desktop-tabpanel-1"
            sx={{
              minHeight: 40,
              textTransform: "none",
              fontSize: "1rem",
              color: "#6B7280",
              backgroundColor: desktopTabValue === 1 ? "#FF5208" : "#D1D5DB",
              borderRadius: "0 8px 8px 0",
              px: 3,
              py: 1,
              whiteSpace: "nowrap",
              "&.Mui-selected": {
                color: "#FFFFFF",
              },
              "& .MuiTab-iconWrapper": {
                marginRight: 1,
              },
            }}
          />
        </Tabs>
        <Box
          role="tabpanel"
          hidden={desktopTabValue !== 0}
          id="desktop-tabpanel-0"
          aria-labelledby="desktop-tab-0"
          sx={{
            flex: 1,
            overflow: "auto",
            p: 3,
            display: desktopTabValue === 0 ? "flex" : "none",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {desktopTabValue === 0 && (
            <ReservationForm
              selectedDate={selectedDate || undefined}
              onDateClick={handleDateClick}
              selectedSeat={selectedSeat || undefined}
              selectedSeatsFromClick={selectedSeatsFromClick}
              onSubmit={handleReservation}
              onClear={handleClearBooking}
              onDropdownSelectionChange={handleDropdownSelectionChange}
              currentUser={currentUser || undefined}
              userBookings={activeUserBookings}
              allBookingsForDate={allBookingsForDate}
              onBookingChange={async () => {
                // Refresh all bookings for the selected date
                const dateToRefresh = selectedDate || todayDate;
                const allBookings = await bookingService.getBookingsForDate(
                  dateToRefresh
                );

                // Transform bookings to the format expected by Table component
                const bookedSeatsData = allBookings.map((booking) => ({
                  seatId: booking.seatId,
                  userId: booking.userId,
                  timeSlot: booking.timeSlot,
                }));
                setAllBookingsForDate(bookedSeatsData);

                // Refresh user bookings
                const userBookingsData = await bookingService.getUserBookings(currentUser!);
                setUserBookings(userBookingsData);
                // Refresh available seats for the selected date
                if (selectedDate) {
                  const reservedSeats = allBookings.map((b) => b.seatId);
                  const seats = generateAllSeats(SEATING_CONFIG).filter(
                    (seat) => !reservedSeats.includes(seat)
                  );
                  setAvailableSeatsForDate(seats);
                  // If the selected seat was just deleted, clear it
                  const stillBooked = userBookingsData.find(
                    (b) => b.date === selectedDate && b.seatId === selectedSeat
                  );
                  if (!stillBooked) {
                    setSelectedSeat(null);
                  }
                }
              }}
              onShowToast={(message, severity = "success") => {
                setBookingError(message);
                setBookingErrorSeverity(severity);
              }}
            />
          )}
        </Box>

        <Box
          role="tabpanel"
          hidden={desktopTabValue !== 1}
          id="desktop-tabpanel-1"
          aria-labelledby="desktop-tab-1"
          sx={{
            flex: 1,
            backgroundColor: "#f8f9fa",
            overflow: "hidden",
            display: desktopTabValue === 1 ? "block" : "none",
            width: "100%",
          }}
        >
          {desktopTabValue === 1 && (
            <SeatingLayout
              onSeatClick={handleSeatClick}
              availableSeats={availableSeatsForDate}
              selectedSeat={selectedSeat || undefined}
              selectedSeatsFromDropdown={selectedSeatsFromDropdown}
              seatingConfig={SEATING_CONFIG}
              selectedDate={selectedDate || undefined}
              onDateClick={handleDateClick}
              bookedSeats={allBookingsForDate}
              currentUser={currentUser || undefined}
              timeSlot={bookingsMap[selectedDate || ""]?.timeSlot}
              onToggleDrawer={() => {}}
            />
          )}
        </Box>
      </Box>

      <SeatModal
        open={mobileSeatModalOpen}
        onClose={handleMobileSeatModalClose}
        seatId={mobileSeatModalSeatId}
        selectedDate={mobileSeatModalDate}
        onSubmit={handleMobileSeatModalSubmit}
        onRemove={handleMobileSeatModalRemove}
        currentUser={currentUser || undefined}
        allBookingsForDate={allBookingsForDate}
        anchorPosition={modalAnchorPosition}
      />

      {/* Booking Error Snackbar */}
      <Snackbar
        open={!!bookingError}
        autoHideDuration={6000}
        onClose={() => setBookingError(null)}
      >
        <Alert severity={bookingErrorSeverity} onClose={() => setBookingError(null)}>
          {bookingError}
        </Alert>
      </Snackbar>
    </Container>
  );
}
