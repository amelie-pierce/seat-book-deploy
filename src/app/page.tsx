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
import { vercelDataService } from "../services/vercelDataService";
import { BookingRecord } from "../utils/bookingStorage";
import { useEffect } from "react";

const userAvatar = {
  1234: 'https://i.pravatar.cc/150?img=1',
  "U001": 'https://i.pravatar.cc/150?img=2',
  "U002": 'https://i.pravatar.cc/150?img=3',
  "U003": 'https://i.pravatar.cc/150?img=4',
  "U004": 'https://i.pravatar.cc/150?img=5',
}

export default function Home() {
  // Helper function to convert local date to YYYY-MM-DD string without timezone issues
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
  const [modalAnchorPosition, setModalAnchorPosition] = useState<{ top: number; left: number } | null>(null);

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
    const initializeApp = async () => {
      try {
        setIsLoadingBookings(true);

        // Initialize the CSV database
        await bookingService.initializeDatabase();

        // Load all bookings for today
        const allBookings = await bookingService.getBookingsForDate(todayDate);

        // Transform bookings to the format expected by Table component
        const bookedSeatsData = allBookings.map((booking) => ({
          seatId: booking.seatId,
          userId: booking.userId,
          timeSlot: booking.timeSlot,
        }));
        setAllBookingsForDate(bookedSeatsData);
      } catch (error) {
        console.error("❌ Error initializing app:", error);

        // Check if this is a CSV loading error that should redirect to 404
        if (
          error instanceof Error &&
          error.message.includes("Required CSV files could not be loaded")
        ) {
          // The CSV service will handle the redirect
          return;
        }

        setBookingError("Failed to load booking data");
      } finally {
        setIsLoadingBookings(false);
      }
    };

    initializeApp();
  }, [todayDate]);

  // Load user-specific data when user logs in (not when date changes)
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        try {
          console.log(`👤 Loading data for user: ${currentUser}`);

          // Don't refresh if we just initialized - data is already fresh
          // Only refresh if this is a re-login or explicit user change
          const cacheInfo = bookingService.getCacheInfo();
          if (!cacheInfo.isInitialized) {
            await bookingService.refreshFromCsv();
          }

          // Fetch user email
          try {
            const userInfo = await vercelDataService.getUserById(currentUser);
            if (userInfo && userInfo.email) {
              setUserEmail(userInfo.email);
            }
          } catch (error) {
            console.error("Error fetching user email:", error);
            setUserEmail(""); // Fallback to empty string
          }

          const userData = await bookingService.loadUserData(currentUser);
          setUserBookings(userData.userBookings);

          // Create a map of bookings by date
          const bookings = userData.userBookings.reduce((acc, booking) => {
            acc[booking.date] = {
              seatId: booking.seatId,
              timeSlot: booking.timeSlot,
            };
            return acc;
          }, {} as { [key: string]: { seatId: string; timeSlot: "AM" | "PM" | "FULL_DAY" } });
          setBookingsMap(bookings);

          // Note: Date-specific data loading is handled by handleDateClick and other date change events
          // We don't need to load it here during user login to avoid redundant API calls
        } catch (error) {
          console.error("❌ Error loading user data:", error);
        }
      } else {
        // Clear user-specific data when user logs out
        setUserBookings([]);
        setSelectedSeat(null);
        setUserEmail(""); // Clear email when user logs out
      }
    };

    loadUserData();
  }, [currentUser]); // Removed selectedDate to prevent unnecessary refreshes

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

  const handleSeatClick = (seatId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
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
        (booking) => booking.timeSlot === "FULL_DAY" && booking.userId !== currentUser
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

      if (amBooking && pmBooking &&
        amBooking.userId !== currentUser &&
        pmBooking.userId !== currentUser &&
        amBooking.userId !== pmBooking.userId) {
        // Both AM and PM booked by different users (not current user) - not available
        return false;
      }

      // If only AM or only PM is booked, or both are booked by same user, seat is still available
      return true;
    };

    if (isSeatClickable()) {
      // Open the seat selection modal for both mobile and desktop
      if (selectedDate) {
        console.log("selectedDate", selectedDate)
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
        // Use the booking service to cancel the booking
        await bookingService.cancelBooking(bookingToRemove.id, currentUser);

        // Refresh user bookings
        const userData = await bookingService.loadUserData(currentUser);
        setUserBookings(userData.userBookings);

        // Refresh the current date view
        if (selectedDate) {
          await handleDateClick(selectedDate);
        }
      }

      handleMobileSeatModalClose();
    } catch (error) {
      console.error("Failed to remove reservation:", error);
      setBookingError("Failed to remove reservation. Please try again.");
    }
  };

  const handleLogout = async () => {
    // Clear all state before logout
    setSelectedSeat(null);
    setSelectedSeatsFromClick({});
    setSelectedSeatsFromDropdown({});
    setUserBookings([]);
    setBookingsMap({});

    clearUserSession();

    // Refresh booking data to show clean state for next user
    try {
      await bookingService.refreshFromCsv();
      // Reload bookings for current date
      if (selectedDate) {
        await handleDateClick(selectedDate);
      }
    } catch (error) {
      console.error("Error refreshing data after logout:", error);
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
    if (bookings.length > 0) {
      try {
        setBookingError(null);

        const result = await bookingService.createMultipleBookings(
          currentUser!,
          bookings
        );

        if (result.success) {
          console.log(
            `✅ ${result.bookings?.length || 0} bookings created successfully`
          );

          if (result.failedBookings && result.failedBookings.length > 0) {
            // Check if any failures were due to conflicts
            const hasConflicts = result.failedBookings.some((msg) =>
              msg.includes("Already booked")
            );
            const errorMessage = hasConflicts
              ? `⚠️ Some seats were taken by other users: ${result.error}`
              : `Some bookings failed: ${result.error}`;
            setBookingError(errorMessage);
          }

          // Reload user bookings FIRST
          const userData = await bookingService.loadUserData(currentUser!);
          setUserBookings(userData.userBookings);

          // Refresh the current date view to update allBookingsForDate
          if (selectedDate) {
            await handleDateClick(selectedDate);
          }

          // Clear selections - the ReservationForm should now have updated userBookings
          setSelectedSeat(null);
          setSelectedSeatsFromClick({});
          setSelectedSeatsFromDropdown({});

          console.log("✅ Bookings created and state refreshed");
        } else {
          // Check if error indicates conflicts and refresh data
          const isConflictError =
            result.error?.includes("already taken") ||
            result.error?.includes("Already booked");
          if (isConflictError) {
            // Force refresh to show updated seat availability
            await bookingService.refreshAfterConflict();
            if (selectedDate) {
              await handleDateClick(selectedDate);
            }
            setBookingError(
              `${result.error} Data refreshed - please try again with available seats.`
            );
          } else {
            setBookingError(result.error || "Failed to create bookings");
          }
        }
      } catch (error) {
        console.error("❌ Error creating bookings:", error);
        setBookingError("Failed to create bookings. Please try again.");
      }
    }
  };

  const handleDropdownSelectionChange = (selections: {
    [date: string]: string;
  }) => {
    console.log(`📋 Dropdown selections received:`, selections);

    setSelectedSeatsFromDropdown(selections);
    // Sync click selections with dropdown selections to keep them in sync
    setSelectedSeatsFromClick(selections);

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
            sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 500 }}
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
            <Box sx={{ fontSize: '0.9rem' }}>
              <p>{currentUser}</p>
              <Typography sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                {userEmail || 'No email available'}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleLogout}
          >
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
            width: { xs: '100%', md: 'auto' },
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
              whiteSpace: 'nowrap',
              "&.Mui-selected": {
                color: '#FFFFFF',
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
              whiteSpace: 'nowrap',
              "&.Mui-selected": {
                color: '#FFFFFF',
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
                const userData = await bookingService.loadUserData(
                  currentUser!
                );
                setUserBookings(userData.userBookings);
                // Refresh available seats for the selected date
                if (selectedDate) {
                  const reservedSeats = allBookings.map((b) => b.seatId);
                  const seats = generateAllSeats(SEATING_CONFIG).filter(
                    (seat) => !reservedSeats.includes(seat)
                  );
                  setAvailableSeatsForDate(seats);
                  // If the selected seat was just deleted, clear it
                  const stillBooked = userData.userBookings.find(
                    (b) => b.date === selectedDate && b.seatId === selectedSeat
                  );
                  if (!stillBooked) {
                    setSelectedSeat(null);
                  }
                }
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
              onToggleDrawer={() => { }}
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
        <Alert severity="error" onClose={() => setBookingError(null)}>
          {bookingError}
        </Alert>
      </Snackbar>
    </Container>
  );
}
