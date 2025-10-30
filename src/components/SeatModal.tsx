import { useCallback } from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import MobileSeatModal from "./MobileSeatModal";
import DesktopSeatModal from "./DesktopSeatModal";

type TimeSlotType = 'AM' | 'PM' | 'FULL_DAY';

interface SeatModalProps {
  open: boolean;
  onClose: () => void;
  seatId: string;
  selectedDate: string;
  onSubmit: (seatId: string, timeSlot: TimeSlotType) => void;
  onRemove?: (seatId: string, timeSlot: TimeSlotType) => void;
  currentUser?: string;
  allBookingsForDate: Array<{
    seatId: string;
    userId: string;
    timeSlot: 'AM' | 'PM' | 'FULL_DAY';
  }>;
  anchorPosition?: { top: number; left: number } | null;
}

export default function SeatModal({
  open,
  onClose,
  seatId,
  selectedDate,
  onSubmit,
  onRemove,
  currentUser,
  allBookingsForDate,
  anchorPosition
}: SeatModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Check if current user has booked this seat
  const currentUserBooking = allBookingsForDate.find(booking =>
    booking.seatId === seatId && booking.userId === currentUser
  );

  // Get all bookings for this specific seat
  const seatBookings = allBookingsForDate.filter(booking =>
    booking.seatId === seatId
  );

  // Get available time slots for the selected seat
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

  const availableTimeSlots = getAvailableTimeSlots(seatId, selectedDate);

  // Common props for both modals
  const commonProps = {
    open,
    onClose,
    seatId,
    selectedDate,
    onSubmit,
    onRemove,
    currentUser,
    currentUserBooking,
    availableTimeSlots,
    seatBookings, // Pass all bookings for this seat
  };

  if (isMobile) {
    return <MobileSeatModal {...commonProps} />;
  }

  return <DesktopSeatModal {...commonProps} anchorPosition={anchorPosition} />;
}
