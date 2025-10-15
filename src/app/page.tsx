"use client";
import { useCallback, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
  Event as EventIcon,
  Chair as ChairIcon,
} from "@mui/icons-material";
import SeatingLayout from "../components/SeatingLayout";
import ReservationForm from "../components/ReservationForm";
import MobileSeatModal from "../components/MobileSeatModal";
import { useUserSession } from "../hooks/useUserSession";
import { SEATING_CONFIG, generateAllSeats } from "../config/seatingConfig";
import { bookingService } from "../services/bookingService";
import { BookingRecord } from "../utils/bookingStorage";
import { useEffect } from "react";

export default function Home() {
  const todayDate = new Date().toISOString().split("T")[0];

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
        return date.toISOString().split("T")[0];
      }
    }

    // Fallback to today if no valid date found
    return todayDate;
  };

  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [selectedSeatsFromClick, setSelectedSeatsFromClick] = useState<{ [date: string]: string }>({});
  const [selectedSeatsFromDropdown, setSelectedSeatsFromDropdown] = useState<{ [date: string]: string }>({});
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [userBookings, setUserBookings] = useState<BookingRecord[]>([]);
  const [bookingsMap, setBookingsMap] = useState<{ [date: string]: { seatId: string; timeSlot: 'AM' | 'PM' | 'FULL_DAY' } }>({});
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(getFirstAvailableDate());
  const [availableSeatsForDate, setAvailableSeatsForDate] = useState<string[]>(
    []
  );
  const [allBookingsForDate, setAllBookingsForDate] = useState<Array<{
    seatId: string;
    userId: string;
    timeSlot: 'AM' | 'PM' | 'FULL_DAY';
  }>>([]);

  // Mobile tab state
  const [mobileTabValue, setMobileTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Mobile seat modal state
  const [mobileSeatModalOpen, setMobileSeatModalOpen] = useState(false);
  const [mobileSeatModalSeatId, setMobileSeatModalSeatId] = useState<string>('');
  const [mobileSeatModalDate, setMobileSeatModalDate] = useState<string>('');

  const {
    currentUser,
    clearUserSession,
    isLoading,
  } = useUserSession();

  // Redirect to auth if user becomes null (logged out)
  useEffect(() => {
    if (!isLoading && !currentUser) {
      window.location.href = '/auth';
    }
  }, [currentUser, isLoading]);

  // Initialize database and load user data when app opens
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoadingBookings(true);
        console.log("🚀 App starting - initializing booking system...");

        // Initialize the CSV database
        await bookingService.initializeDatabase();

        // Load all bookings for today
        const allBookings = await bookingService.getBookingsForDate(todayDate);

        // Transform bookings to the format expected by Table component
        const bookedSeatsData = allBookings.map(booking => ({
          seatId: booking.seatId,
          userId: booking.userId,
          timeSlot: booking.timeSlot
        }));
        console.log(`📊 Setting bookedSeatsData for ${todayDate}:`, bookedSeatsData);
        setAllBookingsForDate(bookedSeatsData);

        console.log(`🎯 Loaded ${allBookings.length} bookings for today`);
      } catch (error) {
        console.error("❌ Error initializing app:", error);

        // Check if this is a CSV loading error that should redirect to 404
        if (error instanceof Error && error.message.includes('Required CSV files could not be loaded')) {
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
          } else {
            console.log('📊 Using existing initialized data for user login');
          }

          const userData = await bookingService.loadUserData(currentUser);
          setUserBookings(userData.userBookings);

          // Create a map of bookings by date
          const bookings = userData.userBookings.reduce((acc, booking) => {
            acc[booking.date] = {
              seatId: booking.seatId,
              timeSlot: booking.timeSlot
            };
            return acc;
          }, {} as { [key: string]: { seatId: string; timeSlot: 'AM' | 'PM' | 'FULL_DAY' } });
          setBookingsMap(bookings);

          // Note: Date-specific data loading is handled by handleDateClick and other date change events
          // We don't need to load it here during user login to avoid redundant API calls

          console.log(
            `📊 User ${currentUser} has ${userData.totalBookings} total bookings`
          );
          if (userData.todayBooking) {
            console.log(
              `📅 Today's booking: ${userData.todayBooking.seatId} (${userData.todayBooking.timeSlot})`
            );
          }
        } catch (error) {
          console.error("❌ Error loading user data:", error);
        }
      } else {
        // Clear user-specific data when user logs out
        setUserBookings([]);
        setSelectedSeat(null);
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
        const pendingSeatId = localStorage.getItem('pendingSeatId');
        const pendingDate = localStorage.getItem('pendingDate');
        
        if (pendingSeatId && pendingDate) {
          // Clear from localStorage
          localStorage.removeItem('pendingSeatId');
          localStorage.removeItem('pendingDate');
          
          // Set the pending selection
          setSelectedDate(pendingDate);
          await handleDateClick(pendingDate);
          setSelectedSeatsFromClick(prev => ({
            ...prev,
            [pendingDate]: pendingSeatId
          }));
          setSelectedSeat(pendingSeatId);
        }
      }
    };

    handleInitialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleSeatClick = (seatId: string) => {
    // Check seat availability using the new logic
    const isSeatClickable = () => {
      // Find all bookings for this seat on the selected date
      const seatBookings = allBookingsForDate.filter(b => b.seatId === seatId);

      // If no bookings, seat is available
      if (seatBookings.length === 0) {
        return true;
      }

      // Check for FULL_DAY bookings - if any exist, seat is not available
      const hasFullDayBooking = seatBookings.some(booking => booking.timeSlot === 'FULL_DAY');
      if (hasFullDayBooking) {
        return false;
      }

      // Check if both AM and PM are booked by different users
      const amBooking = seatBookings.find(booking => booking.timeSlot === 'AM');
      const pmBooking = seatBookings.find(booking => booking.timeSlot === 'PM');

      if (amBooking && pmBooking && amBooking.userId !== pmBooking.userId) {
        // Both AM and PM booked by different users - not available
        return false;
      }

      // If only AM or only PM is booked, or both are booked by same user, seat is still available
      return true;
    };

    if (isSeatClickable()) {

      // On mobile, open the seat selection modal (only if authenticated)
      if (isMobile && selectedDate) {
        setMobileSeatModalSeatId(seatId);
        setMobileSeatModalDate(selectedDate);
        setMobileSeatModalOpen(true);
        return;
      }

      // If authenticated, proceed with seat selection
      if (selectedDate) {
        const currentClickedSeat = selectedSeatsFromClick[selectedDate];
        const newSeatId = seatId === currentClickedSeat ? null : seatId;

        // Update per-date seat selection
        setSelectedSeatsFromClick(prev => ({
          ...prev,
          [selectedDate]: newSeatId || ''
        }));

        // Also update the main selectedSeat for current date compatibility
        setSelectedSeat(newSeatId);
      }
    }
  };

  const handleMobileSeatModalClose = () => {
    setMobileSeatModalOpen(false);
    setMobileSeatModalSeatId('');
    setMobileSeatModalDate('');
  };

  const handleMobileSeatModalSubmit = async (seatId: string, timeSlot: 'AM' | 'PM' | 'FULL_DAY') => {
    if (!mobileSeatModalDate) return;

    try {
      const bookings = [{
        date: mobileSeatModalDate,
        seatId,
        timeSlot
      }];

      await handleReservation(bookings);
      handleMobileSeatModalClose();
    } catch (error) {
      console.error('Failed to create mobile reservation:', error);
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

  const handleMobileTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setMobileTabValue(newValue);
  }; 
  
  const handleReservation = async (bookings: Array<{ date: string; seatId: string; timeSlot: 'AM' | 'PM' | 'FULL_DAY' }>) => {

    if (bookings.length > 0) {
      try {
        setBookingError(null);
        console.log(`🎫 Creating ${bookings.length} bookings for ${currentUser}:`, bookings);

        const result = await bookingService.createMultipleBookings(currentUser!, bookings);

        if (result.success) {
          console.log(`✅ ${result.bookings?.length || 0} bookings created successfully`);

          if (result.failedBookings && result.failedBookings.length > 0) {
            setBookingError(`Some bookings failed: ${result.error}`);
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

          console.log('✅ Bookings created and state refreshed');
        } else {
          console.log("❌ Booking failed:", result.error);
          setBookingError(result.error || "Failed to create bookings");
        }
      } catch (error) {
        console.error("❌ Error creating bookings:", error);
        setBookingError("Failed to create bookings. Please try again.");
      }
    }
  };

  const handleDropdownSelectionChange = (selections: { [date: string]: string }) => {
    setSelectedSeatsFromDropdown(selections);
  };

  const handleClearBooking = () => {
    setSelectedSeat(null);
    // Also clear the per-date click selection for current date
    if (selectedDate) {
      setSelectedSeatsFromClick(prev => ({
        ...prev,
        [selectedDate]: ''
      }));
    }
  };

  const handleDateClick = useCallback(async (dateStr: string) => {
    setSelectedDate(dateStr);
    // Restore seat selection for this date if it exists
    const clickedSeatForDate = selectedSeatsFromClick[dateStr];
    setSelectedSeat(clickedSeatForDate || null);

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
      const bookedSeatsData = allBookings.map(booking => ({
        seatId: booking.seatId,
        userId: booking.userId,
        timeSlot: booking.timeSlot
      }));
      console.log(`📊 Setting bookedSeatsData for ${dateStr}:`, bookedSeatsData);
      setAllBookingsForDate(bookedSeatsData);
    } catch (err) {
      console.error("Error loading seats for date:", err);
      setAvailableSeatsForDate([]);
      setAllBookingsForDate([]);
      setBookingError("Failed to load seats for selected date");
    }
  }, [selectedSeatsFromClick]);

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
    <Container maxWidth="xl" sx={{ height: "100vh", py: 2, display: "flex", flexDirection: "column" }}>
      {/* User Session Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" component="h3" color="primary">
          Seat Booking
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Chip
            icon={<PersonIcon />}
            label={`${currentUser}`}
            color="primary"
            variant="outlined"
          />
          <Button
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            variant="outlined"
            size="small"
          >
            Logout
          </Button>
        </Box>
      </Box>

      {/* Mobile Tabs - Only show on mobile */}
      {isMobile && (
        <Tabs
          value={mobileTabValue}
          onChange={handleMobileTabChange}
          aria-label="mobile navigation tabs"
          variant="fullWidth"
        >
          <Tab
            icon={<ChairIcon />}
            label="Seating"
            id="mobile-tab-0"
            aria-controls="mobile-tabpanel-0"
          />
          <Tab
            icon={<EventIcon />}
            label="Reservation"
            id="mobile-tab-1"
            aria-controls="mobile-tabpanel-1"
          />
        </Tabs>
      )}

      {/* Desktop Layout - Side by side */}
      {!isMobile ? (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flex: 1,
          }}
        >
          {/* Left Section - Seating Layout */}
          <Box
            sx={{
              flex: "0 0 60%",
              backgroundColor: "#f8f9fa",
              borderRadius: 2,
              border: "1px solid #e0e0e0",
              overflow: "hidden",
            }}
          >
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
              timeSlot={bookingsMap[selectedDate || '']?.timeSlot}
            />
          </Box>

          {/* Right Section - Reservation Form */}
          <Box
            sx={{
              flex: "0 0 40%",
              p: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ReservationForm
              selectedDate={selectedDate || undefined}
              onDateClick={handleDateClick}
              selectedSeat={selectedSeat || undefined}
              selectedSeatsFromClick={selectedSeatsFromClick}
              onSubmit={handleReservation}
              onClear={handleClearBooking}
              onDropdownSelectionChange={handleDropdownSelectionChange}
              currentUser={currentUser || undefined}
              userBookings={userBookings.filter(b => b.status === 'ACTIVE').map(b => ({
                date: b.date,
                seatId: b.seatId,
                timeSlot: b.timeSlot
              }))}
              allBookingsForDate={allBookingsForDate}
              onBookingChange={async () => {
                // Refresh all bookings for the selected date
                const dateToRefresh = selectedDate || todayDate;
                const allBookings = await bookingService.getBookingsForDate(dateToRefresh);

                // Transform bookings to the format expected by Table component
                const bookedSeatsData = allBookings.map(booking => ({
                  seatId: booking.seatId,
                  userId: booking.userId,
                  timeSlot: booking.timeSlot
                }));
                setAllBookingsForDate(bookedSeatsData);

                // Refresh user bookings
                const userData = await bookingService.loadUserData(currentUser!);
                setUserBookings(userData.userBookings);
                // Refresh available seats for the selected date
                if (selectedDate) {
                  const reservedSeats = allBookings.map(b => b.seatId);
                  const seats = generateAllSeats(SEATING_CONFIG).filter(
                    (seat) => !reservedSeats.includes(seat)
                  );
                  setAvailableSeatsForDate(seats);
                  // If the selected seat was just deleted, clear it
                  const stillBooked = userData.userBookings.find(
                    b => b.date === selectedDate && b.seatId === selectedSeat
                  );
                  if (!stillBooked) {
                    setSelectedSeat(null);
                  }
                }
              }}
            />
          </Box>
        </Box>
      ) : (
        /* Mobile Layout - Tabbed */
        <Box sx={{ flex: 1 }}>
          {/* Tab Panel 0 - Seating Layout */}
          <Box
            role="tabpanel"
            hidden={mobileTabValue !== 0}
            id="mobile-tabpanel-0"
            aria-labelledby="mobile-tab-0"
            sx={{
              backgroundColor: "#f8f9fa",
              borderRadius: 2,
              display: mobileTabValue === 0 ? "flex" : "none",
              border: "1px solid #e0e0e0",
              height: '100%',
            }}
          >
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
              timeSlot={bookingsMap[selectedDate || '']?.timeSlot}
            />
          </Box>

          {/* Tab Panel 1 - Reservation Form */}
          <Box
            role="tabpanel"
            hidden={mobileTabValue !== 1}
            id="mobile-tabpanel-1"
            aria-labelledby="mobile-tab-1"
            sx={{
              p: 2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ReservationForm
              selectedDate={selectedDate || undefined}
              onDateClick={handleDateClick}
              selectedSeat={selectedSeat || undefined}
              selectedSeatsFromClick={selectedSeatsFromClick}
              onSubmit={handleReservation}
              onClear={handleClearBooking}
              onDropdownSelectionChange={handleDropdownSelectionChange}
              currentUser={currentUser || undefined}
              userBookings={userBookings.filter(b => b.status === 'ACTIVE').map(b => ({
                date: b.date,
                seatId: b.seatId,
                timeSlot: b.timeSlot
              }))}
              allBookingsForDate={allBookingsForDate}
              onBookingChange={async () => {
                // Refresh all bookings for the selected date
                const dateToRefresh = selectedDate || todayDate;
                const allBookings = await bookingService.getBookingsForDate(dateToRefresh);

                // Transform bookings to the format expected by Table component
                const bookedSeatsData = allBookings.map(booking => ({
                  seatId: booking.seatId,
                  userId: booking.userId,
                  timeSlot: booking.timeSlot
                }));
                setAllBookingsForDate(bookedSeatsData);

                // Refresh user bookings
                const userData = await bookingService.loadUserData(currentUser!);
                setUserBookings(userData.userBookings);
                // Refresh available seats for the selected date
                if (selectedDate) {
                  const reservedSeats = allBookings.map(b => b.seatId);
                  const seats = generateAllSeats(SEATING_CONFIG).filter(
                    (seat) => !reservedSeats.includes(seat)
                  );
                  setAvailableSeatsForDate(seats);
                  // If the selected seat was just deleted, clear it
                  const stillBooked = userData.userBookings.find(
                    b => b.date === selectedDate && b.seatId === selectedSeat
                  );
                  if (!stillBooked) {
                    setSelectedSeat(null);
                  }
                }
              }}
            />
          </Box>
        </Box>
      )}

      {/* Mobile Seat Selection Modal */}
      <MobileSeatModal
        open={mobileSeatModalOpen}
        onClose={handleMobileSeatModalClose}
        seatId={mobileSeatModalSeatId}
        selectedDate={mobileSeatModalDate}
        onSubmit={handleMobileSeatModalSubmit}
        currentUser={currentUser || undefined}
        allBookingsForDate={allBookingsForDate}
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
