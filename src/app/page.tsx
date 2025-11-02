"use client";
import { useCallback, useState, useMemo } from "react";
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Avatar,
  Chip,
  Button,
} from "@mui/material";
import {
  ExitToApp as LogoutIcon,
  Home as HomeIcon,
  DirectionsCar as CarIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import SeatingLayout from "../components/SeatingLayout";
import SeatModal from "../components/SeatModal";
import BookedSeatItem from "../components/BookedSeatItem";
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

  // Check if a given date string is a weekend (Saturday = 6, Sunday = 0)
  const isDateWeekend = (dateStr: string): boolean => {
    const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  // Check if a given date string is in the past
  const isDateInPast = (dateStr: string): boolean => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare only dates
    return date < today;
  };

  // Generate 10 working days with Friday 3 PM deadline logic
  const dateChips = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentHour = now.getHours();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
    const dates: Date[] = [];

    // Check if it's after 3 PM on Friday
    const isAfterFridayDeadline = currentDay === 5 && currentHour >= 15; // Friday and >= 3 PM

    if (isAfterFridayDeadline) {
      // Show next two weeks' working days (10 working days)
      const nextMonday = new Date(today);
      const daysUntilNextMonday = (8 - currentDay) % 7; // Days until next Monday
      nextMonday.setDate(today.getDate() + daysUntilNextMonday);

      // Add 10 working days (2 weeks of Mon-Fri)
      let addedDays = 0;
      let currentDate = new Date(nextMonday);
      while (addedDays < 10) {
        const dayOfWeek = currentDate.getDay();
        // Only add weekdays (Monday = 1 to Friday = 5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          dates.push(new Date(currentDate));
          addedDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Show current and next week's working days (10 working days)
      const monday = new Date(today);
      const daysFromMonday = (currentDay + 6) % 7; // Calculate days since Monday
      monday.setDate(today.getDate() - daysFromMonday);

      // Add 10 working days (2 weeks of Mon-Fri)
      let addedDays = 0;
      let currentDate = new Date(monday);
      while (addedDays < 10) {
        const dayOfWeek = currentDate.getDay();
        // Only add weekdays (Monday = 1 to Friday = 5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          dates.push(new Date(currentDate));
          addedDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return {
      dates,
      today,
      isAfterFridayDeadline,
    };
  }, []); // Only recalculate when component mounts

  // Get month and year from first date
  const monthYearLabel = useMemo(() => {
    if (dateChips.dates.length > 0) {
      const firstDate = dateChips.dates[0];
      const monthName = firstDate.toLocaleDateString('en-US', { month: 'long' });
      const year = firstDate.getFullYear();
      return `${monthName}, ${year}:`;
    }
    return 'Dates:';
  }, [dateChips.dates]);

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Mobile seat modal state
  const [mobileSeatModalOpen, setMobileSeatModalOpen] = useState(false);
  const [mobileSeatModalSeatId, setMobileSeatModalSeatId] =
    useState<string>("");
  const [mobileSeatModalDate, setMobileSeatModalDate] = useState<string>("");
  const [modalAnchorPosition, setModalAnchorPosition] = useState<{ top: number; left: number } | null>(null);

  // Track modifications for drawer update functionality
  // Format: { seatId: { dateStr: boolean } } where true = add booking, false = remove booking
  const [dateModifications, setDateModifications] = useState<{
    [seatId: string]: { [dateStr: string]: boolean };
  }>({});

  // Track dates booked by other users for each seat
  // Format: { seatId: string[] } where array contains date strings booked by others
  const [otherUsersBookings, setOtherUsersBookings] = useState<{
    [seatId: string]: string[];
  }>({});

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

  // Load other users' bookings for seats that the current user has booked
  useEffect(() => {
    const loadOtherUsersBookings = async () => {
      if (!currentUser || userBookings.length === 0) {
        setOtherUsersBookings({});
        return;
      }

      try {
        // Get unique seat IDs from user's bookings
        const userSeatIds = [...new Set(userBookings.map(b => b.seatId))];
        const otherBookings: { [seatId: string]: string[] } = {};

        // For each seat, get all bookings and filter for other users
        for (const seatId of userSeatIds) {
          // Get all dates to check
          const datesToCheck = dateChips.dates.map(date => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          });

          const bookedByOthers: string[] = [];

          // Check each date for bookings by other users
          for (const dateStr of datesToCheck) {
            const dateBookings = await bookingService.getBookingsForDate(dateStr);
            const otherUserBooking = dateBookings.find(
              b => b.seatId === seatId && b.userId !== currentUser && b.status === 'ACTIVE'
            );
            
            if (otherUserBooking) {
              bookedByOthers.push(dateStr);
            }
          }

          otherBookings[seatId] = bookedByOthers;
        }

        setOtherUsersBookings(otherBookings);
      } catch (error) {
        console.error("Error loading other users' bookings:", error);
      }
    };

    loadOtherUsersBookings();
  }, [currentUser, userBookings, dateChips.dates]);

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

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
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

  // Handle deleting all bookings for a specific seat
  const handleDeleteSeatBookings = async (seatId: string) => {
    if (!currentUser) return;

    try {
      // Reload user data to get full booking records with IDs
      const userData = await bookingService.loadUserData(currentUser);
      
      // Find all booking IDs for this seat
      const bookingsToDelete = userData.userBookings.filter(
        (b: BookingRecord) => b.seatId === seatId
      );
      
      // Delete each booking
      for (const booking of bookingsToDelete) {
        await bookingService.cancelBooking(booking.id, currentUser);
      }

      // Refresh user bookings after deletion
      const refreshedData = await bookingService.loadUserData(currentUser);
      setUserBookings(refreshedData.userBookings);

      // Refresh all bookings for the current date if needed
      if (selectedDate) {
        const dateBookings = await bookingService.getBookingsForDate(selectedDate);
        const bookedSeatsData = dateBookings.map((booking) => ({
          seatId: booking.seatId,
          userId: booking.userId,
          timeSlot: booking.timeSlot,
        }));
        setAllBookingsForDate(bookedSeatsData);

        // Refresh available seats
        const reservedSeats = dateBookings.map((b) => b.seatId);
        const seats = generateAllSeats(SEATING_CONFIG).filter(
          (seat) => !reservedSeats.includes(seat)
        );
        setAvailableSeatsForDate(seats);
      }

      // Clear selected seat if it was the deleted one
      if (selectedSeat === seatId) {
        setSelectedSeat(null);
      }
    } catch (error) {
      console.error("Error deleting seat bookings:", error);
      setBookingError("Failed to delete bookings");
    }
  };

  // Handle toggling date selection in drawer
  const handleDateToggle = (seatId: string, dateStr: string, currentlyBooked: boolean) => {
    setDateModifications((prev) => {
      const newMods = { ...prev };
      const seatMods = newMods[seatId] || {};
      const newSeatMods = { ...seatMods };
      
      // Check if there's already a modification for this date
      const hasModification = newSeatMods[dateStr] !== undefined;
      
      // Calculate what the effective state will be after this toggle
      let willBeBooked = false;
      
      if (hasModification) {
        // If already modified, toggling will revert to original state
        willBeBooked = currentlyBooked;
        delete newSeatMods[dateStr];
      } else {
        // No modification yet, toggle from original state
        if (currentlyBooked) {
          newSeatMods[dateStr] = false; // Mark for removal
          willBeBooked = false;
        } else {
          newSeatMods[dateStr] = true; // Mark for addition
          willBeBooked = true;
        }
      }
      
      // If this seat will be booked on this date, unbook any other seats on the same date
      if (willBeBooked) {
        // Find all other seats that are booked (or will be booked) on this date
        userBookings.forEach(booking => {
          if (booking.date === dateStr && booking.seatId !== seatId) {
            // Mark originally booked seats for removal
            if (!newMods[booking.seatId]) {
              newMods[booking.seatId] = {};
            }
            newMods[booking.seatId][dateStr] = false; // Mark for removal
          }
        });
        
        // Also check for any seats that are not originally booked but marked for addition
        Object.entries(newMods).forEach(([otherSeatId, otherMods]) => {
          if (otherSeatId !== seatId && otherMods[dateStr] === true) {
            // This other seat is marked for addition on the same date, remove the modification
            delete newMods[otherSeatId][dateStr];
          }
        });
      }
      
      newMods[seatId] = newSeatMods;
      return newMods;
    });
  };

  // Handle saving date modifications
  const handleUpdateBookings = async () => {
    if (!currentUser) return;

    try {
      setIsLoadingBookings(true);

      // Process all modifications
      for (const [seatId, modifications] of Object.entries(dateModifications)) {
        for (const [dateStr, shouldBook] of Object.entries(modifications)) {
          if (shouldBook) {
            // Add new booking
            await bookingService.createBooking(
              currentUser,
              seatId,
              "FULL_DAY",
              dateStr
            );
          } else {
            // Remove booking - find the booking ID first
            const userData = await bookingService.loadUserData(currentUser);
            const bookingToRemove = userData.userBookings.find(
              (b: BookingRecord) => b.seatId === seatId && b.date === dateStr
            );
            
            if (bookingToRemove) {
              await bookingService.cancelBooking(bookingToRemove.id, currentUser);
            }
          }
        }
      }

      // Clear modifications
      setDateModifications({});

      // Refresh user bookings
      const refreshedData = await bookingService.loadUserData(currentUser);
      setUserBookings(refreshedData.userBookings);

      // Refresh all bookings for the current date if needed
      if (selectedDate) {
        const dateBookings = await bookingService.getBookingsForDate(selectedDate);
        const bookedSeatsData = dateBookings.map((booking) => ({
          seatId: booking.seatId,
          userId: booking.userId,
          timeSlot: booking.timeSlot,
        }));
        setAllBookingsForDate(bookedSeatsData);

        // Refresh available seats
        const reservedSeats = dateBookings.map((b) => b.seatId);
        const seats = generateAllSeats(SEATING_CONFIG).filter(
          (seat) => !reservedSeats.includes(seat)
        );
        setAvailableSeatsForDate(seats);
      }

      setIsLoadingBookings(false);
    } catch (error) {
      console.error("Error updating bookings:", error);
      setBookingError("Failed to update bookings");
      setIsLoadingBookings(false);
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

      {/* First Row: Date chips - Always full width */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          px: 3,
          py: 1.5,
          gap: 1.5,
          overflowX: "auto",
          overflowY: "hidden",
          borderBottom: "1px solid #E5E7EB",
          background: "#F7F8FA",
          width: "100%",
        }}
      >
        <Typography 
          fontWeight={600}
          fontSize="0.95rem"
          sx={{ 
            minWidth: "fit-content",
            pr: 0.5,
            color: "#1F2937",
          }}
        >
          {monthYearLabel}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 0.75,
            overflowX: "auto",
            overflowY: "hidden",
            alignItems: "center",
            '&::-webkit-scrollbar': {
              height: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#CBD5E1',
              borderRadius: '3px',
            },
          }}
        >
          {/* Today chip - always first */}
          <Chip
            clickable
            label="Today"
            sx={{
              cursor: "pointer",
              borderRadius: '6px',
              backgroundColor: "primary.main",
              color: "#fff",
              border: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              height: '36px',
              px: 2,
              '& .MuiChip-label': {
                px: 0.5,
                py: 0,
              },
              '&:hover': {
                backgroundColor: "primary.dark",
              },
            }}
            onClick={() => handleDateClick(todayDate)}
          />

          {/* Date chips */}
          {dateChips.dates.map((date) => {
            const dateStr = formatLocalDate(date);
            const isCurrentDate = dateStr === selectedDate;

            // Check if date is in the past
            const isPastDate =
              !dateChips.isAfterFridayDeadline && date < dateChips.today;

            // Show "Day, DD" format
            const displayLabel = `${date.toLocaleDateString('en-US', { weekday: 'short' })}, ${String(date.getDate()).padStart(2, '0')}`;

            // Determine icon based on whether user has booking for this date
            const userBookingForDate = userBookings.find(b => b.date === dateStr);
            const hasBooking = !!userBookingForDate;
            const IconComponent = hasBooking ? CarIcon : HomeIcon;

            const chipColor = isCurrentDate ? "#fff" : "#6B7280";

            return (
              <Chip
                clickable={!isPastDate}
                key={dateStr}
                icon={<IconComponent sx={{ fontSize: '1rem', color: chipColor }} />}
                label={displayLabel}
                sx={{
                  cursor: isPastDate ? "not-allowed" : "pointer",
                  opacity: isPastDate ? 0.5 : 1,
                  borderRadius: '6px',
                  backgroundColor: isCurrentDate ? "primary.main" : "#E5E7EB",
                  color: chipColor,
                  border: 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  height: '36px',
                  px: 2,
                  '& .MuiChip-label': {
                    px: 0,
                    py: 0,
                  },
                  '& .MuiChip-icon': {
                    marginLeft: '0px',
                    marginRight: '6px',
                    color: chipColor,
                  },
                  '&:hover': {
                    backgroundColor: isPastDate ? undefined : (isCurrentDate ? "primary.dark" : "#D1D5DB"),
                  },
                }}
                onClick={
                  !isPastDate
                    ? () => handleDateClick(dateStr)
                    : undefined
                }
              />
            );
          })}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          flexDirection: "row",
          alignItems: "stretch",
          position: "relative",
        }}
      >
        {/* Mobile Backdrop Overlay - Covers screen below navbar */}
        {drawerOpen && (
          <Box
            onClick={handleDrawerToggle}
            sx={{
              display: { xs: "block", md: "none" },
              position: "fixed",
              top: "64px", // Start below navbar
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1299,
              transition: "opacity 0.3s ease-in-out",
              pointerEvents: "auto",
            }}
          />
        )}

        {/* Map View - Default View */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: "#f8f9fa",
            overflow: "hidden",
            width: drawerOpen ? { xs: 0, md: "50%" } : "100%",
            display: drawerOpen ? { xs: "none", md: "block" } : "block",
            transition: "width 0.3s ease-in-out",
          }}
        >
          <SeatingLayout
            onSeatClick={handleSeatClick}
            availableSeats={availableSeatsForDate}
            selectedSeat={selectedSeat || undefined}
            selectedSeatsFromDropdown={selectedSeatsFromDropdown}
            seatingConfig={SEATING_CONFIG}
            selectedDate={selectedDate || undefined}
            bookedSeats={allBookingsForDate}
            currentUser={currentUser || undefined}
            timeSlot={bookingsMap[selectedDate || ""]?.timeSlot}
            onToggleDrawer={handleDrawerToggle}
            drawerOpen={drawerOpen}
            isWeekend={selectedDate ? isDateWeekend(selectedDate) : false}
          />
        </Box>

        {/* Drawer for List View - Side by Side */}
        <Box
          sx={{
            width: { xs: "100%", md: drawerOpen ? "50%" : 0 },
            maxWidth: { xs: "100%", md: drawerOpen ? "600px" : 0 },
            overflow: "hidden",
            transition: {
              xs: "transform 0.3s ease-in-out",
              md: "width 0.3s ease-in-out, max-width 0.3s ease-in-out",
            },
            borderLeft: drawerOpen ? { xs: "none", md: "1px solid #CDCFD0" } : "none",
            backgroundColor: "#fff",
            display: { xs: "flex", md: "flex" },
            flexDirection: "column",
            position: { xs: "fixed", md: "relative" },
            top: { xs: "64px", md: "auto" }, // Start below navbar (approximate navbar height)
            bottom: { xs: 0, md: "auto" },
            left: { xs: 0, md: "auto" },
            right: { xs: 0, md: "auto" },
            height: { xs: "calc(100vh - 64px)", md: "auto" }, // Full height minus navbar
            zIndex: { xs: 1300, md: "auto" },
            transform: {
              xs: drawerOpen ? "translateY(0)" : "translateY(100%)",
              md: "none",
            },
            pointerEvents: { xs: drawerOpen ? "auto" : "none", md: "auto" },
          }}
        >
          {drawerOpen && (
            <>
              {/* Drawer Navbar */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  px: 2,
                  py: 1.25,
                  backgroundColor: "#FF6B35",
                  color: "#fff",
                  minHeight: "56px",
                }}
              >
                <IconButton
                  onClick={handleDrawerToggle}
                  sx={{
                    position: "absolute",
                    left: 8,
                    color: "#fff",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  <MenuIcon />
                </IconButton>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  My Booked List
                </Typography>
              </Box>

              {/* Drawer Content */}
              <Box
                sx={{
                  flex: 1,
                  overflow: "auto",
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {/* Group bookings by seat */}
                {Object.entries(
                  userBookings.reduce((acc, booking) => {
                    if (!acc[booking.seatId]) {
                      acc[booking.seatId] = [];
                    }
                    acc[booking.seatId].push(booking.date);
                    return acc;
                  }, {} as Record<string, string[]>)
                ).map(([seatId, bookedDates]) => {
                  // Extract table letter from seatId (e.g., "A1" -> "A")
                  const tableLetter = seatId.charAt(0);
                  
                  // Determine zone based on table letter
                  const zone = SEATING_CONFIG.zones.zone1.tables.includes(tableLetter) 
                    ? "A" 
                    : "B";

                  return (
                    <BookedSeatItem
                      key={seatId}
                      seatId={seatId}
                      zone={zone}
                      bookedDates={bookedDates}
                      allDates={dateChips.dates}
                      onDelete={() => handleDeleteSeatBookings(seatId)}
                      onDateToggle={(dateStr, currentlyBooked) => 
                        handleDateToggle(seatId, dateStr, currentlyBooked)
                      }
                      modifiedDates={dateModifications[seatId] || {}}
                      disabledDates={otherUsersBookings[seatId] || []}
                    />
                  );
                })}

                {userBookings.length === 0 && (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 8,
                      color: "#6B7280",
                    }}
                  >
                    <Typography variant="body1">
                      No bookings yet
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Drawer Footer with Buttons */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  backgroundColor: "#fff",
                }}
              >
                <Button
                  variant="contained"
                  onClick={handleDrawerToggle}
                  sx={{
                    textTransform: "none",
                    px: 4,
                    py: 1,
                    backgroundColor: "#E5E7EB",
                    color: "#374151",
                    boxShadow: "none",
                    "&:hover": {
                      backgroundColor: "#D1D5DB",
                      boxShadow: "none",
                    },
                  }}
                >
                  Close
                </Button>
                <Button
                  variant="contained"
                  onClick={handleUpdateBookings}
                  disabled={Object.keys(dateModifications).length === 0 || isLoadingBookings}
                  sx={{
                    textTransform: "none",
                    px: 4,
                    py: 1,
                    backgroundColor: "#FF6B35",
                    "&:hover": {
                      backgroundColor: "#E55A2B",
                    },
                    "&:disabled": {
                      backgroundColor: "#D1D5DB",
                      color: "#9CA3AF",
                    },
                  }}
                >
                  {isLoadingBookings ? "Updating..." : "Update"}
                </Button>
              </Box>
            </>
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
