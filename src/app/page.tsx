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
} from "@mui/material";
import {
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
} from "@mui/icons-material";
import SeatingLayout from "../components/SeatingLayout";
import ReservationForm from "../components/ReservationForm";
import UserAuthModal from "../components/UserAuthModal";
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
  const [reservedSeats, setReservedSeats] = useState<string[]>([]);
  const [pendingSeatId, setPendingSeatId] = useState<string | null>(null);
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
  const {
    currentUser,
    setUser,
    clearUserSession,
    isAuthenticated,
    isLoading,
    shouldShowAuthModal,
    setShouldShowAuthModal,
  } = useUserSession();

  // Initialize database and load user data when app opens
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoadingBookings(true);
        console.log("🚀 App starting - initializing booking system...");

        // Initialize the CSV database
        await bookingService.initializeDatabase();

        // Load reserved seats and all bookings for today
        const reserved = await bookingService.getReservedSeats();
        const allBookings = await bookingService.getBookingsForDate(todayDate);
        setReservedSeats(reserved);
        
        // Transform bookings to the format expected by Table component
        const bookedSeatsData = allBookings.map(booking => ({
          seatId: booking.seatId,
          userId: booking.userId,
          timeSlot: booking.timeSlot
        }));
        console.log(`📊 Setting bookedSeatsData for ${todayDate}:`, bookedSeatsData);
        setAllBookingsForDate(bookedSeatsData);

        console.log(`🎯 Loaded ${reserved.length} reserved seats and ${allBookings.length} bookings for today`);
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

  // Load user-specific data when user logs in
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser && isAuthenticated) {
        try {
          console.log(`👤 Loading data for user: ${currentUser}`);
          
          // Refresh CSV data to get latest bookings
          await bookingService.refreshFromCsv();
          
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

          // Refresh reserved seats and all bookings for current date
          if (selectedDate) {
            const reserved = await bookingService.getReservedSeats(selectedDate);
            const allBookings = await bookingService.getBookingsForDate(selectedDate);
            setReservedSeats(reserved);
            
            // Transform bookings to the format expected by Table component
            const bookedSeatsData = allBookings.map(booking => ({
              seatId: booking.seatId,
              userId: booking.userId,
              timeSlot: booking.timeSlot
            }));
            setAllBookingsForDate(bookedSeatsData);
            
            // Update available seats for the current date
            const seats = generateAllSeats(SEATING_CONFIG).filter(
              (seat) => !reserved.includes(seat)
            );
            setAvailableSeatsForDate(seats);
          }

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
  }, [currentUser, isAuthenticated, selectedDate]);

  useEffect(() => {
    // Only run if selectedDate is set
    if (selectedDate) {
      handleDateClick(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // If user is not authenticated, show auth modal first
      if (!isAuthenticated) {
        setPendingSeatId(seatId);
        setShouldShowAuthModal(true);
        return;
      }

      // If authenticated, proceed with seat selection
      setSelectedSeat(seatId === selectedSeat ? null : seatId);
    }
  };

  const handleUserAuthenticated = async (userId: string) => {
    setUser(userId);

    // If there was a pending seat selection, complete it now
    if (pendingSeatId) {
      setSelectedSeat(pendingSeatId);
      setPendingSeatId(null);
    }

    // Refresh booking data to ensure new user sees updated seat availability
    try {
      await bookingService.refreshFromCsv();
      // Reload reserved seats for current date
      if (selectedDate) {
        const reserved = await bookingService.getReservedSeats(selectedDate);
        setReservedSeats(reserved);
        
        // Update available seats for the current date
        const seats = generateAllSeats(SEATING_CONFIG).filter(
          (seat) => !reserved.includes(seat)
        );
        setAvailableSeatsForDate(seats);
      }
    } catch (error) {
      console.error("Error refreshing data after login:", error);
    }
  };

  const handleAuthModalClose = () => {
    setShouldShowAuthModal(false);
    setPendingSeatId(null);
  };

  const handleLogout = async () => {
    clearUserSession();
    setSelectedSeat(null);
    setUserBookings([]);
    
    // Refresh booking data to ensure new user sees updated seat availability
    try {
      await bookingService.refreshFromCsv();
      // Reload reserved seats for current date
      if (selectedDate) {
        const reserved = await bookingService.getReservedSeats(selectedDate);
        setReservedSeats(reserved);
        
        // Update available seats for the current date
        const seats = generateAllSeats(SEATING_CONFIG).filter(
          (seat) => !reserved.includes(seat)
        );
        setAvailableSeatsForDate(seats);
      }
    } catch (error) {
      console.error("Error refreshing data after logout:", error);
    }
  };

  const handleReservation = async (date: string, timeSlot: 'AM' | 'PM' | 'FULL_DAY') => {
    if (selectedSeat && currentUser && date) {
      try {
        setBookingError(null);
        console.log(
          `🎫 Creating booking: ${currentUser} -> ${selectedSeat} (${timeSlot}) on ${date}`
        );

        // Check if the time slot is available
        const existingBookings = await bookingService.getBookingsForDate(date);
        const conflictingBooking = existingBookings.find(booking => 
          booking.seatId === selectedSeat && (
            timeSlot === 'FULL_DAY' ||
            booking.timeSlot === 'FULL_DAY' ||
            booking.timeSlot === timeSlot
          )
        );

        if (conflictingBooking) {
          setBookingError("This time slot is already taken");
          return;
        }

        // Proceed with booking creation
        setBookingError(null);
        console.log(
          `🎫 Creating booking: ${currentUser} -> ${selectedSeat} on ${date}`
        );

        const result = await bookingService.createBooking(
          currentUser,
          selectedSeat,
          timeSlot,
          date
        );

        if (result.success) {
          console.log("✅ Booking created successfully");

          // Reload reserved seats from database for the selected date
          const reserved = await bookingService.getReservedSeats(date);
          setReservedSeats(reserved);

          // Reload user bookings
          const userData = await bookingService.loadUserData(currentUser);
          setUserBookings(userData.userBookings);

          setSelectedSeat(null);

          // Rerun handleDateClick to update availableSeatsForDate and rerender SeatingLayout
          handleDateClick(date);
        } else {
          console.log("❌ Booking failed:", result.error);
          setBookingError(result.error || "Failed to create booking");
        }
      } catch (error) {
        console.error("❌ Error creating booking:", error);
        setBookingError("Failed to create booking. Please try again.");
      }
    }
  };

  const handleClearBooking = () => {
    setSelectedSeat(null);
  };

  const handleDateClick = useCallback(async (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSeat(null); // Clear selected seat when changing date

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
  }, []);

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
    <Container maxWidth="lg" sx={{ height: "100vh", py: 2 }}>
      {/* User Session Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" component="h1" color="primary">
          Seat Booking
        </Typography>

        {isAuthenticated ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Chip
              icon={<PersonIcon />}
              label={`${currentUser} (${userBookings.length} bookings)`}
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
        ) : (
          <Chip
            icon={<PersonIcon />}
            label="Not logged in - Select a seat to authenticate"
            color="default"
            variant="outlined"
          />
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          height: "calc(100% - 80px)",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
        }}
      >
        {/* Left Section - Seating Layout */}
        <Box
          sx={{
            flex: { xs: 1, md: "0 0 65%" },
            backgroundColor: "#f8f9fa",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: { xs: "400px", md: "auto" },
            border: "1px solid #e0e0e0",
          }}
        >
          <SeatingLayout
            onSeatClick={handleSeatClick}
            availableSeats={availableSeatsForDate}
            selectedSeat={selectedSeat || undefined}
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
            flex: { xs: 1, md: "0 0 35%" },
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
            onSubmit={handleReservation}
            onClear={handleClearBooking}
            currentUser={currentUser || undefined}
            isAuthenticated={isAuthenticated}
            userBookings={userBookings.filter(b => b.status === 'ACTIVE').map(b => ({ 
              date: b.date, 
              seatId: b.seatId,
              timeSlot: b.timeSlot
            }))}
            allBookingsForDate={allBookingsForDate}
            onBookingChange={async () => {
              if (currentUser) {
                // Refresh reserved seats and all bookings for the selected date
                const dateToRefresh = selectedDate || todayDate;
                const reserved = await bookingService.getReservedSeats(dateToRefresh);
                const allBookings = await bookingService.getBookingsForDate(dateToRefresh);
                setReservedSeats(reserved);
                
                // Transform bookings to the format expected by Table component
                const bookedSeatsData = allBookings.map(booking => ({
                  seatId: booking.seatId,
                  userId: booking.userId,
                  timeSlot: booking.timeSlot
                }));
                setAllBookingsForDate(bookedSeatsData);
                
                // Refresh user bookings
                const userData = await bookingService.loadUserData(currentUser);
                setUserBookings(userData.userBookings);
                // Refresh available seats for the selected date
                if (selectedDate) {
                  const seats = generateAllSeats(SEATING_CONFIG).filter(
                    (seat) => !reserved.includes(seat)
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
              }
            }}
          />
        </Box>
      </Box>

      {/* User Authentication Modal */}
      <UserAuthModal
        open={shouldShowAuthModal}
        onClose={handleAuthModalClose}
        onUserConfirmed={handleUserAuthenticated}
        selectedSeat={pendingSeatId || undefined}
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
