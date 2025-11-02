import { Box, Paper, Typography } from '@mui/material';
import { useMemo, useCallback } from 'react';
import React from 'react';
import SeatButton from './SeatButton';

interface TableProps {
  width?: number;
  height?: number;
  onSeatClick?: (seatId: string, event?: React.MouseEvent<HTMLButtonElement>) => void;
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
  seatsCount?: number; // Optional prop to specify number of seats (6 or 8)
  rotated?: boolean; // Optional prop to rotate table 90 degrees (for Zone B)
  isWeekend?: boolean; // Flag to disable all seats on weekends
}

function Table({
  width = 240,
  height = 80,
  onSeatClick,
  tableLetter,
  selectedSeat,
  timeSlot,
  currentUser,
  bookedSeats = [],
  seatsCount,
  rotated = false,
  isWeekend = false,
}: TableProps) {
  // Determine the number of seats for this table
  // Zone A: Tables B, E, H (2nd column) have 6 seats, others have 8 seats
  // Zone B: Tables J-O (1st row) have 6 seats, Tables P-U (2nd row) have 4 seats
  const totalSeats = seatsCount || (() => {
    if (['B', 'E', 'H'].includes(tableLetter)) return 6;
    if (['J', 'K', 'L', 'M', 'N', 'O'].includes(tableLetter)) return 6;
    if (['P', 'Q', 'R', 'S', 'T', 'U'].includes(tableLetter)) return 4;
    return 8;
  })();
  const seatsPerSide = totalSeats / 2; // 2, 3 or 4 seats per side
  // Debug: Log when Table C is rendered to check booking data
  if (tableLetter === 'C') {
    console.log(`🔍 Table C Debug: bookedSeats=`, bookedSeats, `currentUser=${currentUser}`);
  }

  // Define seat positions based on number of seats per side
  const seatPositions = seatsPerSide === 2 
    ? ['30%', '70%'] 
    : seatsPerSide === 3 
    ? ['20%', '50%', '80%'] 
    : ['15%', '38%', '62%', '85%'];

  // Memoize seat availability calculations to avoid recalculating on every render
  const seatAvailabilityMap = useMemo(() => {
    const availabilityMap = new Map<number, boolean>();

    for (let seatNumber = 1; seatNumber <= totalSeats; seatNumber++) {
      const seatId = `${tableLetter}${seatNumber}`;

      // Find all bookings for this seat
      const seatBookings = bookedSeats.filter(b => b.seatId === seatId);

      // If no bookings, seat is available
      if (seatBookings.length === 0) {
        availabilityMap.set(seatNumber, true);
        continue;
      }

      // Check for FULL_DAY bookings - if any exist, seat is not available
      const hasFullDayBooking = seatBookings.some(booking => booking.timeSlot === 'FULL_DAY');
      if (hasFullDayBooking) {
        availabilityMap.set(seatNumber, false);
        continue;
      }

      // Check if both AM and PM are booked by different users
      const amBooking = seatBookings.find(booking => booking.timeSlot === 'AM');
      const pmBooking = seatBookings.find(booking => booking.timeSlot === 'PM');

      if (amBooking && pmBooking && amBooking.userId !== pmBooking.userId) {
        // Both AM and PM booked by different users - not available
        availabilityMap.set(seatNumber, false);
      } else {
        // If only AM or only PM is booked, or both are booked by same user, seat is still available
        availabilityMap.set(seatNumber, true);
      }
    }

    return availabilityMap;
  }, [tableLetter, bookedSeats, totalSeats]);

  // Memoize time slot status calculations
  const timeSlotStatusMap = useMemo(() => {
    const statusMap = new Map<number, {
      amBooked: boolean;
      pmBooked: boolean;
      amIsCurrentUser: boolean;
      pmIsCurrentUser: boolean;
    }>();

    for (let seatNumber = 1; seatNumber <= totalSeats; seatNumber++) {
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

      statusMap.set(seatNumber, {
        amBooked,
        pmBooked,
        amIsCurrentUser,
        pmIsCurrentUser
      });
    }

    return statusMap;
  }, [tableLetter, bookedSeats, currentUser, totalSeats]);

  const handleSeatClick = useCallback((seatNumber: number, event?: React.MouseEvent<HTMLButtonElement>) => {
    const seatId = `${tableLetter}${seatNumber}`;
    if (onSeatClick) {
      onSeatClick(seatId, event);
    }
  }, [tableLetter, onSeatClick]);

  const isSeatAvailable = useCallback((seatNumber: number) => {
    return seatAvailabilityMap.get(seatNumber) ?? true;
  }, [seatAvailabilityMap]);

  const isSeatSelected = useCallback((seatNumber: number) => {
    const seatId = `${tableLetter}${seatNumber}`;
    return selectedSeat === seatId;
  }, [tableLetter, selectedSeat]);

  const getTimeSlotStatus = useCallback((seatNumber: number) => {
    const status = timeSlotStatusMap.get(seatNumber);
    const seatId = `${tableLetter}${seatNumber}`;
    
    if (!status) {
      return {
        am: false,
        pm: false,
        isCurrentUser: false,
        amIsCurrentUser: false,
        pmIsCurrentUser: false,
        timeSlot: selectedSeat === seatId ? timeSlot : undefined
      };
    }
    
    return {
      am: status.amBooked,
      pm: status.pmBooked,
      isCurrentUser: status.amIsCurrentUser || status.pmIsCurrentUser, // For overall seat border
      amIsCurrentUser: status.amIsCurrentUser, // For AM time slot color
      pmIsCurrentUser: status.pmIsCurrentUser, // For PM time slot color
      timeSlot: selectedSeat === seatId ? timeSlot : undefined
    };
  }, [timeSlotStatusMap, tableLetter, selectedSeat, timeSlot]);

  const getBookedByUser = useCallback((seatNumber: number) => {
    const seatId = `${tableLetter}${seatNumber}`;
    const seatBookings = bookedSeats.filter(b => b.seatId === seatId);
    
    // Return the first user who booked this seat (for display purposes)
    if (seatBookings.length > 0) {
      return seatBookings[0].userId;
    }
    
    return undefined;
  }, [tableLetter, bookedSeats]);

  const getBookedByUsers = useCallback((seatNumber: number) => {
    const seatId = `${tableLetter}${seatNumber}`;
    const seatBookings = bookedSeats.filter(b => b.seatId === seatId);
    
    const result: { am?: string; pm?: string } = {};
    
    seatBookings.forEach(booking => {
      if (booking.timeSlot === "AM") {
        result.am = booking.userId;
      } else if (booking.timeSlot === "PM") {
        result.pm = booking.userId;
      } else if (booking.timeSlot === "FULL_DAY") {
        result.am = booking.userId;
        result.pm = booking.userId;
      }
    });
    
    return result;
  }, [tableLetter, bookedSeats]);  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          width: rotated ? height : width,
          height: rotated ? width : height,
          backgroundColor: '#ECECEE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            backgroundColor: '#D1D1D1',
            width: '45px',
            height: '45px',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: '#333',
              fontSize: '2rem',
            }}
          >
            {tableLetter}
          </Typography>
        </Box>

        {/* Grid lines - adjust based on number of seats and rotation */}
        {!rotated ? (
          <>
            {/* Normal orientation: Vertical and Horizontal lines */}
            {/* Vertical lines */}
            {seatsPerSide === 2 ? (
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  backgroundColor: '#fff',
                  zIndex: 1
                }}
              />
            ) : seatsPerSide === 3 ? (
              <>
                <Box
                  sx={{
                    position: 'absolute',
                    left: '33.3333%',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    left: '66.6667%',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}
                />
              </>
            ) : (
              <>
                <Box
                  sx={{
                    position: 'absolute',
                    left: '25%',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    left: '75%',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}
                />
              </>
            )}
            {/* Horizontal line */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: '#fff',
                zIndex: 1
              }}
            />
          </>
        ) : (
          <>
            {/* Rotated orientation: Horizontal lines (was vertical) and Vertical line (was horizontal) */}
            {/* Horizontal lines */}
            {seatsPerSide === 2 ? (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: '#fff',
                  zIndex: 1
                }}
              />
            ) : seatsPerSide === 3 ? (
              <>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '33.3333%',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '66.6667%',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}
                />
              </>
            ) : (
              <>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '25%',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '75%',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#fff',
                    zIndex: 1
                  }}
                />
              </>
            )}
            {/* Vertical line */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: '#fff',
                zIndex: 1
              }}
            />
          </>
        )}
      </Box>

      {/* Seats - render differently based on rotation */}
      {!rotated ? (
        <>
          {/* Normal orientation: Top and Bottom seats */}
          {/* Top seats */}
          {seatPositions.map((position, index) => {
            const seatNumber = index + 1;
            const seatId = `${tableLetter}${seatNumber}`;
            return (
              <SeatButton
                key={`top-${index}`}
                position="top"
                leftPosition={position}
                onClick={(e) => handleSeatClick(seatNumber, e)}
                isAvailable={isSeatAvailable(seatNumber)}
                selected={isSeatSelected(seatNumber)}
                seatNumber={seatNumber}
                seatId={seatId}
                timeSlots={getTimeSlotStatus(seatNumber)}
                bookedByUser={getBookedByUser(seatNumber)}
                bookedByUsers={getBookedByUsers(seatNumber)}
                isWeekend={isWeekend}
              />
            );
          })}

          {/* Bottom seats */}
          {seatPositions.map((position, index) => {
            const seatNumber = index + seatsPerSide + 1;
            const seatId = `${tableLetter}${seatNumber}`;
            return (
              <SeatButton
                key={`bottom-${index}`}
                position="bottom"
                leftPosition={position}
                onClick={(e) => handleSeatClick(seatNumber, e)}
                isAvailable={isSeatAvailable(seatNumber)}
                selected={isSeatSelected(seatNumber)}
                seatNumber={seatNumber}
                seatId={seatId}
                timeSlots={getTimeSlotStatus(seatNumber)}
                bookedByUser={getBookedByUser(seatNumber)}
                bookedByUsers={getBookedByUsers(seatNumber)}
                isWeekend={isWeekend}
              />
            );
          })}
        </>
      ) : (
        <>
          {/* Rotated orientation: Left and Right seats */}
          {/* Left seats */}
          {seatPositions.map((position, index) => {
            const seatNumber = index + 1;
            const seatId = `${tableLetter}${seatNumber}`;
            return (
              <SeatButton
                key={`left-${index}`}
                position="left"
                leftPosition={position}
                onClick={(e) => handleSeatClick(seatNumber, e)}
                isAvailable={isSeatAvailable(seatNumber)}
                selected={isSeatSelected(seatNumber)}
                seatNumber={seatNumber}
                seatId={seatId}
                timeSlots={getTimeSlotStatus(seatNumber)}
                bookedByUser={getBookedByUser(seatNumber)}
                bookedByUsers={getBookedByUsers(seatNumber)}
                isWeekend={isWeekend}
              />
            );
          })}

          {/* Right seats */}
          {seatPositions.map((position, index) => {
            const seatNumber = index + seatsPerSide + 1;
            const seatId = `${tableLetter}${seatNumber}`;
            return (
              <SeatButton
                key={`right-${index}`}
                position="right"
                leftPosition={position}
                onClick={(e) => handleSeatClick(seatNumber, e)}
                isAvailable={isSeatAvailable(seatNumber)}
                selected={isSeatSelected(seatNumber)}
                seatNumber={seatNumber}
                seatId={seatId}
                timeSlots={getTimeSlotStatus(seatNumber)}
                bookedByUser={getBookedByUser(seatNumber)}
                bookedByUsers={getBookedByUsers(seatNumber)}
                isWeekend={isWeekend}
              />
            );
          })}
        </>
      )}
    </Box>
  );
}

export default React.memo(Table);
