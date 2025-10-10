import { Box, Paper, Typography } from '@mui/material';
import SeatButton from './SeatButton';

interface TableProps {
  width?: number;
  height?: number;
  onSeatClick?: (seatId: string) => void;
  tableLetter: string;
  availableSeats?: string[];
  selectedSeat?: string;
  timeSlot?: 'AM' | 'PM' | 'FULL_DAY';
  currentUser?: string;
  bookedSeats?: Array<{
    seatId: string;
    userId: string;
    timeSlot: 'AM' | 'PM' | 'FULL_DAY';
  }>;
}

export default function Table({ 
  width = 240, 
  height = 80, 
  onSeatClick, 
  tableLetter,
  availableSeats = [], // Keep for interface compatibility but not used in new logic
  selectedSeat,
  timeSlot,
  currentUser,
  bookedSeats = []
}: TableProps) {
  // Debug: Log when Table C is rendered to check booking data
  if (tableLetter === 'C') {
    console.log(`🔍 Table C Debug: bookedSeats=`, bookedSeats, `currentUser=${currentUser}`);
  }
  const seatPositions = ['20%', '50%', '80%'];
  
  const handleSeatClick = (seatNumber: number) => {
    const seatId = `${tableLetter}${seatNumber}`;
    if (onSeatClick) {
      onSeatClick(seatId);
    }
  };

  const isSeatAvailable = (seatNumber: number) => {
    const seatId = `${tableLetter}${seatNumber}`;
    
    // Find all bookings for this seat
    const seatBookings = bookedSeats.filter(b => b.seatId === seatId);
    
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

  const isSeatSelected = (seatNumber: number) => {
    const seatId = `${tableLetter}${seatNumber}`;
    return selectedSeat === seatId;
  };

  const getTimeSlotStatus = (seatNumber: number) => {
    const seatId = `${tableLetter}${seatNumber}`;
    const seatBookings = bookedSeats.filter(b => b.seatId === seatId);
    
    // Initialize status
    let amBooked = false;
    let pmBooked = false;
    let amIsCurrentUser = false;
    let pmIsCurrentUser = false;
    
    // Check each booking for this seat
    seatBookings.forEach(booking => {
      const isCurrentUserBooking = booking.userId === currentUser;
      
      if (booking.timeSlot === 'FULL_DAY') {
        amBooked = true;
        pmBooked = true;
        amIsCurrentUser = isCurrentUserBooking;
        pmIsCurrentUser = isCurrentUserBooking;
      } else if (booking.timeSlot === 'AM') {
        amBooked = true;
        amIsCurrentUser = isCurrentUserBooking;
      } else if (booking.timeSlot === 'PM') {
        pmBooked = true;
        pmIsCurrentUser = isCurrentUserBooking;
      }
    });

    return {
      am: amBooked,
      pm: pmBooked,
      isCurrentUser: amIsCurrentUser || pmIsCurrentUser, // For overall seat border
      amIsCurrentUser: amIsCurrentUser, // For AM time slot color
      pmIsCurrentUser: pmIsCurrentUser, // For PM time slot color
      timeSlot: selectedSeat === seatId ? timeSlot : undefined
    };
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Paper 
        sx={{ 
          width, 
          height, 
          backgroundColor: '#c0c0c0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 0,
          border: '1px solid #999'
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 'bold', 
            color: '#333',
            fontSize: '1.2rem'
          }}
        >
          {tableLetter}
        </Typography>
      </Paper>
      
      {/* Top seats */}
      {seatPositions.map((position, index) => {
        const seatNumber = index + 1;
        return (
          <SeatButton
            key={`top-${index}`}
            position="top"
            leftPosition={position}
            onClick={() => handleSeatClick(seatNumber)}
            isAvailable={isSeatAvailable(seatNumber)}
            selected={isSeatSelected(seatNumber)}
            seatNumber={seatNumber}
            timeSlots={getTimeSlotStatus(seatNumber)}
          />
        );
      })}
      
      {/* Bottom seats */}
      {seatPositions.map((position, index) => {
        const seatNumber = index + 4;
        return (
          <SeatButton
            key={`bottom-${index}`}
            position="bottom"
            leftPosition={position}
            onClick={() => handleSeatClick(seatNumber)}
            isAvailable={isSeatAvailable(seatNumber)}
            selected={isSeatSelected(seatNumber)}
            seatNumber={seatNumber}
            timeSlots={getTimeSlotStatus(seatNumber)}
          />
        );
      })}
    </Box>
  );
}
