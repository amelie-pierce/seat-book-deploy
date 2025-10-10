import { Box, IconButton, Typography } from "@mui/material";

interface SeatButtonProps {
  position: "top" | "bottom";
  leftPosition: string;
  onClick?: () => void;
  isAvailable?: boolean;
  seatNumber?: number;
  selected?: boolean;
  timeSlots?: {
    am: boolean;
    pm: boolean;
    isCurrentUser: boolean;
    amIsCurrentUser?: boolean;
    pmIsCurrentUser?: boolean;
    timeSlot?: 'AM' | 'PM' | 'FULL_DAY';
  };
}

export default function SeatButton({
  position,
  leftPosition,
  onClick,
  isAvailable = true,
  seatNumber,
  selected = false,
  timeSlots = { am: false, pm: false, isCurrentUser: false, amIsCurrentUser: false, pmIsCurrentUser: false },
}: SeatButtonProps) {
  const isPartiallyBooked = timeSlots.am !== timeSlots.pm;
  const isFullyBooked = timeSlots.am && timeSlots.pm;

  const getLeftColor = (timeSlot: {
    am: boolean;
    pm: boolean;
    isCurrentUser: boolean;
    amIsCurrentUser?: boolean;
    pmIsCurrentUser?: boolean;
    timeSlot?: 'AM' | 'PM' | 'FULL_DAY';
  }) => {
    // For AM slots (left half represents AM)
    if (timeSlot.am && timeSlot.amIsCurrentUser) {
      return "#f44336"; // Red for current user's AM bookings
    }
    if (timeSlot.am) {
      return "#e0e0e0"; // Gray for other users' AM bookings
    }
    return "white"; // White for unbooked AM
  };

  const getRightColor = (timeSlot: {
    am: boolean;
    pm: boolean;
    isCurrentUser: boolean;
    amIsCurrentUser?: boolean;
    pmIsCurrentUser?: boolean;
    timeSlot?: 'AM' | 'PM' | 'FULL_DAY';
  }) => {
    // For PM slots (right half represents PM)
    if (timeSlot.pm && timeSlot.pmIsCurrentUser) {
      return "#f44336"; // Red for current user's PM bookings
    }
    if (timeSlot.pm) {
      return "#e0e0e0"; // Gray for other users' PM bookings
    }
    return "white"; // White for unbooked PM
  };



  return (
    <IconButton
      onClick={onClick}
      sx={{
        position: "absolute",
        [position]: -25,
        left: leftPosition,
        transform: "translateX(-50%)",
        width: 36,
        height: 36,
        padding: 0,
        overflow: "hidden",
        border: `2px solid ${
          selected ? "#1976d2" : timeSlots.isCurrentUser ? "#f44336" : "#ccc"
        }`,
        cursor: !isAvailable ? "not-allowed" : "pointer",
        opacity: isAvailable ? 1 : 0.7,
        "&:hover": !isAvailable
          ? {}
          : {
              "& .seat-half": {
                backgroundColor: selected ? "#1565c0" : "#f5f5f5",
              },
            },
      }}
      // disabled={!isAvailable && !timeSlots.isCurrentUser}
    >
      <Box
        className="seat-half left"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "50%",
          height: "100%",
          backgroundColor: getLeftColor(timeSlots),
          transition: "background-color 0.2s",
        }}
      />
      <Box
        className="seat-half right"
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "50%",
          height: "100%",
          backgroundColor: getRightColor(timeSlots),
          transition: "background-color 0.2s",
        }}
      />
      <Typography
        variant="body2"
        sx={{
          position: "relative",
          zIndex: 1,
          color: isFullyBooked
            ? "#fff"
            : isPartiallyBooked
            ? "#fff"
            : isAvailable
            ? "#4caf50"
            : "#ccc",
          fontSize: "0.875rem",
          fontWeight: "bold",
        }}
      >
        {seatNumber}
      </Typography>
    </IconButton>
  );
}
