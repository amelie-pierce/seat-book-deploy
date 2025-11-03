import { useMediaQuery, useTheme } from "@mui/material";
import MobileSeatModal from "./MobileSeatModal";
import DesktopSeatModal from "./DesktopSeatModal";

interface SeatModalProps {
  open: boolean;
  onClose: () => void;
  seatId: string;
  selectedDate: string;
  currentUser?: string;
  allBookingsForDate: Array<{
    seatId: string;
    userId: string;
  }>;
  anchorPosition?: { top: number; left: number } | null;
  allDates?: Date[]; // All available dates to display
  allBookings?: Array<{
    seatId: string;
    userId: string;
    date: string;
  }>; // All bookings across all dates
}

export default function SeatModal({
  open,
  onClose,
  seatId,
  selectedDate,
  currentUser,
  allBookingsForDate,
  anchorPosition,
  allDates = [],
  allBookings = [],
}: SeatModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Check if current user has booked this seat (for mobile modal backward compatibility)
  const currentUserBooking = allBookingsForDate.find(booking =>
    booking.seatId === seatId && booking.userId === currentUser
  );

  // Get all bookings for this specific seat
  const seatBookings = allBookingsForDate.filter(booking =>
    booking.seatId === seatId
  );

  // Common props for both modals
  const commonProps = {
    open,
    onClose,
    seatId,
    selectedDate,
    currentUser,
    currentUserBooking,
    seatBookings, // Pass all bookings for this seat
    allDates, // Pass all available dates
    allBookings, // Pass all bookings across dates
  };

  // Desktop modal props (no currentUserBooking needed)
  const desktopProps = {
    open,
    onClose,
    seatId,
    selectedDate,
    currentUser,
    seatBookings,
    allDates,
    allBookings,
    anchorPosition,
  };

  if (isMobile) {
    return <MobileSeatModal {...commonProps} />;
  }

  return <DesktopSeatModal {...desktopProps} />;
}
