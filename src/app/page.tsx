"use client";
import { useCallback, useState, useMemo, useEffect } from "react";
import Image from "next/image";
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
  Autocomplete,
  TextField,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightFromBracket,
  faHouse,
  faPlus,
  faBriefcase,
} from "@fortawesome/free-solid-svg-icons";
import SeatingLayout from "../components/SeatingLayout";
import SeatModal from "../components/SeatModal";
import BookedSeatItem from "../components/BookedSeatItem";
import { useUserSession } from "../hooks/useUserSession";
import { SEATING_CONFIG, generateAllSeats } from "../config/seatingConfig";
import { bookingService } from "../services/bookingService";
import { vercelDataService } from "../services/vercelDataService";
import { BookingRecord } from "../utils/bookingStorage";
import { processMultipleSeatBookingModifications } from "../utils/bookingModifications";

const userAvatar = {
  1234: 'https://i.ibb.co/MkT31s77/408-Minh-Nguyen.jpg',
  "U001": 'https://i.ibb.co/8nhwmzLC/428-Dung-Huynh.jpg',
  "U002": 'https://i.ibb.co/My7pW5vQ/418-Huy-Vu.jpg',
  "U003": 'https://i.ibb.co/SXXwNf97/434-Mai-Tien.jpg',
  "U004": 'https://i.ibb.co/tT88X1D4/435-Nghia-Nguyen.jpg',
  "U005": 'https://i.ibb.co/9mR4Zq7N/416-Thao-Nguyen.jpg',
  "U006": 'https://i.ibb.co/JWckxF8d/422-Hoai-Nguyen.jpg',
  "U007": 'https://i.ibb.co/mr3hw0n3/436-Tien-Nguyen.jpg',
  "U008": 'https://i.ibb.co/zWV11c6Z/415-Quoc-Nguyen.jpg',
  "U009": 'https://i.ibb.co/QFDHr77c/445-Thien-Truong.jpg',
  "U010": 'https://i.ibb.co/5ZNdVv8/444-Khanh-Dao.jpg',
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
      const currentDate = new Date(nextMonday);
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
      const currentDate = new Date(monday);
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
    }>
  >([]);

  // Desktop tab state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Disable animations during resize
  const [isResizing, setIsResizing] = useState(false);

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

  // Track temporary seats added via the plus button (not yet saved)
  const [tempSeats, setTempSeats] = useState<string[]>([]);
  const [showAddSeatDropdown, setShowAddSeatDropdown] = useState(false);

  // Track all seats' bookings to determine which are fully booked
  const [allSeatsBookings, setAllSeatsBookings] = useState<{
    [seatId: string]: Array<{ date: string; userId: string }>;
  }>({});

  // Prepare all bookings data for the seat modal
  const allBookingsForModal = useMemo(() => {
    return userBookings
      .filter((b) => b.status === "ACTIVE")
      .map((b) => ({
        seatId: b.seatId,
        userId: b.userId,
        timeSlot: b.timeSlot,
        date: b.date,
      }));
  }, [userBookings]);

  const { currentUser, clearUserSession, isLoading } = useUserSession();

  // Redirect to auth if user becomes null (logged out)
  useEffect(() => {
    if (!isLoading && !currentUser) {
      window.location.href = "/auth";
    }
  }, [currentUser, isLoading]);

  // Disable animations during window resize
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      setIsResizing(true);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setIsResizing(false);
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

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

  // Load all seats' bookings when drawer is opened or when user/temp seats change
  useEffect(() => {
    const loadAllSeatsBookings = async () => {
      if (!currentUser) {
        return;
      }

      try {
        // Determine which seats to load bookings for
        let seatsToLoad: string[];
        
        if (showAddSeatDropdown) {
          // When dropdown is open, load all seats
          seatsToLoad = generateAllSeats(SEATING_CONFIG);
        } else {
          // Otherwise, load seats that user has booked, added as temp, or currently viewing in modal
          seatsToLoad = [...new Set([
            ...userBookings.map(b => b.seatId),
            ...tempSeats,
            ...(mobileSeatModalOpen && mobileSeatModalSeatId ? [mobileSeatModalSeatId] : [])
          ])];
        }

        if (seatsToLoad.length === 0) {
          setAllSeatsBookings({});
          return;
        }

        const allBookings: { [seatId: string]: Array<{ date: string; userId: string }> } = {};

        // Get all available dates
        const datesToCheck = dateChips.dates.map(date => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        });

        // For each seat, check which dates are booked and by whom
        for (const seatId of seatsToLoad) {
          const seatBookings: Array<{ date: string; userId: string }> = [];

          for (const dateStr of datesToCheck) {
            const dateBookings = await bookingService.getBookingsForDate(dateStr);
            const booking = dateBookings.find(
              b => b.seatId === seatId && b.status === 'ACTIVE'
            );

            if (booking) {
              seatBookings.push({ date: dateStr, userId: booking.userId });
            }
          }

          allBookings[seatId] = seatBookings;
        }

        setAllSeatsBookings(allBookings);
      } catch (error) {
        console.error("Error loading all seats' bookings:", error);
      }
    };

    loadAllSeatsBookings();
  }, [showAddSeatDropdown, currentUser, dateChips.dates, userBookings, tempSeats, mobileSeatModalOpen, mobileSeatModalSeatId]);

  const handleSeatClick = (seatId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    // Check seat availability - simplified for FULL_DAY bookings only
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

      // If someone else has booked it, it's not available
      return false;
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

  const handleLogout = async () => {
    // Clear all state before logout
    setSelectedSeat(null);
    setSelectedSeatsFromClick({});
    setSelectedSeatsFromDropdown({});
    setUserBookings([]);

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

  // Get available seats that aren't already in user's booking list or temp seats
  // Also filter out seats that are fully booked by others for all dates
  const getAvailableSeatsForDropdown = () => {
    const allSeats = generateAllSeats(SEATING_CONFIG);
    const userSeatIds = [...new Set(userBookings.map(b => b.seatId))];

    // Get all available dates (working days)
    const allAvailableDates = dateChips.dates.map(date => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    // Filter out seats that are:
    // 1. Already in user's bookings
    // 2. Already in temp seats
    // 3. Fully booked for ALL available dates
    return allSeats.filter(seatId => {
      // Check if already in user's list
      if (userSeatIds.includes(seatId) || tempSeats.includes(seatId)) {
        return false;
      }

      // Check if seat is fully booked for all dates
      const seatBookedDates = allSeatsBookings[seatId] || [];

      // If the seat has bookings for ALL available dates, exclude it
      const isFullyBooked = allAvailableDates.length > 0 &&
        allAvailableDates.every(date => 
          seatBookedDates.some(booking => booking.date === date)
        );

      return !isFullyBooked;
    });
  };

  // Handle adding a temporary seat
  const handleAddTempSeat = (seatId: string) => {
    if (seatId && !tempSeats.includes(seatId)) {
      setTempSeats(prev => [...prev, seatId]);
      setShowAddSeatDropdown(false);
    }
  };

  // Handle deleting a temporary seat
  const handleDeleteTempSeat = (seatId: string) => {
    setTempSeats(prev => prev.filter(id => id !== seatId));
    // Also remove any modifications for this temp seat
    setDateModifications(prev => {
      const newMods = { ...prev };
      delete newMods[seatId];
      return newMods;
    });
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

      // Process all modifications (including temp seats)
      await processMultipleSeatBookingModifications(dateModifications, currentUser);

      // Clear modifications and temp seats
      setDateModifications({});
      setTempSeats([]);

      // Refresh user bookings
      const refreshedData = await bookingService.loadUserData(currentUser);
      setUserBookings(refreshedData.userBookings);

      // Refresh all bookings for the current date if needed
      if (selectedDate) {
        const dateBookings = await bookingService.getBookingsForDate(selectedDate);
        const bookedSeatsData = dateBookings.map((booking) => ({
          seatId: booking.seatId,
          userId: booking.userId,
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

  // Handle successful booking updates - refresh data
  const handleModalSuccess = useCallback(async () => {
    // Reload user bookings
    if (currentUser) {
      const userData = await bookingService.loadUserData(currentUser);
      setUserBookings(userData.userBookings);
    }

    // Refresh current date's booking data
    if (selectedDate) {
      await handleDateClick(selectedDate);
    }
  }, [currentUser, selectedDate, handleDateClick]);

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
          {/* Logo */}
          <Image 
            src="/logo.png" 
            alt="Flexi Seat Logo" 
            width={32}
            height={32}
          />
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
            sx={{ fontSize: '1.2rem' }}
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
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
            const iconToUse = hasBooking ? faBriefcase : faHouse;

            // Set colors: white for selected, green for unselected with booking, gray for no booking
            const chipColor = isCurrentDate ? "#fff" : "#6B7280";
            const iconColor = isCurrentDate ? "#fff" : (hasBooking ? "#61BF76" : "#6B7280");

            return (
              <Chip
                clickable={!isPastDate}
                key={dateStr}
                icon={<FontAwesomeIcon icon={iconToUse} style={{ fontSize: '1rem', color: iconColor }} />}
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
                    color: iconColor,
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
              transition: isResizing ? "none" : "opacity 0.3s ease-in-out",
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
            width: drawerOpen ? { xs: 0, md: "60%" } : "100%",
            display: drawerOpen ? { xs: "none", md: "block" } : "block",
            transition: isResizing ? "none" : "width 0.3s ease-in-out",
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
            onToggleDrawer={handleDrawerToggle}
            drawerOpen={drawerOpen}
            isWeekend={selectedDate ? isDateWeekend(selectedDate) : false}
          />
        </Box>

        {/* Drawer for List View - Side by Side */}
        <Box
          sx={{
            width: { xs: "100%", md: drawerOpen ? "45%" : 0 },
            maxWidth: { xs: "100%", md: drawerOpen ? "450px" : 0 },
            overflow: "hidden",
            transition: isResizing ? "none" : {
              xs: "transform 0.3s ease-in-out",
              md: "width 0.3s ease-in-out, max-width 0.3s ease-in-out",
            },
            backgroundColor: "#F7F8FA",
            boxShadow: drawerOpen ? { xs: "none", md: "-4px 0 12px rgba(0, 0, 0, 0.1)" } : "none",
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
          <Box
            sx={{
              opacity: drawerOpen ? 1 : 0,
              transition: isResizing ? "none" : "opacity 0.5s ease-in-out",
              height: "100%",
              display: "flex",
              flexDirection: "column",
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
                    <Image 
                      src="/menu-close.png" 
                      alt="Menu" 
                      width={20}
                      height={20}
                    />
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
                        disabledDates={
                          (allSeatsBookings[seatId] || [])
                            .filter(booking => booking.userId !== currentUser)
                            .map(booking => booking.date)
                        }
                      />
                    );
                  })}

                  {/* Temporary seats (not yet saved) */}
                  {tempSeats.map((seatId) => {
                    const tableLetter = seatId.charAt(0);
                    const zone = SEATING_CONFIG.zones.zone1.tables.includes(tableLetter)
                      ? "A"
                      : "B";

                    return (
                      <BookedSeatItem
                        key={`temp-${seatId}`}
                        seatId={seatId}
                        zone={zone}
                        bookedDates={[]} // No dates booked yet
                        allDates={dateChips.dates}
                        onDelete={() => handleDeleteTempSeat(seatId)}
                        onDateToggle={(dateStr, currentlyBooked) =>
                          handleDateToggle(seatId, dateStr, currentlyBooked)
                        }
                        modifiedDates={dateModifications[seatId] || {}}
                        disabledDates={
                          (allSeatsBookings[seatId] || [])
                            .filter(booking => booking.userId !== currentUser)
                            .map(booking => booking.date)
                        }
                      />
                    );
                  })}

                  {userBookings.length === 0 && tempSeats.length === 0 && (
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

                {/* Drawer Footer with Buttons and Dropdown */}
                <Box
                  sx={{
                    backgroundColor: "#fff",
                    borderTop: "1px solid #E5E7EB",
                  }}
                >
                  {/* Add Seat Dropdown */}
                  {showAddSeatDropdown && (
                    <Box
                      sx={{
                        p: 2,
                        borderBottom: "1px solid #E5E7EB",
                      }}
                    >
                      <Autocomplete
                        options={getAvailableSeatsForDropdown()}
                        getOptionLabel={(seatId) => {
                          const tableLetter = seatId.charAt(0);
                          const zone = SEATING_CONFIG.zones.zone1.tables.includes(tableLetter)
                            ? "A"
                            : "B";
                          return `Desk ${seatId} - Zone ${zone}`;
                        }}
                        onChange={(_, value) => {
                          if (value) {
                            handleAddTempSeat(value);
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Search and select a seat..."
                            size="small"
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                "& fieldset": {
                                  borderColor: "#FF6B35",
                                },
                                "&:hover fieldset": {
                                  borderColor: "#E55A2B",
                                },
                                "&.Mui-focused fieldset": {
                                  borderColor: "#FF6B35",
                                },
                              },
                            }}
                          />
                        )}
                      />
                    </Box>
                  )}

                  {/* Button Row */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 2,
                    }}
                  >
                    {/* Close Button - Left */}
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

                    {/* Right Side Buttons */}
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      {/* Plus Button */}
                      <Button
                        variant="contained"
                        onClick={() => setShowAddSeatDropdown(!showAddSeatDropdown)}
                        sx={{
                          textTransform: "none",
                          minWidth: "auto",
                          width: "40px",
                          height: "40px",
                          p: 0,
                          backgroundColor: "#E5E7EB",
                          color: "#374151",
                          boxShadow: "none",
                          "&:hover": {
                            backgroundColor: "#D1D5DB",
                            boxShadow: "none",
                          },
                        }}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </Button>

                      {/* Update Button */}
                      <Button
                        variant="contained"
                        onClick={handleUpdateBookings}
                        disabled={(Object.keys(dateModifications).length === 0 && tempSeats.length === 0) || isLoadingBookings}
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
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>

      <SeatModal
        open={mobileSeatModalOpen}
        onClose={handleMobileSeatModalClose}
        seatId={mobileSeatModalSeatId}
        selectedDate={mobileSeatModalDate}
        currentUser={currentUser || undefined}
        allBookingsForDate={allBookingsForDate}
        anchorPosition={modalAnchorPosition}
        allDates={dateChips.dates}
        allBookings={allBookingsForModal}
        disabledDates={
          (allSeatsBookings[mobileSeatModalSeatId] || [])
            .filter(booking => booking.userId !== currentUser)
            .map(booking => booking.date)
        }
        onSuccess={handleModalSuccess}
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
